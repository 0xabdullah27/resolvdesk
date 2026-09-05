import uuid
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.chat import ChatMessageRead


class ConversationListItem(BaseModel):
    """Summarized conversation session item for the owner's paginated inbox."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_escalated: bool = False
    ticket_status: Optional[str] = None
    visitor_email: Optional[str] = None
    message_count: int = 0
    last_message_preview: Optional[str] = None
    last_message_role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationListResponse(BaseModel):
    """Paginated list envelope for owner's conversations inbox."""
    total: int
    limit: int
    offset: int
    items: List[ConversationListItem]


class ConversationDetailResponse(BaseModel):
    """Detailed view of a conversation including the complete chronological message transcript."""
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_escalated: bool
    ticket_status: Optional[str] = None
    visitor_email: Optional[str] = None
    messages: List[ChatMessageRead]

    model_config = ConfigDict(from_attributes=True)


class TicketStatusUpdateRequest(BaseModel):
    """Request payload for updating the status of an escalated ticket."""
    status: Literal["open", "in_progress", "resolved"] = Field(
        ...,
        description="Target ticket lifecycle status (open, in_progress, resolved)",
    )


class TicketStatusUpdateResponse(BaseModel):
    """Response returned upon successful ticket status transition."""
    id: uuid.UUID
    ticket_status: str
    updated_at: datetime


class ConversationStatsResponse(BaseModel):
    """High-level conversation statistics and metrics for the organization dashboard."""
    total_conversations: int
    total_messages: int
    escalated_conversations: int
    active_last_24h: int
