import uuid
from datetime import datetime, timezone
from typing import Optional
import sqlalchemy as sa
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class OrganizationBase(SQLModel):
    display_name: str = Field(max_length=200, nullable=False)


class Organization(OrganizationBase, table=True):
    __tablename__ = "organizations"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
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
