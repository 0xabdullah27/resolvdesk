import uuid
import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from app.models.widget import WidgetConfiguration
from tests.conftest import issue_test_jwt


@pytest.mark.asyncio
async def test_multi_tenant_profile_isolation(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify that each owner only accesses their own organization's profile

    and cannot observe another tenant's data (Principle I).
    """
    # Tenant 1: Acme Corp
    org1_id = uuid.uuid4()
    owner1_id = uuid.uuid4()
    org1 = Organization(id=org1_id, display_name="Acme Corp")
    owner1 = Owner(
        id=owner1_id,
        email="alice@acme.com",
        full_name="Alice Acme",
        status=OwnerStatus.ACTIVE.value,
        organization_id=org1_id,
    )
    widget1 = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org1_id,
        widget_key="rd_live_acme1234567890123456789012345678901234",
        bot_display_name="Acme Bot",
    )

    # Tenant 2: Beta Industries
    org2_id = uuid.uuid4()
    owner2_id = uuid.uuid4()
    org2 = Organization(id=org2_id, display_name="Beta Industries")
    owner2 = Owner(
        id=owner2_id,
        email="bob@beta.com",
        full_name="Bob Beta",
        status=OwnerStatus.ACTIVE.value,
        organization_id=org2_id,
    )
    widget2 = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org2_id,
        widget_key="rd_live_beta1234567890123456789012345678901234",
        bot_display_name="Beta Bot",
    )

    db_session.add(org1)
    db_session.add(owner1)
    db_session.add(widget1)
    db_session.add(org2)
    db_session.add(owner2)
    db_session.add(widget2)
    await db_session.commit()

    # Query as Owner 1
    token1 = issue_test_jwt(sub=str(owner1_id), email="alice@acme.com")
    resp1 = await client.get(
        "/api/v1/organization/profile",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp1.status_code == 200, resp1.text
    data1 = resp1.json()
    assert data1["organization"]["id"] == str(org1_id)
    assert data1["organization"]["display_name"] == "Acme Corp"
    assert data1["widget"]["widget_key"] == "rd_live_acme1234567890123456789012345678901234"
    assert data1["widget"]["bot_display_name"] == "Acme Bot"

    # Query as Owner 2
    token2 = issue_test_jwt(sub=str(owner2_id), email="bob@beta.com")
    resp2 = await client.get(
        "/api/v1/organization/profile",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert resp2.status_code == 200, resp2.text
    data2 = resp2.json()
    assert data2["organization"]["id"] == str(org2_id)
    assert data2["organization"]["display_name"] == "Beta Industries"
    assert data2["widget"]["widget_key"] == "rd_live_beta1234567890123456789012345678901234"
    assert data2["widget"]["bot_display_name"] == "Beta Bot"
