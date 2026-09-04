import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class OwnerStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class OwnerBase(SQLModel):
    email: str = Field(max_length=320, index=True, unique=True, nullable=False)
    full_name: str = Field(max_length=200, nullable=False)
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
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )
