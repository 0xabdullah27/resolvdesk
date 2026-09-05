import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_db
from app.core.rate_limiter import check_chat_rate_limit
from app.schemas.chat import (
    ChatEscalateRequest,
    ChatEscalateResponse,
    ChatRequest,
    ConversationHistoryResponse,
)
from app.schemas.widget import PublicWidgetConfigResponse
from app.services.chat_service import chat_service
from app.services.widget_service import WidgetService

router = APIRouter()


def extract_client_origin(request: Request) -> Optional[str]:
    """Helper to extract origin or referer header from incoming request."""
    return request.headers.get("origin") or request.headers.get("referer")


@router.get(
    "/config",
    response_model=PublicWidgetConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public widget branding configuration",
    description="Resolves public widget branding for customer website visitors without requiring visitor authentication.",
)
async def get_public_widget_config(
    request: Request,
    key: str = Query(..., description="The public widget key (rd_live_...)"),
    session: AsyncSession = Depends(get_db),
) -> PublicWidgetConfigResponse:
    origin = extract_client_origin(request)
    return await WidgetService.get_public_config(session=session, key=key, request_origin=origin)


@router.post(
    "/chat",
    status_code=status.HTTP_200_OK,
    summary="Stream visitor chat message via Server-Sent Events",
    description="Receives an anonymous visitor question, checks rate limits and widget authorization, and streams the answer token-by-token.",
    dependencies=[Depends(check_chat_rate_limit)],
)
async def stream_chat_message(
    body: ChatRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    origin = extract_client_origin(request)

    # Pre-validate widget access & domain whitelisting before initiating the stream
    await chat_service.validate_widget_access(
        session=session,
        widget_key=body.widget_key,
        request_origin=origin,
    )

    generator = chat_service.stream_chat(
        widget_key=body.widget_key,
        message=body.message,
        conversation_id=body.conversation_id,
        request_origin=origin,
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get conversation history",
    description="Allows the client widget to re-hydrate messages within the active session.",
)
async def get_conversation_history(
    conversation_id: uuid.UUID,
    request: Request,
    widget_key: str = Query(..., description="The public widget key"),
    session: AsyncSession = Depends(get_db),
) -> ConversationHistoryResponse:
    origin = extract_client_origin(request)
    return await chat_service.get_conversation_history(
        session=session,
        widget_key=widget_key,
        conversation_id=conversation_id,
        request_origin=origin,
    )


@router.post(
    "/chat/escalate",
    response_model=ChatEscalateResponse,
    status_code=status.HTTP_200_OK,
    summary="Escalate visitor chat to a human support ticket",
    description="Allows an anonymous visitor to submit contact details and an inquiry note to trigger human support escalation.",
    dependencies=[Depends(check_chat_rate_limit)],
)
async def escalate_chat_message(
    body: ChatEscalateRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> ChatEscalateResponse:
    origin = extract_client_origin(request)
    return await chat_service.escalate_conversation(
        session=session,
        widget_key=body.widget_key,
        conversation_id=body.conversation_id,
        visitor_email=body.visitor_email,
        reason=body.reason,
        request_origin=origin,
    )

