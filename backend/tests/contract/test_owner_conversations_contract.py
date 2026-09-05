import uuid
import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation, Message
from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from tests.conftest import issue_test_jwt


async def setup_test_owner_and_conversations(
    db_session: AsyncSession,
) -> tuple[Owner, str, Conversation, Conversation]:
    """Helper creating an organization, owner, test conversations and messages."""
    org = Organization(display_name="Inbox Test Store")
    db_session.add(org)
    await db_session.flush()

    owner = Owner(
        email="owner@inboxtest.com",
        full_name="Inbox Owner",
        status=OwnerStatus.ACTIVE,
        organization_id=org.id,
    )
    db_session.add(owner)
    await db_session.flush()

    conv1 = Conversation(organization_id=org.id, is_escalated=False)
    conv2 = Conversation(organization_id=org.id, is_escalated=True)
    db_session.add(conv1)
    db_session.add(conv2)
    await db_session.flush()

    # Add messages to conv1
    msg1 = Message(conversation_id=conv1.id, role="visitor", content="Hello, do you ship to Canada?")
    msg2 = Message(conversation_id=conv1.id, role="assistant", content="Yes, standard shipping takes 3-5 business days.")
    db_session.add(msg1)
    db_session.add(msg2)

    # Add message to conv2
    msg3 = Message(conversation_id=conv2.id, role="visitor", content="I need to speak to an agent right now.")
    db_session.add(msg3)

    await db_session.commit()
    await db_session.refresh(owner)
    await db_session.refresh(conv1)
    await db_session.refresh(conv2)

    token = issue_test_jwt(
        sub=str(owner.id),
        email=owner.email,
        organization_id=str(org.id),
    )
    return owner, token, conv1, conv2


@pytest.mark.asyncio
async def test_list_conversations_unauthorized_401(client: AsyncClient):
    """Verifies that accessing owner conversations without token returns HTTP 401."""
    response = await client.get("/api/v1/conversations")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_conversations_pagination_and_format(client: AsyncClient, db_session: AsyncSession):
    """[US1] Verifies listing conversations with pagination parameters and metadata shapes."""
    _, token, conv1, conv2 = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/api/v1/conversations?limit=10&offset=0", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    assert data["limit"] == 10
    assert data["offset"] == 0
    assert len(data["items"]) == 2

    # Check first item structure
    item = data["items"][0]
    assert "id" in item
    assert "created_at" in item
    assert "updated_at" in item
    assert "is_escalated" in item
    assert "message_count" in item
    assert "last_message_preview" in item
    assert "last_message_role" in item


