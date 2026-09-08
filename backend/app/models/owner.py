import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import sqlalchemy as sa
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class OwnerStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class OwnerRole(str, Enum):
    OWNER = "owner"
    SUPERADMIN = "superadmin"


class OwnerBase(SQLModel):
    email: str = Field(max_length=320, index=True, unique=True, nullable=False)
    full_name: str = Field(max_length=200, nullable=False)
    role: str = Field(default=OwnerRole.OWNER.value, max_length=20, nullable=False, index=True)
    status: str = Field(default=OwnerStatus.ACTIVE.value, max_length=20, nullable=False)


class Owner(OwnerBase, table=True):
    __tablename__ = "owners"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    organization_id: uuid.UUID = Field(
        foreign_key="organizations.id",
        index=True,
        nullable=False,
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
