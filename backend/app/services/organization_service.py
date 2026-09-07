import uuid
from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.repos.organization_repo import OrganizationRepo
from app.repos.widget_repo import WidgetRepo
from app.schemas.organization import (
    OrganizationDetails,
    OrganizationProfileResponse,
    WidgetProfileDetails,
)


class OrganizationService:
    """Business service for organization profile management and tenant configuration."""

    @staticmethod
    async def get_organization_profile(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> OrganizationProfileResponse:
        """Retrieves organization profile and widget configuration with strict query isolation."""
        org = await OrganizationRepo.get_organization_by_id(session, organization_id)
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found.",
            )

        widget = await WidgetRepo.get_by_organization_id(session, organization_id)
        if not widget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Widget configuration not found for organization.",
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

        return OrganizationProfileResponse(
            organization=OrganizationDetails(
                id=str(org.id),
                display_name=org.display_name,
                created_at=org.created_at,
            ),
            widget=WidgetProfileDetails(
                widget_key=widget.widget_key,
                primary_color=widget.primary_color,
                bot_display_name=widget.bot_display_name,
                welcome_message=widget.welcome_message,
                widget_placement=widget.widget_placement,
                allowed_origins=widget.allowed_origins,
                has_grace_key=has_grace,
                grace_expires_at=widget.grace_expires_at,
                embed_snippet=embed_snippet,
            ),
            embed_snippet=embed_snippet,
        )
