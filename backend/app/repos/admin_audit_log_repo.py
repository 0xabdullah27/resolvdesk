import uuid
from typing import List, Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.admin_audit_log import AdminAuditLog, utc_now


class AdminAuditLogRepo:
    """Repository handling persistence and retrieval of administrative audit records."""

    @staticmethod
    async def create_log(
        session: AsyncSession,
        admin_id: uuid.UUID,
        target_user_id: uuid.UUID,
        action: str,
        reason: Optional[str] = None,
    ) -> AdminAuditLog:
        """Creates and flushes an admin audit log entry."""
        log = AdminAuditLog(
            admin_id=admin_id,
            target_user_id=target_user_id,
            action=action,
            reason=reason,
            created_at=utc_now(),
        )
        session.add(log)
        await session.flush()
        return log

    @staticmethod
    async def list_logs_for_target(
        session: AsyncSession,
        target_user_id: uuid.UUID,
        limit: int = 50,
    ) -> List[AdminAuditLog]:
        """Fetches audit logs recorded against a target user, newest first."""
        statement = (
            select(AdminAuditLog)
            .where(AdminAuditLog.target_user_id == target_user_id)
            .order_by(AdminAuditLog.created_at.desc())
            .limit(limit)
        )
        result = await session.exec(statement)
        return list(result.all())
