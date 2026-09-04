import uuid
import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from app.models.widget import WidgetConfiguration
from tests.conftest import issue_test_jwt


@pytest.mark.asyncio
async def test_widget_key_rotation_contract(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify POST /api/v1/organization/widget/rotate-key rotates key and sets 24h grace period."""
    org_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    original_key = "rd_live_original123456789012345678901234567890"

    org = Organization(id=org_id, display_name="Rotate Store")
    owner = Owner(
        id=owner_id,
        email="rotate@store.com",
        full_name="Rotate Owner",
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key=original_key,
    )
    db_session.add(org)
    db_session.add(owner)
    db_session.add(widget)
    await db_session.commit()

    token = issue_test_jwt(sub=str(owner_id), email="rotate@store.com")
    response = await client.post(
        "/api/v1/organization/widget/rotate-key",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    data = response.json()

    assert data["previous_widget_key"] == original_key
    assert data["new_widget_key"].startswith("rd_live_")
    assert data["new_widget_key"] != original_key
    assert "grace_expires_at" in data
    assert data["new_widget_key"] in data["embed_snippet"]


@pytest.mark.asyncio
async def test_public_widget_config_success_and_grace_period(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify unauthenticated visitor can fetch widget config using primary or grace key."""
    org_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    original_key = "rd_live_primarykey12345678901234567890123456"

    org = Organization(id=org_id, display_name="Public Store")
    owner = Owner(
        id=owner_id,
        email="public@store.com",
        full_name="Public Owner",
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key=original_key,
        primary_color="#10B981",
        bot_display_name="Public Bot",
        welcome_message="Hello visitor!",
        widget_placement="bottom-left",
    )
    db_session.add(org)
    db_session.add(owner)
    db_session.add(widget)
    await db_session.commit()

    # 1. Unauthenticated request with primary key
    resp1 = await client.get(f"/api/v1/widget/config?key={original_key}")
    assert resp1.status_code == 200, resp1.text
    data1 = resp1.json()
    assert data1["widget_key"] == original_key
    assert data1["primary_color"] == "#10B981"
    assert data1["bot_display_name"] == "Public Bot"
    assert data1["welcome_message"] == "Hello visitor!"
    assert data1["widget_placement"] == "bottom-left"
    assert data1["is_active"] is True
    # Verify private tenant IDs are NEVER leaked
    assert "organization_id" not in data1
    assert "id" not in data1

    # 2. Rotate key as owner
    token = issue_test_jwt(sub=str(owner_id), email="public@store.com")
    rotate_resp = await client.post(
        "/api/v1/organization/widget/rotate-key",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert rotate_resp.status_code == 200
    new_key = rotate_resp.json()["new_widget_key"]

    # 3. New primary key resolves
    resp2 = await client.get(f"/api/v1/widget/config?key={new_key}")
    assert resp2.status_code == 200
    assert resp2.json()["widget_key"] == new_key

    # 4. Old key during 24h grace period ALSO resolves
    resp3 = await client.get(f"/api/v1/widget/config?key={original_key}")
    assert resp3.status_code == 200
    assert resp3.json()["is_active"] is True

    # 5. Invalid key returns 404
    resp4 = await client.get("/api/v1/widget/config?key=rd_live_nonexistent123")
    assert resp4.status_code == 404
    assert "not found" in resp4.json()["detail"].lower()
