import uuid
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation
from app.models.document import Document
from app.models.organization import Organization
from app.models.owner import Owner, OwnerRole, OwnerStatus, utc_now


class AdminRepo:
    """Repository handling platform administration aggregation and cross-tenant queries."""

    @staticmethod
    async def get_metrics(session: AsyncSession) -> Dict[str, int]:
        """Calculates platform-wide aggregate KPI summary counters."""
        total_users_stmt = select(func.count(Owner.id))
        active_users_stmt = select(func.count(Owner.id)).where(Owner.status == OwnerStatus.ACTIVE.value)
        suspended_users_stmt = select(func.count(Owner.id)).where(Owner.status == OwnerStatus.SUSPENDED.value)
        total_orgs_stmt = select(func.count(Organization.id))
        total_docs_stmt = select(func.count(Document.id))
        total_convs_stmt = select(func.count(Conversation.id))

        total_users = (await session.exec(total_users_stmt)).one() or 0
        active_users = (await session.exec(active_users_stmt)).one() or 0
        suspended_users = (await session.exec(suspended_users_stmt)).one() or 0
        total_orgs = (await session.exec(total_orgs_stmt)).one() or 0
        total_docs = (await session.exec(total_docs_stmt)).one() or 0
        total_convs = (await session.exec(total_convs_stmt)).one() or 0

        return {
            "total_users": int(total_users),
            "active_users": int(active_users),
            "suspended_users": int(suspended_users),
            "total_organizations": int(total_orgs),
            "total_documents": int(total_docs),
            "total_conversations": int(total_convs),
        }

    @staticmethod
    async def list_users(
        session: AsyncSession,
        search_query: Optional[str] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Returns paginated platform users directory joined with organization & resource counters."""
        # Subqueries for resource counts grouped by organization_id
        docs_subquery = (
            select(Document.organization_id, func.count(Document.id).label("docs_count"))
            .group_by(Document.organization_id)
            .subquery()
        )

        convs_subquery = (
            select(Conversation.organization_id, func.count(Conversation.id).label("convs_count"))
            .group_by(Conversation.organization_id)
            .subquery()
        )

        tickets_subquery = (
            select(Conversation.organization_id, func.count(Conversation.id).label("tickets_count"))
            .where(or_(Conversation.is_escalated == True, Conversation.ticket_status != None))  # noqa: E711, E712
            .group_by(Conversation.organization_id)
            .subquery()
        )

        # Base query joining Owner and Organization
        base_stmt = (
            select(
                Owner.id,
                Owner.email,
                Owner.full_name,
                Owner.role,
                Owner.status,
                Owner.created_at,
                Organization.id.label("organization_id"),
                Organization.display_name.label("organization_name"),
                Organization.website_url,
                func.coalesce(docs_subquery.c.docs_count, 0).label("documents_count"),
                func.coalesce(convs_subquery.c.convs_count, 0).label("conversations_count"),
                func.coalesce(tickets_subquery.c.tickets_count, 0).label("tickets_count"),
            )
            .join(Organization, Owner.organization_id == Organization.id)
            .outerjoin(docs_subquery, Organization.id == docs_subquery.c.organization_id)
            .outerjoin(convs_subquery, Organization.id == convs_subquery.c.organization_id)
            .outerjoin(tickets_subquery, Organization.id == tickets_subquery.c.organization_id)
        )

        # Apply search filtering
        filters = []
        if search_query and search_query.strip():
            term = f"%{search_query.strip()}%"
            filters.append(
                or_(
                    Owner.full_name.ilike(term),
                    Owner.email.ilike(term),
                    Organization.display_name.ilike(term),
                )
            )

        # Apply status filtering
        if status_filter and status_filter.lower() in ("active", "suspended"):
            filters.append(Owner.status == status_filter.lower())

        if filters:
            base_stmt = base_stmt.where(*filters)

        # Total count query
        count_stmt = select(func.count(Owner.id)).join(Organization, Owner.organization_id == Organization.id)
        if filters:
            count_stmt = count_stmt.where(*filters)

        total_count = (await session.exec(count_stmt)).one() or 0

        # Pagination & ordering
        offset = (max(1, page) - 1) * page_size
        paginated_stmt = base_stmt.order_by(Owner.created_at.desc()).offset(offset).limit(page_size)

        results = await session.exec(paginated_stmt)
        items = []
        for row in results.all():
            items.append({
                "id": row.id,
                "email": row.email,
                "full_name": row.full_name,
                "role": row.role,
                "status": row.status,
                "created_at": row.created_at,
                "organization_id": row.organization_id,
                "organization_name": row.organization_name,
                "website_url": row.website_url,
                "documents_count": int(row.documents_count),
                "conversations_count": int(row.conversations_count),
                "tickets_count": int(row.tickets_count),
            })

        return items, int(total_count)

    @staticmethod
    async def get_user_workspace_details(
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> Optional[Dict[str, Any]]:
        """Retrieves detailed user metadata and workspace utilization without exposing chat messages."""
        owner_stmt = select(Owner).where(Owner.id == user_id)
        owner = (await session.exec(owner_stmt)).first()
        if not owner:
            return None

        org_stmt = select(Organization).where(Organization.id == owner.organization_id)
        org = (await session.exec(org_stmt)).first()

        docs_count_stmt = select(func.count(Document.id)).where(Document.organization_id == owner.organization_id)
        docs_count = (await session.exec(docs_count_stmt)).one() or 0

        convs_count_stmt = select(func.count(Conversation.id)).where(Conversation.organization_id == owner.organization_id)
        convs_count = (await session.exec(convs_count_stmt)).one() or 0

        tickets_count_stmt = (
            select(func.count(Conversation.id))
            .where(Conversation.organization_id == owner.organization_id)
            .where(or_(Conversation.is_escalated == True, Conversation.ticket_status != None))  # noqa: E711, E712
        )
        tickets_count = (await session.exec(tickets_count_stmt)).one() or 0

        return {
            "id": owner.id,
            "email": owner.email,
            "full_name": owner.full_name,
            "role": owner.role,
            "status": owner.status,
            "created_at": owner.created_at,
            "organization_id": org.id if org else owner.organization_id,
            "organization_name": org.display_name if org else "Unknown Organization",
            "website_url": org.website_url if org else None,
            "documents_count": int(docs_count),
            "conversations_count": int(convs_count),
            "tickets_count": int(tickets_count),
        }

    @staticmethod
    async def update_user_status(
        session: AsyncSession,
        user_id: uuid.UUID,
        new_status: str,
    ) -> Optional[Owner]:
        """Updates user account status (active/suspended) and commits."""
        owner = await session.get(Owner, user_id)
        if not owner:
            return None

        owner.status = new_status
        owner.updated_at = utc_now()
        session.add(owner)
        await session.flush()
        return owner

    @staticmethod
    async def bootstrap_superadmin(
        session: AsyncSession,
        email: str,
    ) -> Optional[Owner]:
        """Elevates target owner to superadmin if their email matches platform owner."""
        normalized_email = email.lower().strip()
        statement = select(Owner).where(Owner.email == normalized_email)
        owner = (await session.exec(statement)).first()
        if owner and owner.role != OwnerRole.SUPERADMIN.value:
            owner.role = OwnerRole.SUPERADMIN.value
            owner.updated_at = utc_now()
            session.add(owner)
            await session.commit()
            await session.refresh(owner)
        return owner
