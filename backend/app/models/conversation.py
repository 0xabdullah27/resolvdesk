import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MessageRole(str, Enum):
    VISITOR = "visitor"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationBase(SQLModel):
    is_escalated: bool = Field(default=False, nullable=False, description="Flag indicating ticket escalation")


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
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        index=True,
    )


class MessageBase(SQLModel):
    role: str = Field(max_length=20, nullable=False, description="visitor, assistant, or system")
    content: str = Field(sa_column=Column(Text, nullable=False), description="Full message text content")


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
        nullable=False,
        index=True,
    )
