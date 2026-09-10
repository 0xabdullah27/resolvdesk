import pytest
from app.services.chat_service import (
    chat_service,
    FALLBACK_RESPONSE,
    SIMILARITY_THRESHOLD,
)


def test_build_system_prompt_structure_and_guardrails():
    """Verify system prompt enforces strict knowledge-base boundaries and exact fallback response."""
    bot_name = "ResolvBot"
    chunks = [
        "Refunds are processed within 5 business days.",
        "Items must be in original packaging.",
    ]

    prompt = chat_service.build_system_prompt(bot_name=bot_name, retrieved_chunks=chunks)

    assert bot_name in prompt
    assert "Refunds are processed within 5 business days." in prompt
    assert "Items must be in original packaging." in prompt
    assert FALLBACK_RESPONSE in prompt
    assert "STRICT INSTRUCTIONS" in prompt
    assert "Do NOT extrapolate, speculate, or draw from outside knowledge." in prompt


def test_similarity_threshold_constant():
    """Verify confidence threshold is calibrated and matches configured settings."""
    from app.core.config import settings
    assert SIMILARITY_THRESHOLD == settings.RAG_SIMILARITY_THRESHOLD
    assert 0.0 < SIMILARITY_THRESHOLD < 1.0


def test_is_origin_allowed_whitelisting():
    """Verify domain origin whitelisting logic for widget security."""
    from app.services.chat_service import is_origin_allowed

    # Wildcard allows all
    assert is_origin_allowed("https://anywhere.com", "*") is True
    assert is_origin_allowed(None, "*") is True

    # Exact domain matching
    assert is_origin_allowed("https://mystore.com", "mystore.com") is True
    assert is_origin_allowed("http://mystore.com", "mystore.com") is True
    assert is_origin_allowed("https://evil.com", "mystore.com") is False
    assert is_origin_allowed(None, "mystore.com") is False

    # Multi-domain list
    allowed = "mystore.com, localhost:3000, *.myshopify.com"
    assert is_origin_allowed("https://mystore.com", allowed) is True
    assert is_origin_allowed("http://localhost:3000", allowed) is True
    assert is_origin_allowed("https://store1.myshopify.com", allowed) is True
    assert is_origin_allowed("https://phishing.com", allowed) is False


def test_build_fallback_prompt_structure():
    """Verify smart fallback prompt instructs LLM on greetings, frustration, and anti-hallucination boundaries."""
    prompt = chat_service.build_fallback_prompt(business_name="Acme Corp")
    assert "Acme Corp" in prompt
    assert "STRICT INSTRUCTIONS" in prompt
    assert FALLBACK_RESPONSE in prompt
    assert "apologize with empathy" in prompt.lower()


def test_contextualize_query_enrichment():
    """Verify short follow-up messages are contextualized with preceding visitor question."""
    from app.models.conversation import Message
    import uuid

    conv_id = uuid.uuid4()
    history = [
        Message(id=uuid.uuid4(), conversation_id=conv_id, role="visitor", content="What is your return policy?"),
        Message(id=uuid.uuid4(), conversation_id=conv_id, role="assistant", content="Returns are free within 30 days."),
    ]

    # Short follow-up question
    enriched_short = chat_service.contextualize_query("How much does it cost?", history)
    assert "What is your return policy?" in enriched_short
    assert "How much does it cost?" in enriched_short

    # Pronoun follow-up question
    enriched_pronoun = chat_service.contextualize_query("Does it apply to international orders?", history)
    assert "What is your return policy?" in enriched_pronoun
    assert "Does it apply to international orders?" in enriched_pronoun

    # Long independent question should NOT be modified
    long_query = "Can you provide the comprehensive quarterly financial report breakdown for the enterprise tier?"
    independent = chat_service.contextualize_query(long_query, history)
    assert independent == long_query

