import datetime
import uuid
from typing import List, Optional
from sqlmodel import select
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
