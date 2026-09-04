import json
import uuid
import pytest
from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.widget import WidgetConfiguration
from app.models.conversation import Conversation, Message
from app.core.rate_limiter import chat_rate_limiter


@pytest.fixture(autouse=True)
async def reset_rate_limiter():
    await chat_rate_limiter.reset()


@pytest.mark.asyncio
async def test_full_visitor_chat_rag_flow(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    """Integration test verifying widget auth, tenant-isolated vector retrieval, LLM streaming, and message persistence."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="RAG Store")
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_ragtest123456789012345",
    )
    db_session.add(org)
    db_session.add(widget)
    await db_session.commit()

    captured_filters = []

    # Mock embedding generator
    from app.services import embedding_service
    async def mock_get_embedding(text: str):
        return [0.05] * 1536
    monkeypatch.setattr(embedding_service.embedding_service, "get_embedding", mock_get_embedding)

    # Mock vector retrieval
    from app.repos.vector_repo import vector_repo
    async def mock_search_tenant_chunks(organization_id, query_vector, limit=5):
        captured_filters.append(organization_id)
        return [
            {
                "id": str(uuid.uuid4()),
                "score": 0.88,
                "payload": {
                    "text": "Shipping is free for orders over $50.",
                },
            }
        ]
    monkeypatch.setattr(vector_repo, "search_tenant_chunks", mock_search_tenant_chunks)

    # Mock LLM streaming
    from app.services import llm_service
    async def mock_stream_completion(messages, *args, **kwargs):
        tokens = ["Free ", "shipping ", "applies ", "to ", "orders ", "over ", "$50."]
        for token in tokens:
            yield token
    monkeypatch.setattr(llm_service.llm_service, "stream_completion", mock_stream_completion)

    # First turn (new conversation)
    payload_1 = {
        "widget_key": "rd_live_ragtest123456789012345",
        "message": "Do you offer free shipping?",
        "conversation_id": None,
    }

    response_1 = await client.post("/api/v1/widget/chat", json=payload_1)
    assert response_1.status_code == 200
    assert "text/event-stream" in response_1.headers.get("content-type", "")

    # Verify tenant isolation in Qdrant query filter
    assert len(captured_filters) == 1
    assert captured_filters[0] == org_id

    # Parse conversation_id from event: start or done
    text_1 = response_1.text
    conv_id = None
    for line in text_1.split("\n"):
        if line.startswith("data: ") and "conversation_id" in line:
            data = json.loads(line.replace("data: ", ""))
            conv_id = data.get("conversation_id")
            if conv_id:
                break

    assert conv_id is not None
    conv_uuid = uuid.UUID(conv_id)

    # Verify conversation exists in DB
    conv = await db_session.get(Conversation, conv_uuid)
    assert conv is not None
    assert conv.organization_id == org_id

    # Verify 2 messages stored in DB: visitor + assistant
    msgs = (await db_session.exec(
        select(Message).where(Message.conversation_id == conv_uuid).order_by(Message.created_at.asc())
    )).all()
    assert len(msgs) == 2
    assert msgs[0].role == "visitor"
    assert msgs[0].content == "Do you offer free shipping?"
    assert msgs[1].role == "assistant"
    assert "Free shipping applies" in msgs[1].content

    # Second turn (follow up to same conversation)
    payload_2 = {
        "widget_key": "rd_live_ragtest123456789012345",
        "message": "What about international shipping?",
        "conversation_id": conv_id,
    }

    response_2 = await client.post("/api/v1/widget/chat", json=payload_2)
    assert response_2.status_code == 200

    # Verify conversation still exists and has 4 messages now
    msgs_after = (await db_session.exec(
        select(Message).where(Message.conversation_id == conv_uuid).order_by(Message.created_at.asc())
    )).all()
    assert len(msgs_after) == 4
    assert msgs_after[2].role == "visitor"
    assert msgs_after[2].content == "What about international shipping?"
    assert msgs_after[3].role == "assistant"


@pytest.mark.asyncio
async def test_chat_unindexed_or_off_topic_fallback(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    """Verify questions with zero or low-confidence vector matches return standard fallback."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Strict Store")
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_fallbacktest1234567890",
    )
    db_session.add(org)
    db_session.add(widget)
    await db_session.commit()

    # Mock low score (below 0.55 threshold)
    from app.repos.vector_repo import vector_repo
    async def mock_search_tenant_chunks(*args, **kwargs):
        return [
            {
                "id": str(uuid.uuid4()),
                "score": 0.42,
                "payload": {"text": "Irrelevant chunk about office furniture."},
            }
        ]
    monkeypatch.setattr(vector_repo, "search_tenant_chunks", mock_search_tenant_chunks)

    from app.services import embedding_service
    async def mock_get_embedding(text: str):
        return [0.01] * 1536
    monkeypatch.setattr(embedding_service.embedding_service, "get_embedding", mock_get_embedding)

    payload = {
        "widget_key": "rd_live_fallbacktest1234567890",
        "message": "How do I bake sourdough bread?",
        "conversation_id": None,
    }

    response = await client.post("/api/v1/widget/chat", json=payload)
    assert response.status_code == 200

    body = response.text
    tokens = [
        json.loads(line[6:])["token"]
        for line in body.splitlines()
        if line.startswith("data: ") and '"token":' in line
    ]
    reconstructed_text = "".join(tokens).strip()
    assert "I don't have information about that in my knowledge base." in reconstructed_text
    assert "Would you like me to connect you with a human who can help?" in reconstructed_text


