import uuid
import pytest
from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation, Message
from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from app.models.widget import WidgetConfiguration


@pytest.mark.asyncio
async def test_visitor_escalation_success(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify anonymous visitor can escalate conversation, setting is_escalated=True and creating ticket reference."""
    org_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    widget_key = f"rd_live_{uuid.uuid4().hex}"

    org = Organization(id=org_id, display_name="Escalation Store")
    owner = Owner(
        id=owner_id,
        email="escalate_owner@store.com",
        full_name="Escalate Owner",
        status=OwnerStatus.ACTIVE.value,
        organization_id=org_id,
    )
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key=widget_key,
        allowed_origins="*",
    )
    conversation = Conversation(
        id=uuid.uuid4(),
        organization_id=org_id,
        is_escalated=False,
    )
    db_session.add(org)
    db_session.add(owner)
    db_session.add(widget)
    db_session.add(conversation)
    await db_session.commit()

    payload = {
        "widget_key": widget_key,
        "conversation_id": str(conversation.id),
        "visitor_email": "shopper@example.com",
        "reason": "Need manager approval for bulk order",
    }

    response = await client.post(
        "/api/v1/widget/chat/escalate",
        json=payload,
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["ticket_id"].startswith("TK-")
    assert data["conversation_id"] == str(conversation.id)
    assert data["visitor_email"] == "shopper@example.com"
    assert data["status"] == "submitted"

    # Verify conversation is marked as escalated in database
    await db_session.refresh(conversation)
    assert conversation.is_escalated is True

    # Verify audit system message was logged
    stmt = select(Message).where(Message.conversation_id == conversation.id)
    messages = list((await db_session.exec(stmt)).all())
    assert len(messages) >= 1
    system_msg = [m for m in messages if m.role == "system"][0]
    assert "shopper@example.com" in system_msg.content
    assert "Need manager approval for bulk order" in system_msg.content


@pytest.mark.asyncio
async def test_visitor_escalation_invalid_widget_key(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify escalation with non-existent widget key fails with 404."""
    payload = {
        "widget_key": "rd_live_nonexistent_key_123456",
        "conversation_id": str(uuid.uuid4()),
        "visitor_email": "test@example.com",
    }
    response = await client.post(
        "/api/v1/widget/chat/escalate",
        json=payload,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_visitor_escalation_domain_not_authorized(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify escalation from unwhitelisted domain fails with 403."""
    org_id = uuid.uuid4()
    widget_key = f"rd_live_{uuid.uuid4().hex}"

    org = Organization(id=org_id, display_name="Domain Locked Store")
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key=widget_key,
        allowed_origins="mystore.com",
    )
    db_session.add(org)
    db_session.add(widget)
    await db_session.commit()

    payload = {
        "widget_key": widget_key,
        "conversation_id": str(uuid.uuid4()),
        "visitor_email": "test@example.com",
    }
    response = await client.post(
        "/api/v1/widget/chat/escalate",
        json=payload,
        headers={"Origin": "https://unauthorized-site.com"},
    )
    assert response.status_code == 403
    assert "Domain not authorized" in response.text


@pytest.mark.asyncio
async def test_visitor_escalation_conversation_not_found(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify escalation for non-existent conversation returns 404."""
    org_id = uuid.uuid4()
    widget_key = f"rd_live_{uuid.uuid4().hex}"

    org = Organization(id=org_id, display_name="Store")
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key=widget_key,
        allowed_origins="*",
    )
    db_session.add(org)
    db_session.add(widget)
    await db_session.commit()

    payload = {
        "widget_key": widget_key,
        "conversation_id": str(uuid.uuid4()),
        "visitor_email": "test@example.com",
    }
    response = await client.post(
        "/api/v1/widget/chat/escalate",
        json=payload,
    )
    assert response.status_code == 404
    assert "Conversation not found" in response.text
