import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.document import DocumentStatus, DocumentType


class DocumentRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    title: str
    file_type: DocumentType
    file_size_bytes: int
    status: DocumentStatus
    chunk_count: int
    character_count: int
    content_preview: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListItem(BaseModel):
    id: uuid.UUID
    title: str
    file_type: DocumentType
    file_size_bytes: int
    status: DocumentStatus
    chunk_count: int
    character_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    total: int
    items: List[DocumentListItem]

    model_config = ConfigDict(from_attributes=True)


class RawDocumentCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=255,
        description="Title or topic for the manual knowledge snippet",
    )
    content: str = Field(
        min_length=1,
        max_length=100_000,
        description="Text content up to 100,000 characters",
    )
