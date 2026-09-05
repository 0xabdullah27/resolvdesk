import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import sqlalchemy as sa
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DocumentStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class DocumentType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MD = "md"
    RAW = "raw"


class DocumentBase(SQLModel):
    title: str = Field(max_length=255, nullable=False, description="Filename or manual snippet title")
    file_type: DocumentType = Field(nullable=False, description="Document source format")
    file_size_bytes: int = Field(default=0, ge=0, description="File size in bytes (0 for raw text)")


class Document(DocumentBase, table=True):
    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint("organization_id", "title", name="uq_documents_org_title"),
    )

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
    status: DocumentStatus = Field(
        default=DocumentStatus.UPLOADING,
        nullable=False,
        index=True,
        description="Ingestion lifecycle status",
    )
    chunk_count: int = Field(
        default=0,
        ge=0,
        nullable=False,
        description="Total semantic vector chunks indexed",
    )
    character_count: int = Field(
        default=0,
        ge=0,
        nullable=False,
        description="Total extracted plain text characters",
    )
    content_preview: Optional[str] = Field(
        default=None,
        max_length=500,
        nullable=True,
        description="First 500 characters of extracted text for dashboard inspection",
    )
    error_message: Optional[str] = Field(
        default=None,
        max_length=1000,
        nullable=True,
        description="Failure reason if ingestion failed",
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
    )
