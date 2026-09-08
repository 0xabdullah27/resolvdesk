import uuid
from datetime import datetime, timezone
from typing import Optional
import sqlalchemy as sa
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AdminAuditLogBase(SQLModel):
    action: str = Field(max_length=50, nullable=False, index=True)
    reason: Optional[str] = Field(default=None, nullable=True)


class AdminAuditLog(AdminAuditLogBase, table=True):
    __tablename__ = "admin_audit_logs"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    admin_id: uuid.UUID = Field(
        foreign_key="owners.id",
        index=True,
        nullable=False,
    )
    target_user_id: uuid.UUID = Field(
        foreign_key="owners.id",
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_type=sa.DateTime(timezone=True),
        nullable=False,
        index=True,
    )
