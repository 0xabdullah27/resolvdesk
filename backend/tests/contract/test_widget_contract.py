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


@pytest.mark.asyncio
async def test_update_widget_config_contract_success(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify owner can customize bot display name, greeting, color, placement, and allowed origins."""
    org_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    key = "rd_live_customizetest123456789012345678901234"

    org = Organization(id=org_id, display_name="Style Store")
    owner = Owner(
        id=owner_id,
        email="style@store.com",
        full_name="Style Owner",
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key=key,
        primary_color="#4F46E5",
        bot_display_name="Support Assistant",
        welcome_message="Hi! How can I help you today?",
        widget_placement="bottom-right",
        allowed_origins="*",
    )
    db_session.add(org)
    db_session.add(owner)
    db_session.add(widget)
    await db_session.commit()

    token = issue_test_jwt(sub=str(owner_id), email="style@store.com")
    payload = {
        "bot_display_name": "Style Concierge",
        "welcome_message": "Welcome to Style Store! Need help finding your size?",
        "primary_color": "#059669",
        "widget_placement": "bottom-left",
        "allowed_origins": "stylestore.com, app.stylestore.com",
    }

    response = await client.patch(
        "/api/v1/organization/widget",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["widget_key"] == key
    assert data["bot_display_name"] == "Style Concierge"
    assert data["welcome_message"] == "Welcome to Style Store! Need help finding your size?"
    assert data["primary_color"] == "#059669"
    assert data["widget_placement"] == "bottom-left"
    assert data["allowed_origins"] == "stylestore.com, app.stylestore.com"
    assert key in data["embed_snippet"]


@pytest.mark.asyncio
async def test_update_widget_config_validation_and_isolation(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify validation constraints and multi-tenant isolation."""
    org1_id = uuid.uuid4()
    owner1_id = uuid.uuid4()
    org2_id = uuid.uuid4()
    owner2_id = uuid.uuid4()

    org1 = Organization(id=org1_id, display_name="Org 1")
    owner1 = Owner(id=owner1_id, email="owner1@org.com", full_name="Owner 1", organization_id=org1_id)
    widget1 = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org1_id,
        widget_key="rd_live_org1_key12345678901234567890123456",
        primary_color="#4F46E5",
    )

    org2 = Organization(id=org2_id, display_name="Org 2")
    owner2 = Owner(id=owner2_id, email="owner2@org.com", full_name="Owner 2", organization_id=org2_id)
    widget2 = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org2_id,
        widget_key="rd_live_org2_key12345678901234567890123456",
        primary_color="#2563EB",
        bot_display_name="Org 2 Bot",
    )

    db_session.add(org1)
    db_session.add(owner1)
    db_session.add(widget1)
    db_session.add(org2)
    db_session.add(owner2)
    db_session.add(widget2)
    await db_session.commit()

    token1 = issue_test_jwt(sub=str(owner1_id), email="owner1@org.com")

    # 1. Validation failure: malformed hex color
    bad_color_resp = await client.patch(
        "/api/v1/organization/widget",
        headers={"Authorization": f"Bearer {token1}"},
        json={"primary_color": "not-a-hex"},
    )
    assert bad_color_resp.status_code == 422

    # 2. Validation failure: invalid placement
    bad_placement_resp = await client.patch(
        "/api/v1/organization/widget",
        headers={"Authorization": f"Bearer {token1}"},
        json={"widget_placement": "center-top"},
    )
    assert bad_placement_resp.status_code == 422

    # 3. Unauthenticated request
    unauth_resp = await client.patch(
        "/api/v1/organization/widget",
        json={"bot_display_name": "Hacker Bot"},
    )
    assert unauth_resp.status_code == 401

    # 4. Tenant isolation: Owner 1 updates their widget
    update_resp = await client.patch(
        "/api/v1/organization/widget",
        headers={"Authorization": f"Bearer {token1}"},
        json={"bot_display_name": "Org 1 Customized Bot"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["bot_display_name"] == "Org 1 Customized Bot"

    # Refresh widget2 and confirm it was NOT modified
    await db_session.refresh(widget2)
    assert widget2.bot_display_name == "Org 2 Bot"
    assert widget2.primary_color == "#2563EB"

