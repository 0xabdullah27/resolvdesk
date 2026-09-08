import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import CurrentSuperadmin
from app.core.database import get_db
from app.schemas.admin import (
    PlatformMetricsResponse,
    PlatformUserItem,
    PlatformUserListResponse,
    UserStatusUpdateRequest,
)
from app.services.admin_service import AdminService

router = APIRouter(tags=["Platform Admin"])


@router.get(
    "/metrics",
    response_model=PlatformMetricsResponse,
    summary="Get platform creator overview metrics",
    description="Returns aggregated platform-wide counters (users, orgs, documents, conversations). Restricted to platform creator.",
)
async def get_platform_metrics(
    current_admin: CurrentSuperadmin,
    session: AsyncSession = Depends(get_db),
) -> PlatformMetricsResponse:
    """Returns platform-wide KPI summary metrics for superadmin dashboard."""
    return await AdminService.get_metrics(session)


@router.get(
    "/users",
    response_model=PlatformUserListResponse,
    summary="List platform user directory",
    description="Returns paginated platform users with search, status filtering, and organization resource counters.",
)
async def list_platform_users(
    current_admin: CurrentSuperadmin,
    search: Optional[str] = Query(None, description="Search term matching full name, email, or organization name"),
    status: Optional[str] = Query(None, description="Filter users by account status: active or suspended"),
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    session: AsyncSession = Depends(get_db),
) -> PlatformUserListResponse:
    """Lists registered users and organizations with debounced search and status filtering."""
    return await AdminService.list_users(
        session=session,
        search_query=search,
        status_filter=status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/users/{user_id}",
    response_model=PlatformUserItem,
    summary="Get user workspace details",
    description="Returns detailed metadata and resource counters for a single user organization without exposing private customer chat content.",
)
async def get_user_workspace_details(
    user_id: uuid.UUID,
    current_admin: CurrentSuperadmin,
    session: AsyncSession = Depends(get_db),
) -> PlatformUserItem:
    """Fetches user and workspace activity counters."""
    return await AdminService.get_user_workspace_details(session, user_id)


@router.patch(
    "/users/{user_id}/status",
    response_model=PlatformUserItem,
    summary="Update user account status (suspend/reactivate)",
    description="Suspends or reactivates a user account. Records an audit log entry. Self-suspension is blocked.",
)
async def update_user_status(
    user_id: uuid.UUID,
    payload: UserStatusUpdateRequest,
    current_admin: CurrentSuperadmin,
    session: AsyncSession = Depends(get_db),
) -> PlatformUserItem:
    """Updates account status and creates an audit log trail."""
    return await AdminService.update_user_status(
        session=session,
        admin_id=current_admin.id,
        target_user_id=user_id,
        new_status=payload.status,
        reason=payload.reason,
    )
