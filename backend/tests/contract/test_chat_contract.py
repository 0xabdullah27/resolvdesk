import json
import uuid
import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from app.models.widget import WidgetConfiguration
from app.models.conversation import Conversation, Message
from app.core.rate_limiter import chat_rate_limiter


@pytest.fixture(autouse=True)
async def reset_rate_limiter():
    """Ensure rate limiter is clean before each contract test."""
    await chat_rate_limiter.reset()


@pytest.mark.asyncio
async def test_chat_stream_contract_success(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    """Verify POST /api/v1/widget/chat returns 200 text/event-stream with start, token, and done events."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Test Store")
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_valid12345678901234567890",
    )
    db_session.add(org)
    db_session.add(widget)
    await db_session.commit()

    # Mock LLM stream generator
    async def mock_stream_completion(*args, **kwargs):
        tokens = ["Our ", "return ", "policy ", "is ", "30 ", "days."]
        for token in tokens:
            yield token

    from app.services import llm_service
    monkeypatch.setattr(llm_service.llm_service, "stream_completion", mock_stream_completion)

    # Mock Vector retrieval
    async def mock_search_tenant_chunks(*args, **kwargs):
        return [
            {
                "id": str(uuid.uuid4()),
                "score": 0.85,
                "payload": {
                    "text": "We offer a 30-day money-back guarantee on all products.",
                },
            }
        ]

    from app.repos.vector_repo import vector_repo
    monkeypatch.setattr(vector_repo, "search_tenant_chunks", mock_search_tenant_chunks)

    # Also mock embedding generator
    from app.services import embedding_service
    async def mock_get_embedding(*args, **kwargs):
        return [0.1] * 1536
    monkeypatch.setattr(embedding_service.embedding_service, "get_embedding", mock_get_embedding)

    payload = {
        "widget_key": "rd_live_valid12345678901234567890",
        "message": "What is your return policy?",
        "conversation_id": None,
    }

    response = await client.post("/api/v1/widget/chat", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    body = response.text
    assert "event: start" in body
    assert "event: token" in body
    assert "event: done" in body

    # Verify message and conversation were created in DB
    convs = (await db_session.exec(
        Conversation.__table__.select().where(Conversation.organization_id == org_id)
    )).all()
    assert len(convs) >= 1


@pytest.mark.asyncio
async def test_chat_invalid_widget_key_returns_404(
    client: AsyncClient,
):
    """Verify POST /api/v1/widget/chat returns 404 for unknown or nonexistent widget key."""
    payload = {
        "widget_key": "rd_live_unknown_key_1234567890",
        "message": "Hello there!",
    }
    response = await client.post("/api/v1/widget/chat", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "Invalid or expired widget key."


@pytest.mark.asyncio
async def test_chat_message_validation_bounds_422(
    client: AsyncClient,
):
    """Verify POST /api/v1/widget/chat returns 422 for blank or oversized (>1000 chars) messages."""
    # Blank message
    resp_blank = await client.post(
        "/api/v1/widget/chat",
        json={"widget_key": "rd_live_valid1234567890", "message": "   "},
    )
    assert resp_blank.status_code == 422

    # Oversized message (> 1000 chars)
    resp_large = await client.post(
        "/api/v1/widget/chat",
        json={"widget_key": "rd_live_valid1234567890", "message": "A" * 1001},
    )
    assert resp_large.status_code == 422


@pytest.mark.asyncio
async def test_get_conversation_history_contract(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify GET /api/v1/widget/conversations/{conversation_id} re-hydrates messages."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="History Store")
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_historytest1234567890123",
    )
    conv = Conversation(
        id=uuid.uuid4(),
        organization_id=org_id,
    )
    msg1 = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="visitor",
        content="What is your return policy?",
    )
    msg2 = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Our return policy is 30 days.",
    )
    db_session.add(org)
    db_session.add(widget)
    db_session.add(conv)
    db_session.add(msg1)
    db_session.add(msg2)
    await db_session.commit()

    # Success scenario
    resp = await client.get(
        f"/api/v1/widget/conversations/{conv.id}",
        params={"widget_key": "rd_live_historytest1234567890123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["conversation_id"] == str(conv.id)
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "visitor"
    assert data["messages"][1]["role"] == "assistant"

    # Non-existent conversation
    resp_not_found = await client.get(
        f"/api/v1/widget/conversations/{uuid.uuid4()}",
        params={"widget_key": "rd_live_historytest1234567890123"},
    )
    assert resp_not_found.status_code == 404


@pytest.mark.asyncio
async def test_chat_rate_limiting_429(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    """Verify exceeding rate limit triggers 429 with Retry-After header."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Rate Limited Store")
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_ratelimit1234567890123",
    )
    db_session.add(org)
    db_session.add(widget)
    await db_session.commit()

    from app.repos.vector_repo import vector_repo
    async def mock_search_tenant_chunks(*args, **kwargs):
        return []
    monkeypatch.setattr(vector_repo, "search_tenant_chunks", mock_search_tenant_chunks)

    from app.services import embedding_service
    async def mock_get_embedding(text: str):
        return [0.0] * 1536
    monkeypatch.setattr(embedding_service.embedding_service, "get_embedding", mock_get_embedding)

    # Temporarily set max_requests to 2 for quick verification
    original_max = chat_rate_limiter.max_requests
    chat_rate_limiter.max_requests = 2
    try:
        payload = {
            "widget_key": "rd_live_ratelimit1234567890123",
            "message": "First message",
        }
        r1 = await client.post("/api/v1/widget/chat", json=payload)
        assert r1.status_code == 200

        r2 = await client.post("/api/v1/widget/chat", json=payload)
        assert r2.status_code == 200

        # 3rd request exceeds limit
        r3 = await client.post("/api/v1/widget/chat", json=payload)
        assert r3.status_code == 429
        assert "retry-after" in r3.headers
        assert r3.json()["detail"] == "Rate limit exceeded. Please slow down and try again in a moment."
    finally:
        chat_rate_limiter.max_requests = original_max


