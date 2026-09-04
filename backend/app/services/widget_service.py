import datetime
import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.repos.widget_repo import WidgetRepo
from app.schemas.organization import WidgetKeyRotationResponse
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

        embed_snippet = (
            f'<script src="https://resolvdesk.com/widget.js" '
            f'data-widget-key="{new_key}"></script>'
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

        return PublicWidgetConfigResponse(
            widget_key=key,  # Return the queried key that authorized this view
            bot_display_name=widget.bot_display_name,
            welcome_message=widget.welcome_message,
            primary_color=widget.primary_color,
            widget_placement=widget.widget_placement,
            allowed_origins=widget.allowed_origins,
            is_active=True,
        )
