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
