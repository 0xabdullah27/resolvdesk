import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class ChatRequest(BaseModel):
    """Payload sent by anonymous visitor widget to stream a question."""
    widget_key: str = Field(
        ...,
        min_length=8,
        max_length=64,
        description="Organization's public embed key or active grace key",
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Visitor's question or message up to 1,000 characters",
    )
    conversation_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Existing conversation ID if continuing a session, else null",
    )

    @field_validator("message")
    @classmethod
    def validate_message_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Message cannot be empty or whitespace-only.")
        return stripped


class ChatMessageRead(BaseModel):
    """Read schema for a single conversational turn."""
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class ConversationHistoryResponse(BaseModel):
    """Response schema returned when re-hydrating conversation history."""
    conversation_id: uuid.UUID
    created_at: datetime
    messages: List[ChatMessageRead]


class ChatEscalateRequest(BaseModel):
    """Payload sent by anonymous visitor widget to escalate to human agent."""
    widget_key: str = Field(
        ...,
        min_length=8,
        max_length=64,
        description="Public widget key",
    )
    conversation_id: uuid.UUID = Field(
        ...,
        description="Active conversation ID to escalate",
    )
    visitor_email: EmailStr = Field(
        ...,
        description="Visitor email for follow-up support",
    )
    reason: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional customer note or summary of issue",
    )


class ChatEscalateResponse(BaseModel):
    """Response returned upon successful escalation ticket creation."""
    ticket_id: str = Field(..., description="Formatted ticket reference number e.g. TK-AB12CD")
    conversation_id: uuid.UUID
    visitor_email: str
    status: str = Field(default="submitted")
    created_at: datetime
