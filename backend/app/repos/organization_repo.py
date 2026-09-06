import uuid
from typing import Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization


class OrganizationRepo:
    """Repository handling database queries exclusively for the Organization entity.

    Strictly enforces database query-level isolation.
    """

    @staticmethod
    async def create_organization(
        session: AsyncSession,
        display_name: str,
        website_url: Optional[str] = None,
        org_id: Optional[uuid.UUID] = None,
    ) -> Organization:
        """Creates and flushes a new Organization record."""
        org = Organization(
            id=org_id or uuid.uuid4(),
            display_name=display_name.strip(),
            website_url=website_url.strip() if website_url else None,
        )
        session.add(org)
        await session.flush()
        return org

    @staticmethod
    async def get_organization_by_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> Optional[Organization]:
        """Tenant-isolated retrieval: query strictly filters WHERE id = organization_id."""
        statement = select(Organization).where(Organization.id == organization_id)
        result = await session.exec(statement)
        return result.first()

    # Convenience aliases
    create = create_organization
    get_by_id = get_organization_by_id

