import uuid
import pytest
from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner
from app.models.widget import WidgetConfiguration


@pytest.mark.asyncio
async def test_registration_atomic_rollback_on_failure(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    """Verify that if any step in provisioning fails, the entire transaction is rolled back

    and 0 records are left in the database.
    """
    from app.services import registration_service

    # Monkeypatch widget creation to simulate an unexpected failure
    async def _failing_create_widget(*args, **kwargs):
        raise RuntimeError("Simulated provisioning disaster in widget creation")

    monkeypatch.setattr(
        registration_service.WidgetRepo,
        "create_widget_config",
        staticmethod(_failing_create_widget),
    )

    user_id = str(uuid.uuid4())
    payload = {
        "user_id": user_id,
        "email": "rollback@test.com",
        "full_name": "Rollback User",
        "organization_name": "Rollback Inc",
    }

    response = await client.post("/api/v1/registration/complete", json=payload)
    assert response.status_code == 500

    # Verify atomic rollback: No owner created
    owner_stmt = select(Owner).where(Owner.email == "rollback@test.com")
    owner_res = await db_session.exec(owner_stmt)
    assert owner_res.first() is None

    # Verify no organization created
    org_stmt = select(Organization).where(Organization.display_name == "Rollback Inc")
    org_res = await db_session.exec(org_stmt)
    assert org_res.first() is None

    # Verify no widget configuration created
    wgt_stmt = select(WidgetConfiguration)
    wgt_res = await db_session.exec(wgt_stmt)
    assert len(wgt_res.all()) == 0
