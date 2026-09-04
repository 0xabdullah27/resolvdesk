from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_db
from app.schemas.registration import (
    RegistrationCompleteRequest,
    RegistrationCompleteResponse,
)
from app.services.registration_service import RegistrationService

router = APIRouter()


@router.post(
    "/complete",
    response_model=RegistrationCompleteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Complete owner and organization registration",
    description="Atomically provisions Owner, Organization workspace, and default Widget configuration in a single transaction.",
)
async def complete_registration(
    payload: RegistrationCompleteRequest,
    session: AsyncSession = Depends(get_db),
) -> RegistrationCompleteResponse:
    return await RegistrationService.complete_registration(session, payload)
