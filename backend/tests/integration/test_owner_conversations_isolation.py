import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation, Message
from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from tests.conftest import issue_test_jwt


@pytest.mark.asyncio
async def test_multi_tenant_conversations_isolation(client: AsyncClient, db_session: AsyncSession):
    """Verifies that conversation listing and inspection strictly isolate data across tenants."""
    # 1. Create Organization A
    org_a = Organization(display_name="Organization Alpha")
    db_session.add(org_a)
    await db_session.flush()

    owner_a = Owner(
        email="owner_a@alpha.com",
        full_name="Alpha Owner",
        status=OwnerStatus.ACTIVE,
        organization_id=org_a.id,
    )
    db_session.add(owner_a)

    # Org A conversations
    conv_a1 = Conversation(organization_id=org_a.id, is_escalated=False)
    conv_a2 = Conversation(organization_id=org_a.id, is_escalated=True)
    conv_a3 = Conversation(organization_id=org_a.id, is_escalated=False)
    db_session.add_all([conv_a1, conv_a2, conv_a3])
    await db_session.flush()

    msg_a1 = Message(conversation_id=conv_a1.id, role="visitor", content="Alpha question 1")
    msg_a2 = Message(conversation_id=conv_a1.id, role="assistant", content="Alpha answer 1")
    msg_a3 = Message(conversation_id=conv_a2.id, role="visitor", content="Alpha question 2")
    db_session.add_all([msg_a1, msg_a2, msg_a3])

    # 2. Create Organization B
    org_b = Organization(display_name="Organization Beta")
    db_session.add(org_b)
    await db_session.flush()

    owner_b = Owner(
        email="owner_b@beta.com",
        full_name="Beta Owner",
        status=OwnerStatus.ACTIVE,
        organization_id=org_b.id,
    )
    db_session.add(owner_b)

    # Org B conversations
    conv_b1 = Conversation(organization_id=org_b.id, is_escalated=False)
    conv_b2 = Conversation(organization_id=org_b.id, is_escalated=True)
    db_session.add_all([conv_b1, conv_b2])
    await db_session.flush()

    msg_b1 = Message(conversation_id=conv_b1.id, role="visitor", content="Beta confidential question")
    db_session.add(msg_b1)

    await db_session.commit()

    token_a = issue_test_jwt(sub=str(owner_a.id), email=owner_a.email, organization_id=str(org_a.id))
    token_b = issue_test_jwt(sub=str(owner_b.id), email=owner_b.email, organization_id=str(org_b.id))

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Verify Org A listing only returns Org A conversations
    resp_a = await client.get("/api/v1/conversations", headers=headers_a)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["total"] == 3
    returned_ids_a = {item["id"] for item in data_a["items"]}
    assert returned_ids_a == {str(conv_a1.id), str(conv_a2.id), str(conv_a3.id)}
    assert str(conv_b1.id) not in returned_ids_a
    assert str(conv_b2.id) not in returned_ids_a

    # 4. Verify Org B listing only returns Org B conversations
    resp_b = await client.get("/api/v1/conversations", headers=headers_b)
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    assert data_b["total"] == 2
    returned_ids_b = {item["id"] for item in data_b["items"]}
    assert returned_ids_b == {str(conv_b1.id), str(conv_b2.id)}
    assert str(conv_a1.id) not in returned_ids_b

    # 5. Cross-tenant transcript inspection: Owner A tries to view Org B's conversation -> MUST return 404
    cross_resp = await client.get(f"/api/v1/conversations/{conv_b1.id}", headers=headers_a)
    assert cross_resp.status_code == 404
    assert cross_resp.json()["detail"] == "Conversation not found."

    # 6. Verify stats isolation
    stats_a = (await client.get("/api/v1/conversations/stats", headers=headers_a)).json()
    assert stats_a["total_conversations"] == 3
    assert stats_a["total_messages"] == 3
    assert stats_a["escalated_conversations"] == 1

    stats_b = (await client.get("/api/v1/conversations/stats", headers=headers_b)).json()
    assert stats_b["total_conversations"] == 2
    assert stats_b["total_messages"] == 1
    assert stats_b["escalated_conversations"] == 1


@pytest.mark.asyncio
async def test_suspended_owner_cannot_access_conversations(client: AsyncClient, db_session: AsyncSession):
    """Verifies that suspended owners are blocked with HTTP 403."""
    org = Organization(display_name="Suspended Org")
    db_session.add(org)
    await db_session.flush()

    owner = Owner(
        email="suspended@org.com",
        full_name="Suspended Owner",
        status=OwnerStatus.SUSPENDED,
        organization_id=org.id,
    )
    db_session.add(owner)
    await db_session.commit()

    token = issue_test_jwt(sub=str(owner.id), email=owner.email, organization_id=str(org.id))
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/v1/conversations", headers=headers)
    assert resp.status_code == 403