@pytest.mark.asyncio
async def test_multi_turn_pronoun_resolution(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    """Verify follow-up messages include last 10 conversational turns in prompt context."""
    org_id = uuid.uuid4()
    org = Organization(id=org_id, display_name="Watch Store")
    widget = WidgetConfiguration(
        id=uuid.uuid4(),
        organization_id=org_id,
        widget_key="rd_live_multiturntest1234567890",
    )
    conv = Conversation(
        id=uuid.uuid4(),
        organization_id=org_id,
    )
    msg1 = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="visitor",
        content="What is your warranty for smart watches?",
    )
    msg2 = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content="Smart watches include a 2-year manufacturer warranty.",
    )
    db_session.add(org)
    db_session.add(widget)
    db_session.add(conv)
    db_session.add(msg1)
    db_session.add(msg2)
    await db_session.commit()

    captured_prompts = []

    # Mock vector retrieval
    from app.repos.vector_repo import vector_repo
    async def mock_search_tenant_chunks(*args, **kwargs):
        return [
            {
                "id": str(uuid.uuid4()),
                "score": 0.90,
                "payload": {"text": "Water damage is covered up to 50 meters depth."},
            }
        ]
    monkeypatch.setattr(vector_repo, "search_tenant_chunks", mock_search_tenant_chunks)

    from app.services import embedding_service
    async def mock_get_embedding(text: str):
        return [0.02] * 1536
    monkeypatch.setattr(embedding_service.embedding_service, "get_embedding", mock_get_embedding)

    # Mock LLM streaming and capture prompt messages
    from app.services import llm_service
    async def mock_stream_completion(messages, *args, **kwargs):
        captured_prompts.append(messages)
        yield "Yes, water damage is covered."
    monkeypatch.setattr(llm_service.llm_service, "stream_completion", mock_stream_completion)

    payload = {
        "widget_key": "rd_live_multiturntest1234567890",
        "message": "Does it cover water damage?",
        "conversation_id": str(conv.id),
    }

    response = await client.post("/api/v1/widget/chat", json=payload)
    assert response.status_code == 200

    assert len(captured_prompts) == 1
    sent_messages = captured_prompts[0]

    # Verify message sequence: system prompt, prior visitor msg, prior assistant msg, new user msg
    assert sent_messages[0]["role"] == "system"
    # Find user turn 1
    user_msgs = [m for m in sent_messages if m["role"] == "user"]
    assert len(user_msgs) == 2
    assert user_msgs[0]["content"] == "What is your warranty for smart watches?"
    assert user_msgs[1]["content"] == "Does it cover water damage?"

    asst_msgs = [m for m in sent_messages if m["role"] == "assistant"]
    assert len(asst_msgs) == 1
    assert asst_msgs[0]["content"] == "Smart watches include a 2-year manufacturer warranty."
