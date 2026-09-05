import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import sqlalchemy as sa
from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MessageRole(str, Enum):
    VISITOR = "visitor"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class ConversationBase(SQLModel):
    is_escalated: bool = Field(default=False, nullable=False, description="Flag indicating ticket escalation")
    ticket_status: Optional[str] = Field(
        default=None,
        sa_column=Column(sa.String(20), nullable=True, index=True),
        description="Ticket resolution lifecycle status (open, in_progress, resolved)",
    )
    visitor_email: Optional[str] = Field(
        default=None,
        sa_column=Column(sa.String(255), nullable=True),
        description="Customer contact email submitted upon escalation",
    )


class Conversation(ConversationBase, table=True):
    __tablename__ = "conversations"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    organization_id: uuid.UUID = Field(
        foreign_key="organizations.id",
        nullable=False,
        index=True,
        description="Strict tenant isolation foreign key",
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_type=sa.DateTime(timezone=True),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_type=sa.DateTime(timezone=True),
        nullable=False,
        index=True,
    )


class MessageBase(SQLModel):
    role: str = Field(max_length=20, nullable=False, description="visitor, assistant, or system")
    content: str = Field(sa_column=Column(Text, nullable=False), description="Full message text content")
    citations: Optional[list] = Field(
        default=None,
        sa_column=Column(sa.JSON, nullable=True),
        description="List of document citations used in assistant response",
    )


class Message(MessageBase, table=True):
    __tablename__ = "messages"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    conversation_id: uuid.UUID = Field(
        foreign_key="conversations.id",
        nullable=False,
        index=True,
        description="Parent conversation foreign key",
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_type=sa.DateTime(timezone=True),
        nullable=False,
        index=True,
    )
