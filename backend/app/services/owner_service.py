from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.owner import Owner
from app.repos.organization_repo import OrganizationRepo
from app.schemas.organization import OwnerProfileResponse


class OwnerService:
    """Business service for owner management and profile operations."""

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
            role=owner.role,
            status=owner.status,
            organization_id=str(owner.organization_id),
            organization_name=org.display_name if org else None,
            created_at=owner.created_at,
        )
