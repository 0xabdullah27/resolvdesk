import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation, Message
from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from tests.conftest import issue_test_jwt


@pytest.mark.asyncio
async def test_analytics_overview_multi_tenant_isolation(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verifies that analytics overview strictly isolates metrics between tenants."""
    # 1. Setup Organization Alpha
    org_a = Organization(display_name="Organization Alpha")
    db_session.add(org_a)
    await db_session.flush()

    owner_a = Owner(
        email="owner_a_analytics@alpha.com",
        full_name="Alpha Analytics Owner",
        status=OwnerStatus.ACTIVE,
        organization_id=org_a.id,
    )
    db_session.add(owner_a)

    # Org A: 3 conversations: 2 automated, 1 escalated -> Deflection Rate: 66.7%
    conv_a1 = Conversation(organization_id=org_a.id, is_escalated=False)
    conv_a2 = Conversation(organization_id=org_a.id, is_escalated=False)
    conv_a3 = Conversation(
        organization_id=org_a.id,
        is_escalated=True,
        ticket_status="open",
        visitor_email="customer_a@example.com",
    )
    db_session.add_all([conv_a1, conv_a2, conv_a3])
    await db_session.flush()

    msg_a1 = Message(conversation_id=conv_a1.id, role="visitor", content="Where is my order?")
    msg_a2 = Message(conversation_id=conv_a1.id, role="assistant", content="Track it on our tracking page.")
    msg_a3 = Message(conversation_id=conv_a3.id, role="visitor", content="I want to speak with a human agent.")
    db_session.add_all([msg_a1, msg_a2, msg_a3])

    # 2. Setup Organization Beta
    org_b = Organization(display_name="Organization Beta")
    db_session.add(org_b)
    await db_session.flush()

    owner_b = Owner(
        email="owner_b_analytics@beta.com",
        full_name="Beta Analytics Owner",
        status=OwnerStatus.ACTIVE,
        organization_id=org_b.id,
    )
    db_session.add(owner_b)

    # Org B: 1 conversation, 1 escalated -> Deflection Rate: 0.0%
    conv_b1 = Conversation(
        organization_id=org_b.id,
        is_escalated=True,
        ticket_status="resolved",
        visitor_email="customer_b@example.com",
    )
    db_session.add(conv_b1)
    await db_session.flush()

    msg_b1 = Message(conversation_id=conv_b1.id, role="visitor", content="Beta confidential issue")
    db_session.add(msg_b1)
    await db_session.commit()

    # 3. Test Owner A Overview
    token_a = issue_test_jwt(sub=str(owner_a.id), email=owner_a.email, organization_id=str(org_a.id))
    res_a = await client.get(
        "/api/v1/analytics/overview",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["total_conversations"] == 3
    assert data_a["escalated_conversations"] == 1
    assert data_a["deflection_rate"] == 66.7
    assert data_a["open_tickets_count"] == 1
    assert data_a["resolved_tickets_count"] == 0
    assert data_a["total_messages"] == 3

    # 4. Test Owner B Overview
    token_b = issue_test_jwt(sub=str(owner_b.id), email=owner_b.email, organization_id=str(org_b.id))
    res_b = await client.get(
        "/api/v1/analytics/overview",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["total_conversations"] == 1
    assert data_b["escalated_conversations"] == 1
    assert data_b["deflection_rate"] == 0.0
    assert data_b["open_tickets_count"] == 0
    assert data_b["resolved_tickets_count"] == 1
    assert data_b["total_messages"] == 1


@pytest.mark.asyncio
async def test_analytics_daily_trends_zero_padding(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verifies that daily volume trends zero-fill dates within the selected range."""
    org = Organization(display_name="Trends Org")
    db_session.add(org)
    await db_session.flush()

    owner = Owner(
        email="trends_owner@trends.com",
        full_name="Trends Owner",
        status=OwnerStatus.ACTIVE,
        organization_id=org.id,
    )
    db_session.add(owner)

    conv = Conversation(organization_id=org.id, is_escalated=False)
    db_session.add(conv)
    await db_session.commit()

    token = issue_test_jwt(sub=str(owner.id), email=owner.email, organization_id=str(org.id))

    # Test 7 days range
    res_7 = await client.get(
        "/api/v1/analytics/trends?range_days=7",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_7.status_code == 200
    data_7 = res_7.json()
    assert data_7["range_days"] == 7
    assert len(data_7["points"]) == 7
    # Total chats across points should sum to at least 1
    total_chats = sum(p["total_conversations"] for p in data_7["points"])
    assert total_chats == 1


@pytest.mark.asyncio
async def test_analytics_knowledge_gaps_and_top_questions(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verifies that unanswered questions triggering fallback are captured as knowledge gaps."""
    org = Organization(display_name="Gaps Org")
    db_session.add(org)
    await db_session.flush()

    owner = Owner(
        email="gaps_owner@gaps.com",
        full_name="Gaps Owner",
        status=OwnerStatus.ACTIVE,
        organization_id=org.id,
    )
    db_session.add(owner)

    conv1 = Conversation(organization_id=org.id, is_escalated=False)
    conv2 = Conversation(organization_id=org.id, is_escalated=False)
    db_session.add_all([conv1, conv2])
    await db_session.flush()

    # Conversation 1: Fallback triggered
    msg1_q = Message(
        conversation_id=conv1.id,
        role="visitor",
        content="Do you ship to Antarctica?",
    )
    msg1_a = Message(
        conversation_id=conv1.id,
        role="assistant",
        content="I don't have information about that in my knowledge base. Would you like me to connect you with a human who can help?",
    )

    # Conversation 2: Answered normally
    msg2_q = Message(
        conversation_id=conv2.id,
        role="visitor",
        content="What are your support hours?",
    )
    msg2_a = Message(
        conversation_id=conv2.id,
        role="assistant",
        content="Our support hours are 9 AM to 5 PM EST Monday through Friday.",
    )
    db_session.add_all([msg1_q, msg1_a, msg2_q, msg2_a])
    await db_session.commit()

    token = issue_test_jwt(sub=str(owner.id), email=owner.email, organization_id=str(org.id))

    # 1. Test knowledge gaps
    res_gaps = await client.get(
        "/api/v1/analytics/knowledge-gaps",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_gaps.status_code == 200
    gaps_data = res_gaps.json()
    assert gaps_data["total"] == 1
    assert gaps_data["items"][0]["question"] == "Do you ship to Antarctica?"
    assert gaps_data["items"][0]["frequency"] == 1

    # 2. Test top questions
    res_top = await client.get(
        "/api/v1/analytics/top-questions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_top.status_code == 200
    top_data = res_top.json()
    assert top_data["total"] == 2
    questions = [item["question"] for item in top_data["items"]]
    assert "Do you ship to Antarctica?" in questions
    assert "What are your support hours?" in questions
