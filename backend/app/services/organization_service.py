import uuid
from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.owner import Owner
from app.repos.organization_repo import OrganizationRepo
from app.repos.widget_repo import WidgetRepo
from app.schemas.organization import (
    OrganizationDetails,
    OrganizationProfileResponse,
    OwnerProfileResponse,
    WidgetProfileDetails,
)


class OrganizationService:
    """Business service for owner and organization profile management."""

    @staticmethod
    async def get_owner_profile(
        owner: Owner,
        session: AsyncSession,
    ) -> OwnerProfileResponse:
        """Returns the profile DTO for the verified owner with tenant organization details."""
        org = await OrganizationRepo.get_organization_by_id(session, owner.organization_id)
        return OwnerProfileResponse(
            id=str(owner.id),
            email=owner.email,
            full_name=owner.full_name,
            status=owner.status,
            organization_id=str(owner.organization_id),
            organization_name=org.display_name if org else None,
            created_at=owner.created_at,
        )

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
        embed_snippet = (
            f'<script src="https://resolvdesk.com/widget.js" '
            f'data-widget-key="{widget.widget_key}"></script>'
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
                has_grace_key=has_grace,
            ),
            embed_snippet=embed_snippet,
        )
