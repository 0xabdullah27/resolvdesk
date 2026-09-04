from fastapi import APIRouter, Depends, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_db
from app.schemas.widget import PublicWidgetConfigResponse
from app.services.widget_service import WidgetService

router = APIRouter()


@router.get(
    "/config",
    response_model=PublicWidgetConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public widget branding configuration",
    description="Resolves public widget branding for customer website visitors without requiring visitor authentication.",
)
async def get_public_widget_config(
    key: str = Query(..., description="The public widget key (rd_live_...)"),
    session: AsyncSession = Depends(get_db),
) -> PublicWidgetConfigResponse:
    return await WidgetService.get_public_config(session=session, key=key)
