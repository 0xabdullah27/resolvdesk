import uuid
from typing import Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus


class OrganizationRepo:
    """Repository handling database queries for Organization and Owner entities.

    Strictly enforces database query-level isolation (Principle I).
    """

    @staticmethod
    async def get_owner_by_id(session: AsyncSession, owner_id: uuid.UUID) -> Optional[Owner]:
        statement = select(Owner).where(Owner.id == owner_id)
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def get_owner_by_email(session: AsyncSession, email: str) -> Optional[Owner]:
        statement = select(Owner).where(Owner.email == email.lower())
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def create_organization(
        session: AsyncSession,
        display_name: str,
        org_id: Optional[uuid.UUID] = None,
    ) -> Organization:
        org = Organization(
            id=org_id or uuid.uuid4(),
            display_name=display_name.strip(),
        )
        session.add(org)
        await session.flush()
        return org

    @staticmethod
    async def create_owner(
        session: AsyncSession,
        owner_id: uuid.UUID,
        email: str,
        full_name: str,
        organization_id: uuid.UUID,
        status: str = OwnerStatus.ACTIVE.value,
    ) -> Owner:
        owner = Owner(
            id=owner_id,
            email=email.lower().strip(),
            full_name=full_name.strip(),
            status=status,
            organization_id=organization_id,
        )
        session.add(owner)
        await session.flush()
        return owner

    @staticmethod
    async def get_organization_by_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> Optional[Organization]:
        """Tenant-isolated retrieval: query strictly filters WHERE id = organization_id."""
        statement = select(Organization).where(Organization.id == organization_id)
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def get_owner_by_organization_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> Optional[Owner]:
        """Fetch organization owner strictly by organization_id."""
        statement = select(Owner).where(Owner.organization_id == organization_id)
        result = await session.exec(statement)
        return result.first()
