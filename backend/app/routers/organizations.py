from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import CurrentOwner
from app.core.database import get_db
from app.models.owner import Owner
from app.schemas.organization import (
    OrganizationProfileResponse,
    OwnerProfileResponse,
    WidgetKeyRotationResponse,
)
from app.services.organization_service import OrganizationService
from app.services.widget_service import WidgetService

router = APIRouter()


@router.get(
    "/me",
    response_model=OwnerProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated owner profile",
    description="Resolves and returns the authenticated owner profile from verified JWT claims.",
)
async def get_current_owner_profile(
    current_owner: CurrentOwner,
    session: AsyncSession = Depends(get_db),
) -> OwnerProfileResponse:
    return await OrganizationService.get_owner_profile(current_owner, session=session)


@router.get(
    "/organization/profile",
    response_model=OrganizationProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated organization profile",
    description="Retrieves the owner's organization profile and current widget configuration with strict tenant query isolation.",
)
async def get_organization_profile(
    current_owner: CurrentOwner,
    session: AsyncSession = Depends(get_db),
) -> OrganizationProfileResponse:
    return await OrganizationService.get_organization_profile(
        session=session,
        organization_id=current_owner.organization_id,
    )


@router.post(
    "/organization/widget/rotate-key",
    response_model=WidgetKeyRotationResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate organization widget key",
    description="Rotates the public widget key, setting the current key into a 24-hour grace window.",
)
async def rotate_widget_key(
    current_owner: CurrentOwner,
    session: AsyncSession = Depends(get_db),
) -> WidgetKeyRotationResponse:
    return await WidgetService.rotate_key(
        session=session,
        organization_id=current_owner.organization_id,
    )
