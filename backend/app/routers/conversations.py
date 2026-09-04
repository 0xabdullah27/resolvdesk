import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import CurrentOwner
from app.core.database import get_db
from app.schemas.conversation import (
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationStatsResponse,
)
from app.services.owner_conversation_service import owner_conversation_service

router = APIRouter()


@router.get(
    "",
    response_model=ConversationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List organization conversations",
    description="Retrieves a paginated list of visitor conversations with message counts and preview snippets, scoped to the authenticated organization.",
)
async def list_conversations(
    current_owner: CurrentOwner,
    limit: int = Query(default=20, ge=1, le=100, description="Number of conversations to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    is_escalated: Optional[bool] = Query(default=None, description="Filter by escalation status"),
    session: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    return await owner_conversation_service.list_conversations(
        session=session,
        organization_id=current_owner.organization_id,
        limit=limit,
        offset=offset,
        is_escalated=is_escalated,
    )


@router.get(
    "/stats",
    response_model=ConversationStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get conversation overview statistics",
    description="Calculates aggregate conversation metrics (total chats, total messages, escalated count, 24h activity) for the organization.",
)
async def get_conversation_stats(
    current_owner: CurrentOwner,
    session: AsyncSession = Depends(get_db),
) -> ConversationStatsResponse:
    return await owner_conversation_service.get_conversation_stats(
        session=session,
        organization_id=current_owner.organization_id,
    )


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get conversation transcript",
    description="Retrieves an individual conversation and its complete chronological message transcript with strict tenant isolation.",
)
async def get_conversation_transcript(
    conversation_id: uuid.UUID,
    current_owner: CurrentOwner,
    session: AsyncSession = Depends(get_db),
) -> ConversationDetailResponse:
    return await owner_conversation_service.get_conversation_transcript(
        session=session,
        conversation_id=conversation_id,
        organization_id=current_owner.organization_id,
    )
