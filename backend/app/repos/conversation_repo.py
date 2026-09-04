import datetime
import uuid
from typing import Any, Dict, List, Optional, Tuple
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation, Message, utc_now


class ConversationRepository:
    """Repository handling database queries for Conversation and Message entities.

    Enforces tenant isolation by organization_id and provides optimized queries for conversation history.
    """

    @staticmethod
    async def create_conversation(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> Conversation:
        """Create a new conversation session strictly scoped to an organization."""
        conversation = Conversation(
            organization_id=organization_id,
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        session.add(conversation)
        await session.flush()
        return conversation

    @staticmethod
    async def get_conversation(
        session: AsyncSession,
        conversation_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None,
    ) -> Optional[Conversation]:
        """Fetch conversation by ID, optionally verifying tenant isolation by organization_id."""
        statement = select(Conversation).where(Conversation.id == conversation_id)
        if organization_id is not None:
            statement = statement.where(Conversation.organization_id == organization_id)
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def append_message(
        session: AsyncSession,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
    ) -> Message:
        """Append a message to an existing conversation and update conversation updated_at."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            created_at=utc_now(),
        )
        session.add(message)

        # Update parent conversation's updated_at timestamp
        conv = await session.get(Conversation, conversation_id)
        if conv:
            conv.updated_at = utc_now()
            session.add(conv)

        await session.flush()
        return message

    @staticmethod
    async def get_recent_messages(
        session: AsyncSession,
        conversation_id: uuid.UUID,
        limit: int = 10,
    ) -> List[Message]:
        """Retrieve the last N messages for a conversation in chronological order (created_at ASC)."""
        statement = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        result = await session.exec(statement)
        messages = list(result.all())
        # Reverse to chronological order (oldest to newest)
        messages.reverse()
        return messages

    @staticmethod
    async def get_all_messages(
        session: AsyncSession,
        conversation_id: uuid.UUID,
    ) -> List[Message]:
        """Retrieve all messages for a conversation in chronological order."""
        statement = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        result = await session.exec(statement)
        return list(result.all())

    @staticmethod
    async def list_conversations_with_metadata(
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 20,
        offset: int = 0,
        is_escalated: Optional[bool] = None,
    ) -> Tuple[int, List[Tuple[Conversation, int, Optional[str], Optional[str]]]]:
        """Paginated list of conversations with message count and latest message preview in a single query."""
        count_sub = (
            select(func.count(Message.id))
            .where(Message.conversation_id == Conversation.id)
            .correlate(Conversation)
            .scalar_subquery()
        )
        latest_content_sub = (
            select(Message.content)
            .where(Message.conversation_id == Conversation.id)
            .order_by(Message.created_at.desc())
            .limit(1)
            .correlate(Conversation)
            .scalar_subquery()
        )
        latest_role_sub = (
            select(Message.role)
            .where(Message.conversation_id == Conversation.id)
            .order_by(Message.created_at.desc())
            .limit(1)
            .correlate(Conversation)
            .scalar_subquery()
        )

        filters = [Conversation.organization_id == organization_id]
        if is_escalated is not None:
            filters.append(Conversation.is_escalated == is_escalated)

        count_stmt = select(func.count(Conversation.id)).where(*filters)
        total_result = await session.exec(count_stmt)
        total = total_result.one()

        items_stmt = (
            select(Conversation, count_sub, latest_content_sub, latest_role_sub)
            .where(*filters)
            .order_by(Conversation.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        rows_result = await session.exec(items_stmt)
        rows = list(rows_result.all())
        return total, rows

    @staticmethod
    async def get_conversation_with_messages(
        session: AsyncSession,
        conversation_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> Optional[Tuple[Conversation, List[Message]]]:
        """Fetch conversation and all its messages strictly validating tenant isolation."""
        conv_stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.organization_id == organization_id,
        )
        conv_result = await session.exec(conv_stmt)
        conv = conv_result.first()
        if not conv:
            return None

        msgs_stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        msgs_result = await session.exec(msgs_stmt)
        messages = list(msgs_result.all())
        return conv, messages

    @staticmethod
    async def get_conversation_stats(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> Dict[str, int]:
        """Calculates tenant-isolated aggregate metrics for conversations and messages."""
        total_conv_stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id
        )
        total_conv = (await session.exec(total_conv_stmt)).one() or 0

        escalated_conv_stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id,
            Conversation.is_escalated == True,
        )
        escalated_conv = (await session.exec(escalated_conv_stmt)).one() or 0

        total_msgs_stmt = (
            select(func.count(Message.id))
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Conversation.organization_id == organization_id)
        )
        total_msgs = (await session.exec(total_msgs_stmt)).one() or 0

        twenty_four_hours_ago = utc_now() - datetime.timedelta(hours=24)
        active_24h_stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id,
            Conversation.updated_at >= twenty_four_hours_ago,
        )
        active_24h = (await session.exec(active_24h_stmt)).one() or 0

        return {
            "total_conversations": int(total_conv),
            "total_messages": int(total_msgs),
            "escalated_conversations": int(escalated_conv),
            "active_last_24h": int(active_24h),
        }
