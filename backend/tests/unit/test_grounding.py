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
    """Verify confidence threshold is calibrated to 0.55 per technical specifications."""
    assert SIMILARITY_THRESHOLD == 0.55


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
