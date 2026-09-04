import uuid
import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from tests.conftest import issue_test_jwt


@pytest.mark.asyncio
async def test_suspended_owner_cannot_access_protected_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify that an owner with suspended status is denied access to protected endpoints

    with 403 Forbidden even if their JWT token is cryptographically valid (FR-010/T034).
    """
    org_id = uuid.uuid4()
    owner_id = uuid.uuid4()

    org = Organization(id=org_id, display_name="Suspended Corp")
    owner = Owner(
        id=owner_id,
        email="suspended@example.com",
        full_name="Suspended User",
        status=OwnerStatus.SUSPENDED.value,
        organization_id=org_id,
    )
    db_session.add(org)
    db_session.add(owner)
    await db_session.commit()

    token = issue_test_jwt(sub=str(owner_id), email="suspended@example.com")

    # 1. Verify GET /api/v1/me returns 403 Forbidden
    resp_me = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_me.status_code == 403
    assert "suspended" in resp_me.json()["detail"].lower()

    # 2. Verify GET /api/v1/organization/profile returns 403 Forbidden
    resp_profile = await client.get(
        "/api/v1/organization/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_profile.status_code == 403

    # 3. Verify POST /api/v1/organization/widget/rotate-key returns 403 Forbidden
    resp_rotate = await client.post(
        "/api/v1/organization/widget/rotate-key",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_rotate.status_code == 403


@pytest.mark.asyncio
async def test_owner_status_invalidation_after_status_change(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify that changing owner status from active to suspended immediately revokes API access."""
    org_id = uuid.uuid4()
    owner_id = uuid.uuid4()

    org = Organization(id=org_id, display_name="Dynamic Org")
    owner = Owner(
        id=owner_id,
        email="dynamic@example.com",
        full_name="Dynamic User",
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    db_session.add(org)
    db_session.add(owner)
    await db_session.commit()

    token = issue_test_jwt(sub=str(owner_id), email="dynamic@example.com")

    # Initially active: succeeds
    resp_active = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_active.status_code == 200

    # Invalidate account (e.g. security reset or admin suspension)
    owner.status = OwnerStatus.SUSPENDED.value
    db_session.add(owner)
    await db_session.commit()

    # Subsequent request: immediately rejected with 403
    resp_revoked = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_revoked.status_code == 403
