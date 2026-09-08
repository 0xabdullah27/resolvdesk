import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class PlatformMetricsResponse(BaseModel):
    total_users: int = Field(..., description="Total registered platform users")
    active_users: int = Field(..., description="Active user accounts")
    suspended_users: int = Field(..., description="Suspended user accounts")
    total_organizations: int = Field(..., description="Total provisioned tenant organizations")
    total_documents: int = Field(..., description="Total documents uploaded across all organizations")
    total_conversations: int = Field(..., description="Total visitor conversations conducted")


class PlatformUserItem(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    status: str
    organization_id: uuid.UUID
    organization_name: str
    website_url: Optional[str] = None
    created_at: datetime
    documents_count: int = 0
    conversations_count: int = 0
    tickets_count: int = 0


class PlatformUserListResponse(BaseModel):
    items: List[PlatformUserItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(active|suspended)$", description="New account status: active or suspended")
    reason: Optional[str] = Field(None, max_length=500, description="Optional audit reason for the status change")


class AdminAuditLogResponse(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    target_user_id: uuid.UUID
    action: str
    reason: Optional[str] = None
    created_at: datetime