@pytest.mark.asyncio
async def test_chat_suspended_organization_403(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify chat is blocked with 403 when organization owner is suspended."""
    org_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Suspended Store")
    owner = Owner(
        id=owner_id,
        organization_id=org_id,
        email="suspended@example.com",
        full_name="Suspended Owner",
        status=OwnerStatus.SUSPENDED.value,
    )
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_suspended123456789012",
    )
    db_session.add(org)
    db_session.add(owner)
    db_session.add(widget)
    await db_session.commit()

    payload = {
        "widget_key": "rd_live_suspended123456789012",
        "message": "Are you open?",
    }
    response = await client.post("/api/v1/widget/chat", json=payload)
    assert response.status_code == 403
    assert response.json()["detail"] == "Widget is temporarily unavailable."


@pytest.mark.asyncio
async def test_chat_rotated_key_during_grace_period(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    """Verify prior widget key is accepted during the active rotation grace period."""
    import datetime
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Grace Store")
    now = datetime.datetime.now(datetime.timezone.utc)
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_newkey12345678901234567",
        previous_widget_key="rd_live_oldkey12345678901234567",
        grace_expires_at=now + datetime.timedelta(hours=24),
    )
    db_session.add(org)
    db_session.add(widget)
    await db_session.commit()

    from app.repos.vector_repo import vector_repo
    async def mock_search_tenant_chunks(*args, **kwargs):
        return []
    monkeypatch.setattr(vector_repo, "search_tenant_chunks", mock_search_tenant_chunks)

    from app.services import embedding_service
    async def mock_get_embedding(text: str):
        return [0.0] * 1536
    monkeypatch.setattr(embedding_service.embedding_service, "get_embedding", mock_get_embedding)

    payload = {
        "widget_key": "rd_live_oldkey12345678901234567",
        "message": "Testing rotated key in grace window",
    }
    response = await client.post("/api/v1/widget/chat", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
