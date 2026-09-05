import uuid
from typing import Optional
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.exceptions import ResolvDeskException
from app.models.conversation import Conversation
from app.repos.conversation_repo import ConversationRepository
from app.schemas.chat import ChatMessageRead
from app.schemas.conversation import (
    ConversationDetailResponse,
    ConversationListItem,
    ConversationListResponse,
    ConversationStatsResponse,
    TicketStatusUpdateResponse,
)


class OwnerConversationService:
    """Service handling owner inbox operations, transcript inspection, and analytics with strict tenant isolation."""

    @staticmethod
    async def list_conversations(
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 20,
        offset: int = 0,
        is_escalated: Optional[bool] = None,
    ) -> ConversationListResponse:
        """Retrieves a paginated list of conversations for the owner's organization."""
        clamped_limit = min(max(1, limit), 100)
        clamped_offset = max(0, offset)

        total, rows = await ConversationRepository.list_conversations_with_metadata(
            session=session,
            organization_id=organization_id,
            limit=clamped_limit,
            offset=clamped_offset,
            is_escalated=is_escalated,
        )

        items = []
        for conv, msg_count, latest_content, latest_role in rows:
            preview = None
            if latest_content:
                preview = (latest_content[:117] + "...") if len(latest_content) > 120 else latest_content

            items.append(
                ConversationListItem(
                    id=conv.id,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    is_escalated=conv.is_escalated,
                    ticket_status=conv.ticket_status,
                    visitor_email=conv.visitor_email,
                    message_count=msg_count or 0,
                    last_message_preview=preview,
                    last_message_role=latest_role,
                )
            )

        return ConversationListResponse(
            total=total,
            limit=clamped_limit,
            offset=clamped_offset,
            items=items,
        )

    @staticmethod
    async def get_conversation_transcript(
        session: AsyncSession,
        conversation_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> ConversationDetailResponse:
        """Retrieves an individual conversation and its full message transcript, enforcing tenant isolation."""
        res = await ConversationRepository.get_conversation_with_messages(
            session=session,
            conversation_id=conversation_id,
            organization_id=organization_id,
        )
        if not res:
            raise ResolvDeskException(
                message="Conversation not found.",
                status_code=404,
            )

        conv, messages = res
        msg_reads = [
            ChatMessageRead(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
                citations=m.citations,
            )
            for m in messages
        ]

        return ConversationDetailResponse(
            id=conv.id,
            organization_id=conv.organization_id,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            is_escalated=conv.is_escalated,
            ticket_status=conv.ticket_status,
            visitor_email=conv.visitor_email,
            messages=msg_reads,
        )

    @staticmethod
    async def update_ticket_status(
        session: AsyncSession,
        conversation_id: uuid.UUID,
        organization_id: uuid.UUID,
        status: str,
    ) -> TicketStatusUpdateResponse:
        """Updates the resolution lifecycle status of an escalated ticket with strict tenant isolation."""
        valid_statuses = {"open", "in_progress", "resolved"}
        if status not in valid_statuses:
            raise ResolvDeskException(
                message=f"Invalid ticket status '{status}'. Must be one of: {', '.join(sorted(valid_statuses))}",
                status_code=400,
            )

        conv = await ConversationRepository.update_ticket_status(
            session=session,
            conversation_id=conversation_id,
            organization_id=organization_id,
            ticket_status=status,
        )
        if not conv:
            raise ResolvDeskException(
                message="Conversation not found.",
                status_code=404,
            )

        await session.commit()
        await session.refresh(conv)

        return TicketStatusUpdateResponse(
            id=conv.id,
            ticket_status=conv.ticket_status,
            updated_at=conv.updated_at,
        )

    @staticmethod
    async def get_conversation_stats(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> ConversationStatsResponse:
        """Calculates tenant-isolated aggregate statistics for the dashboard."""
        stats = await ConversationRepository.get_conversation_stats(
            session=session,
            organization_id=organization_id,
        )
        return ConversationStatsResponse(
            total_conversations=stats["total_conversations"],
            total_messages=stats["total_messages"],
            escalated_conversations=stats["escalated_conversations"],
            active_last_24h=stats["active_last_24h"],
        )


owner_conversation_service = OwnerConversationService()
