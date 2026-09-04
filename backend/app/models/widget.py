import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class WidgetConfigurationBase(SQLModel):
    widget_key: str = Field(max_length=64, unique=True, index=True, nullable=False)
    previous_widget_key: Optional[str] = Field(default=None, max_length=64, index=True, nullable=True)
    grace_expires_at: Optional[datetime] = Field(default=None, nullable=True)
    primary_color: str = Field(default="#4F46E5", max_length=9, nullable=False)
    bot_display_name: str = Field(default="Support Assistant", max_length=100, nullable=False)
    welcome_message: str = Field(default="Hi! How can I help you today?", max_length=500, nullable=False)
    widget_placement: str = Field(default="bottom-right", max_length=20, nullable=False)


class WidgetConfiguration(WidgetConfigurationBase, table=True):
    __tablename__ = "widget_configurations"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    organization_id: uuid.UUID = Field(
        foreign_key="organizations.id",
        unique=True,
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
