import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.chat import ChatMessageRead


class ConversationListItem(BaseModel):
    """Summarized conversation session item for the owner's paginated inbox."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_escalated: bool = False
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
    messages: List[ChatMessageRead]

    model_config = ConfigDict(from_attributes=True)


class ConversationStatsResponse(BaseModel):
    """High-level conversation statistics and metrics for the organization dashboard."""
    total_conversations: int
    total_messages: int
    escalated_conversations: int
    active_last_24h: int
