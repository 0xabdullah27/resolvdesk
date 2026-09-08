import datetime
import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.repos.widget_repo import WidgetRepo
from app.schemas.organization import (
    WidgetKeyRotationResponse,
    WidgetProfileDetails,
    WidgetUpdateRequest,
)
from app.schemas.widget import PublicWidgetConfigResponse
from app.services.registration_service import generate_widget_key


class WidgetService:
    """Business service for widget configuration, public lookup, and key rotation."""

    @staticmethod
    async def rotate_key(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> WidgetKeyRotationResponse:
        """Rotates the organization's public widget key and establishes a 24-hour grace period."""
        widget = await WidgetRepo.get_by_organization_id(session, organization_id)
        if not widget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Widget configuration not found for organization.",
            )

        old_primary_key = widget.widget_key
        new_key = generate_widget_key()
        grace_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            hours=settings.WIDGET_GRACE_PERIOD_HOURS
        )

        try:
            await WidgetRepo.update_keys(
                session=session,
                widget=widget,
                new_key=new_key,
                previous_key=old_primary_key,
                grace_expires_at=grace_expires_at,
            )
            await session.commit()
            await session.refresh(widget)
        except Exception as err:
            await session.rollback()
            logger.error("Failed to rotate widget key: %s", str(err), exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to rotate widget key.",
            )

        base_url = (
            settings.BETTER_AUTH_URL.rstrip("/")
            if settings.BETTER_AUTH_URL and not settings.BETTER_AUTH_URL.startswith("http://localhost")
            else "https://resolvdesk.online"
        )
        embed_snippet = (
            f'<script src="{base_url}/widget.js" '
            f'data-widget-key="{new_key}" defer></script>'
        )

        logger.info(
            "Rotated widget key for org %s: new_key=%s, previous_key=%s, grace_until=%s",
            organization_id,
            new_key,
            old_primary_key,
            grace_expires_at,
        )

        return WidgetKeyRotationResponse(
            new_widget_key=new_key,
            previous_widget_key=old_primary_key,
            grace_expires_at=grace_expires_at,
            embed_snippet=embed_snippet,
        )

    @staticmethod
    async def get_public_config(
        session: AsyncSession,
        key: str,
        request_origin: Optional[str] = None,
    ) -> PublicWidgetConfigResponse:
        """Resolves public branding config for unauthenticated visitor embed."""
        if not key or not key.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing public widget key.",
            )

        widget = await WidgetRepo.get_by_public_key(session, key.strip())
        if not widget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Widget configuration not found or inactive.",
            )

        # Enforce domain whitelisting
        from app.services.chat_service import is_origin_allowed
        if not is_origin_allowed(request_origin, getattr(widget, "allowed_origins", "*")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Domain not authorized for this widget.",
            )

        # Check if owning merchant account is suspended
        from app.models.owner import Owner, OwnerStatus
        from sqlmodel import select
        owner_stmt = select(Owner).where(Owner.organization_id == widget.organization_id)
        owner = (await session.exec(owner_stmt)).first()
        is_active = bool(owner and owner.status == OwnerStatus.ACTIVE.value)

        return PublicWidgetConfigResponse(
            widget_key=key,  # Return the queried key that authorized this view
            bot_display_name=widget.bot_display_name,
            welcome_message=widget.welcome_message,
            primary_color=widget.primary_color,
            widget_placement=widget.widget_placement,
            allowed_origins=widget.allowed_origins,
            is_active=is_active,
        )

    @staticmethod
    async def update_config(
        session: AsyncSession,
        organization_id: uuid.UUID,
        payload: WidgetUpdateRequest,
    ) -> WidgetProfileDetails:
        """Updates widget customization settings for an owner's organization."""
        widget = await WidgetRepo.update_config(
            session=session,
            organization_id=organization_id,
            bot_display_name=payload.bot_display_name,
            welcome_message=payload.welcome_message,
            primary_color=payload.primary_color,
            widget_placement=payload.widget_placement,
            allowed_origins=payload.allowed_origins,
        )
        if not widget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Widget configuration not found for organization.",
            )

        try:
            await session.commit()
            await session.refresh(widget)
        except Exception as err:
            await session.rollback()
            logger.error("Failed to update widget config: %s", str(err), exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update widget configuration.",
            )

        logger.info(
            "Updated widget config for org %s: name='%s', color='%s', placement='%s'",
            organization_id,
            widget.bot_display_name,
            widget.primary_color,
            widget.widget_placement,
        )

        has_grace = bool(widget.previous_widget_key and widget.grace_expires_at)
        base_url = (
            settings.BETTER_AUTH_URL.rstrip("/")
            if settings.BETTER_AUTH_URL and not settings.BETTER_AUTH_URL.startswith("http://localhost")
            else "https://resolvdesk.online"
        )
        embed_snippet = (
            f'<script src="{base_url}/widget.js" '
            f'data-widget-key="{widget.widget_key}" defer></script>'
        )

        return WidgetProfileDetails(
            widget_key=widget.widget_key,
            primary_color=widget.primary_color,
            bot_display_name=widget.bot_display_name,
            welcome_message=widget.welcome_message,
            widget_placement=widget.widget_placement,
            allowed_origins=widget.allowed_origins,
            has_grace_key=has_grace,
            grace_expires_at=widget.grace_expires_at,
            embed_snippet=embed_snippet,
        )

