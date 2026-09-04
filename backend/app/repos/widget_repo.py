import datetime
import uuid
from typing import Optional
from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.widget import WidgetConfiguration


class WidgetRepo:
    """Repository handling database queries for WidgetConfiguration.

    Enforces tenant isolation for owner operations and secure key resolution for public visitors.
    """

    @staticmethod
    async def create_widget_config(
        session: AsyncSession,
        organization_id: uuid.UUID,
        widget_key: str,
        primary_color: str = "#4F46E5",
        bot_display_name: str = "Support Assistant",
        welcome_message: str = "Hi! How can I help you today?",
        widget_placement: str = "bottom-right",
        allowed_origins: str = "*",
    ) -> WidgetConfiguration:
        config = WidgetConfiguration(
            organization_id=organization_id,
            widget_key=widget_key,
            primary_color=primary_color,
            bot_display_name=bot_display_name,
            welcome_message=welcome_message,
            widget_placement=widget_placement,
            allowed_origins=allowed_origins,
        )
        session.add(config)
        await session.flush()
        return config

    @staticmethod
    async def get_by_organization_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> Optional[WidgetConfiguration]:
        """Tenant-isolated retrieval: query strictly filters WHERE organization_id = ..."""
        statement = select(WidgetConfiguration).where(
            WidgetConfiguration.organization_id == organization_id
        )
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def get_by_public_key(
        session: AsyncSession,
        key: str,
    ) -> Optional[WidgetConfiguration]:
        """Public visitor resolution: resolves widget config by primary key or active grace key."""
        now = datetime.datetime.now(datetime.timezone.utc)
        statement = select(WidgetConfiguration).where(
            or_(
                WidgetConfiguration.widget_key == key,
                (
                    (WidgetConfiguration.previous_widget_key == key)
                    & (WidgetConfiguration.grace_expires_at > now)
                ),
            )
        )
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def update_keys(
        session: AsyncSession,
        widget: WidgetConfiguration,
        new_key: str,
        previous_key: str,
        grace_expires_at: datetime.datetime,
    ) -> WidgetConfiguration:
        widget.widget_key = new_key
        widget.previous_widget_key = previous_key
        widget.grace_expires_at = grace_expires_at
        widget.updated_at = datetime.datetime.now(datetime.timezone.utc)
        session.add(widget)
        await session.flush()
        return widget