@pytest.mark.asyncio
async def test_get_conversation_transcript_success(client: AsyncClient, db_session: AsyncSession):
    """[US2] Verifies inspecting full conversation transcript in chronological order."""
    _, token, conv1, _ = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get(f"/api/v1/conversations/{conv1.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == str(conv1.id)
    assert data["is_escalated"] is False
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "visitor"
    assert data["messages"][0]["content"] == "Hello, do you ship to Canada?"
    assert data["messages"][1]["role"] == "assistant"
    assert data["messages"][1]["content"] == "Yes, standard shipping takes 3-5 business days."


@pytest.mark.asyncio
async def test_get_conversation_transcript_not_found_404(client: AsyncClient, db_session: AsyncSession):
    """[US2] Verifies non-existent conversation returns HTTP 404."""
    _, token, _, _ = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    random_id = uuid.uuid4()
    response = await client.get(f"/api/v1/conversations/{random_id}", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Conversation not found."


@pytest.mark.asyncio
async def test_get_conversation_transcript_invalid_uuid_422(client: AsyncClient, db_session: AsyncSession):
    """[US2] Verifies malformed non-UUID path parameter returns HTTP 422."""
    _, token, _, _ = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/api/v1/conversations/invalid-uuid-string", headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_conversation_stats_contract(client: AsyncClient, db_session: AsyncSession):
    """[US3] Verifies conversation overview stats calculation."""
    _, token, _, _ = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/api/v1/conversations/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total_conversations"] == 2
    assert data["total_messages"] == 3
    assert data["escalated_conversations"] == 1
    assert data["active_last_24h"] == 2


@pytest.mark.asyncio
async def test_list_conversations_is_escalated_filter(client: AsyncClient, db_session: AsyncSession):
    """[US4] Verifies filtering conversations by is_escalated flag."""
    _, token, _, _ = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # Filter escalated only
    resp_escalated = await client.get("/api/v1/conversations?is_escalated=true", headers=headers)
    assert resp_escalated.status_code == 200
    data_esc = resp_escalated.json()
    assert data_esc["total"] == 1
    assert data_esc["items"][0]["is_escalated"] is True

    # Filter non-escalated only
    resp_non_esc = await client.get("/api/v1/conversations?is_escalated=false", headers=headers)
    assert resp_non_esc.status_code == 200
    data_non_esc = resp_non_esc.json()
    assert data_non_esc["total"] == 1
    assert data_non_esc["items"][0]["is_escalated"] is False


@pytest.mark.asyncio
async def test_update_ticket_status_success(client: AsyncClient, db_session: AsyncSession):
    """Verifies owner can update ticket resolution status (in_progress -> resolved)."""
    _, token, _, conv2 = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # Transition to in_progress
    resp1 = await client.patch(
        f"/api/v1/conversations/{conv2.id}/ticket",
        json={"status": "in_progress"},
        headers=headers,
    )
    assert resp1.status_code == 200, resp1.text
    data1 = resp1.json()
    assert data1["id"] == str(conv2.id)
    assert data1["ticket_status"] == "in_progress"

    # Transition to resolved
    resp2 = await client.patch(
        f"/api/v1/conversations/{conv2.id}/ticket",
        json={"status": "resolved"},
        headers=headers,
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["ticket_status"] == "resolved"

    # Verify transcript now shows updated status
    transcript_resp = await client.get(f"/api/v1/conversations/{conv2.id}", headers=headers)
    assert transcript_resp.status_code == 200
    assert transcript_resp.json()["ticket_status"] == "resolved"


@pytest.mark.asyncio
async def test_update_ticket_status_invalid_value_422(client: AsyncClient, db_session: AsyncSession):
    """Verifies that submitting an invalid ticket status returns HTTP 422."""
    _, token, _, conv2 = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.patch(
        f"/api/v1/conversations/{conv2.id}/ticket",
        json={"status": "invalid_status_value"},
        headers=headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_ticket_status_not_found_404(client: AsyncClient, db_session: AsyncSession):
    """Verifies that updating a non-existent conversation returns HTTP 404."""
    _, token, _, _ = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    random_id = uuid.uuid4()
    response = await client.patch(
        f"/api/v1/conversations/{random_id}/ticket",
        json={"status": "resolved"},
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Conversation not found."


@pytest.mark.asyncio
async def test_transcript_includes_citations_when_present(client: AsyncClient, db_session: AsyncSession):
    """Verifies that transcript response includes citations list when present on assistant messages."""
    _, token, conv1, _ = await setup_test_owner_and_conversations(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # Add grounded assistant message with citations
    cited_msg = Message(
        conversation_id=conv1.id,
        role="assistant",
        content="Grounding citations test.",
        citations=[{"document_id": "doc-123", "title": "Store Policy"}],
    )
    db_session.add(cited_msg)
    await db_session.commit()

    response = await client.get(f"/api/v1/conversations/{conv1.id}", headers=headers)
    assert response.status_code == 200
    messages = response.json()["messages"]
    last_msg = messages[-1]
    assert last_msg["citations"] is not None
    assert len(last_msg["citations"]) == 1
    assert last_msg["citations"][0]["title"] == "Store Policy"

