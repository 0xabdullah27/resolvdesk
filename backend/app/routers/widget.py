import uuid
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_db
from app.core.rate_limiter import check_chat_rate_limit
from app.schemas.chat import ChatRequest, ConversationHistoryResponse
from app.schemas.widget import PublicWidgetConfigResponse
from app.services.chat_service import chat_service
from app.services.widget_service import WidgetService

router = APIRouter()


@router.get(
    "/config",
    response_model=PublicWidgetConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public widget branding configuration",
    description="Resolves public widget branding for customer website visitors without requiring visitor authentication.",
)
async def get_public_widget_config(
    key: str = Query(..., description="The public widget key (rd_live_...)"),
    session: AsyncSession = Depends(get_db),
) -> PublicWidgetConfigResponse:
    return await WidgetService.get_public_config(session=session, key=key)


@router.post(
    "/chat",
    status_code=status.HTTP_200_OK,
    summary="Stream visitor chat message via Server-Sent Events",
    description="Receives an anonymous visitor question, checks rate limits and widget authorization, and streams the answer token-by-token.",
    dependencies=[Depends(check_chat_rate_limit)],
)
async def stream_chat_message(
    body: ChatRequest,
    session: AsyncSession = Depends(get_db),
):
    # Pre-validate widget access before initiating the stream so 403/404 errors return cleanly as HTTP responses
    await chat_service.validate_widget_access(session, body.widget_key)

    generator = chat_service.stream_chat(
        widget_key=body.widget_key,
        message=body.message,
        conversation_id=body.conversation_id,
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
    widget_key: str = Query(..., description="The public widget key"),
    session: AsyncSession = Depends(get_db),
) -> ConversationHistoryResponse:
    return await chat_service.get_conversation_history(
        session=session,
        widget_key=widget_key,
        conversation_id=conversation_id,
    )
