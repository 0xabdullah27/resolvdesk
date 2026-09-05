import uuid
import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from tests.conftest import issue_test_jwt


@pytest.mark.asyncio
async def test_get_me_success(client: AsyncClient, db_session: AsyncSession):
    """Verify GET /api/v1/me returns owner profile for authenticated user."""
    # Setup test organization and owner
    org_id = uuid.uuid4()
    owner_id = uuid.uuid4()

    org = Organization(id=org_id, display_name="Test Store")
    owner = Owner(
        id=owner_id,
        email="owner@teststore.com",
        full_name="Alice Store",
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    db_session.add(org)
    db_session.add(owner)
    await db_session.commit()

    token = issue_test_jwt(sub=str(owner_id), email="owner@teststore.com")
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["id"] == str(owner_id)
    assert data["email"] == "owner@teststore.com"
    assert data["full_name"] == "Alice Store"
    assert data["status"] == "active"
    assert data["organization_id"] == str(org_id)
    assert data["organization_name"] == "Test Store"


@pytest.mark.asyncio
async def test_get_me_unauthorized_missing_token(client: AsyncClient):
    """Verify GET /api/v1/me without token returns 401."""
    response = await client.get("/api/v1/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_unauthorized_expired_token(client: AsyncClient):
    """Verify GET /api/v1/me with expired token returns 401."""
    token = issue_test_jwt(sub=str(uuid.uuid4()), is_expired=True)
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()
