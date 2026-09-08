import math
import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.owner import OwnerStatus
from app.repos.admin_audit_log_repo import AdminAuditLogRepo
from app.repos.admin_repo import AdminRepo
from app.schemas.admin import (
    PlatformMetricsResponse,
    PlatformUserItem,
    PlatformUserListResponse,
)


class AdminService:
    """Business logic layer for platform creator administration operations."""

    @staticmethod
    async def get_metrics(session: AsyncSession) -> PlatformMetricsResponse:
        """Retrieves platform-wide aggregated KPI metrics."""
        metrics = await AdminRepo.get_metrics(session)
        return PlatformMetricsResponse(**metrics)

    @staticmethod
    async def list_users(
        session: AsyncSession,
        search_query: Optional[str] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PlatformUserListResponse:
        """Lists platform users with search, status filtering, and pagination."""
        items_raw, total = await AdminRepo.list_users(
            session=session,
            search_query=search_query,
            status_filter=status_filter,
            page=page,
            page_size=page_size,
        )
        items = [PlatformUserItem(**item) for item in items_raw]
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return PlatformUserListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    async def get_user_workspace_details(
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> PlatformUserItem:
        """Retrieves detailed user metadata and workspace counters without exposing customer chat data."""
        details = await AdminRepo.get_user_workspace_details(session, user_id)
        if not details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User or workspace not found.",
            )
        return PlatformUserItem(**details)

    @staticmethod
    async def update_user_status(
        session: AsyncSession,
        admin_id: uuid.UUID,
        target_user_id: uuid.UUID,
        new_status: str,
        reason: Optional[str] = None,
    ) -> PlatformUserItem:
        """Updates account status (active/suspended) with audit logging wrapped in a transaction."""
        # Prevent self-suspension by platform creator
        if admin_id == target_user_id and new_status == OwnerStatus.SUSPENDED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Platform creator cannot suspend their own account.",
            )

        try:
            updated_owner = await AdminRepo.update_user_status(
                session, target_user_id, new_status
            )
            if not updated_owner:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target user not found.",
                )

            await AdminAuditLogRepo.create_log(
                session=session,
                admin_id=admin_id,
                target_user_id=target_user_id,
                action=f"user_{new_status}",
                reason=reason,
            )
            await session.commit()
        except HTTPException:
            await session.rollback()
            raise
        except Exception:
            await session.rollback()
            raise

        details = await AdminRepo.get_user_workspace_details(session, target_user_id)
        if not details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User details not found after update.",
            )
        return PlatformUserItem(**details)
