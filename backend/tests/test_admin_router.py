import uuid
import pytest
from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.conversation import Conversation
from app.models.document import Document, DocumentStatus, DocumentType
from app.models.organization import Organization
from app.models.owner import Owner, OwnerRole, OwnerStatus
from tests.conftest import issue_test_jwt


@pytest.mark.asyncio
async def test_admin_metrics_access_control(client: AsyncClient, db_session: AsyncSession):
    """Verifies that only superadmins can access /api/v1/admin/metrics, while normal owners get 403."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Creator Org")
    db_session.add(org)

    # Superadmin owner
    admin_id = uuid.uuid4()
    admin_owner = Owner(
        id=admin_id,
        email="creator@resolvdesk.com",
        full_name="Platform Creator",
        role=OwnerRole.SUPERADMIN.value,
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    db_session.add(admin_owner)

    # Regular owner
    reg_id = uuid.uuid4()
    reg_owner = Owner(
        id=reg_id,
        email="merchant@shop.com",
        full_name="Regular Merchant",
        role=OwnerRole.OWNER.value,
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    db_session.add(reg_owner)

    # Some sample data
    doc = Document(
        id=uuid.uuid4(),
        organization_id=org_id,
        title="faq.pdf",
        file_type=DocumentType.PDF,
        status=DocumentStatus.READY,
    )
    db_session.add(doc)

    conv = Conversation(
        id=uuid.uuid4(),
        organization_id=org_id,
        session_token="test_sess_001",
    )
    db_session.add(conv)
    await db_session.commit()

    # 1. Unauthenticated request -> 401
    resp_unauth = await client.get("/api/v1/admin/metrics")
    assert resp_unauth.status_code == 401

    # 2. Regular owner request -> 403 Forbidden
    reg_token = issue_test_jwt(sub=str(reg_id), email="merchant@shop.com")
    resp_reg = await client.get(
        "/api/v1/admin/metrics",
        headers={"Authorization": f"Bearer {reg_token}"},
    )
    assert resp_reg.status_code == 403
    assert "Administrative privileges required" in resp_reg.json()["detail"]

    # 3. Superadmin request -> 200 OK with accurate counts
    admin_token = issue_test_jwt(sub=str(admin_id), email="creator@resolvdesk.com")
    resp_admin = await client.get(
        "/api/v1/admin/metrics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_admin.status_code == 200
    data = resp_admin.json()
    assert data["total_users"] == 2
    assert data["active_users"] == 2
    assert data["suspended_users"] == 0
    assert data["total_organizations"] == 1
    assert data["total_documents"] == 1
    assert data["total_conversations"] == 1


@pytest.mark.asyncio
async def test_admin_list_users_directory(client: AsyncClient, db_session: AsyncSession):
    """Verifies directory listing, search, status filtering, and pagination."""
    org1_id = uuid.uuid4()
    org2_id = uuid.uuid4()
    org1 = Organization(id=org1_id, display_name="Alpha Store")
    org2 = Organization(id=org2_id, display_name="Beta Logistics")
    db_session.add(org1)
    db_session.add(org2)

    admin_id = uuid.uuid4()
    admin_owner = Owner(
        id=admin_id,
        email="admin@resolvdesk.com",
        full_name="Admin Chief",
        role=OwnerRole.SUPERADMIN.value,
        status=OwnerStatus.ACTIVE.value,
        organization_id=org1_id,
    )
    user2_id = uuid.uuid4()
    user2 = Owner(
        id=user2_id,
        email="alice@alpha.com",
        full_name="Alice Smith",
        role=OwnerRole.OWNER.value,
        status=OwnerStatus.ACTIVE.value,
        organization_id=org1_id,
    )
    user3_id = uuid.uuid4()
    user3 = Owner(
        id=user3_id,
        email="bob@beta.com",
        full_name="Bob Builder",
        role=OwnerRole.OWNER.value,
        status=OwnerStatus.SUSPENDED.value,
        organization_id=org2_id,
    )
    db_session.add_all([admin_owner, user2, user3])
    await db_session.commit()

    admin_token = issue_test_jwt(sub=str(admin_id), email="admin@resolvdesk.com")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # All users
    resp = await client.get("/api/v1/admin/users", headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["total"] == 3
    assert len(res_data["items"]) == 3

    # Filter status=suspended
    resp_susp = await client.get("/api/v1/admin/users?status=suspended", headers=headers)
    assert resp_susp.status_code == 200
    susp_data = resp_susp.json()
    assert susp_data["total"] == 1
    assert susp_data["items"][0]["email"] == "bob@beta.com"

    # Search term "Alice"
    resp_search = await client.get("/api/v1/admin/users?search=Alice", headers=headers)
    assert resp_search.status_code == 200
    search_data = resp_search.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["full_name"] == "Alice Smith"


@pytest.mark.asyncio
async def test_admin_update_user_status_and_audit(client: AsyncClient, db_session: AsyncSession):
    """Verifies suspending/reactivating users, audit log recording, and self-suspension blocking."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Gamma Tech")
    db_session.add(org)

    admin_id = uuid.uuid4()
    admin_owner = Owner(
        id=admin_id,
        email="owner@resolvdesk.com",
        full_name="Creator Admin",
        role=OwnerRole.SUPERADMIN.value,
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    target_id = uuid.uuid4()
    target_user = Owner(
        id=target_id,
        email="target@gamma.com",
        full_name="Target Merchant",
        role=OwnerRole.OWNER.value,
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    db_session.add_all([admin_owner, target_user])
    await db_session.commit()

    admin_token = issue_test_jwt(sub=str(admin_id), email="owner@resolvdesk.com")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Suspend target user
    resp_suspend = await client.patch(
        f"/api/v1/admin/users/{target_id}/status",
        headers=headers,
        json={"status": "suspended", "reason": "Terms violation test"},
    )
    assert resp_suspend.status_code == 200
    assert resp_suspend.json()["status"] == "suspended"

    # Verify audit log was created
    audit_stmt = select(AdminAuditLog).where(AdminAuditLog.target_user_id == target_id)
    audit_logs = (await db_session.exec(audit_stmt)).all()
    assert len(audit_logs) == 1
    assert audit_logs[0].action == "user_suspended"
    assert audit_logs[0].reason == "Terms violation test"
    assert audit_logs[0].admin_id == admin_id

    # 2. Block self-suspension
    resp_self = await client.patch(
        f"/api/v1/admin/users/{admin_id}/status",
        headers=headers,
        json={"status": "suspended", "reason": "Trying to suspend myself"},
    )
    assert resp_self.status_code == 400
    assert "cannot suspend their own account" in resp_self.json()["detail"]

    # 3. Reactivate target user
    resp_reactivate = await client.patch(
        f"/api/v1/admin/users/{target_id}/status",
        headers=headers,
        json={"status": "active", "reason": "Issue resolved"},
    )
    assert resp_reactivate.status_code == 200
    assert resp_reactivate.json()["status"] == "active"


@pytest.mark.asyncio
async def test_admin_get_user_workspace_details(client: AsyncClient, db_session: AsyncSession):
    """Verifies retrieval of user organization resource counters while preserving chat message privacy."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Delta Delta", website_url="https://deltadelta.io")
    db_session.add(org)

    admin_id = uuid.uuid4()
    admin_owner = Owner(
        id=admin_id,
        email="admin@creator.com",
        full_name="Creator",
        role=OwnerRole.SUPERADMIN.value,
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    user_id = uuid.uuid4()
    user = Owner(
        id=user_id,
        email="user@deltadelta.io",
        full_name="Delta User",
        role=OwnerRole.OWNER.value,
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    db_session.add_all([admin_owner, user])

    doc = Document(
        id=uuid.uuid4(),
        organization_id=org_id,
        title="guide.md",
        file_type=DocumentType.MD,
        status=DocumentStatus.READY,
    )
    db_session.add(doc)
    await db_session.commit()

    admin_token = issue_test_jwt(sub=str(admin_id), email="admin@creator.com")
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.get(f"/api/v1/admin/users/{user_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(user_id)
    assert data["email"] == "user@deltadelta.io"
    assert data["organization_name"] == "Delta Delta"
    assert data["website_url"] == "https://deltadelta.io"
    assert data["documents_count"] == 1
    # Verify no message content or private transcripts are returned
    assert "messages" not in data
    assert "transcript" not in data


@pytest.mark.asyncio
async def test_widget_config_returns_inactive_on_suspension(
    client: AsyncClient, db_session: AsyncSession
):
    """Verifies that public widget config returns is_active=False when owning merchant is suspended."""
    from app.models.widget import WidgetConfiguration

    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Suspended Store")
    db_session.add(org)

    owner = Owner(
        id=uuid.uuid4(),
        email="suspended@store.com",
        full_name="Suspended Owner",
        role=OwnerRole.OWNER.value,
        status=OwnerStatus.SUSPENDED.value,
        organization_id=org_id,
    )
    db_session.add(owner)

    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_test_suspended_key_1234567890",
        bot_display_name="Store Bot",
        welcome_message="Hi there",
    )
    db_session.add(widget)
    await db_session.commit()

    resp = await client.get("/api/v1/widget/config?key=rd_live_test_suspended_key_1234567890")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_active"] is False
