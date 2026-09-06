import uuid
from typing import Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.owner import Owner, OwnerStatus


class OwnerRepo:
    """Repository handling database queries exclusively for the Owner entity."""

    @staticmethod
    async def get_by_id(session: AsyncSession, owner_id: uuid.UUID) -> Optional[Owner]:
        """Fetch owner by primary key ID."""
        statement = select(Owner).where(Owner.id == owner_id)
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def get_by_email(session: AsyncSession, email: str) -> Optional[Owner]:
        """Fetch owner by unique normalized email."""
        statement = select(Owner).where(Owner.email == email.lower().strip())
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def get_by_organization_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> Optional[Owner]:
        """Fetch owner associated with a specific organization."""
        statement = select(Owner).where(Owner.organization_id == organization_id)
        result = await session.exec(statement)
        return result.first()

    @staticmethod
    async def create(
        session: AsyncSession,
        owner_id: uuid.UUID,
        email: str,
        full_name: str,
        organization_id: uuid.UUID,
        status: str = OwnerStatus.ACTIVE.value,
    ) -> Owner:
        """Persists a new Owner record."""
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
