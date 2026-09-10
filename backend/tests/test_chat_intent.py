import pytest
from app.schemas.intent import MessageIntent
from app.services.intent_service import intent_service


def test_clean_text():
    assert intent_service.clean_text("  Hello, World!  ") == "hello, world"
    assert intent_service.clean_text("...Hi???") == "hi"
    assert intent_service.clean_text("") == ""


def test_greeting_detection():
    # Standalone common greetings
    res = intent_service.classify_fast_tier("Hello!", business_name="Acme Corp")
    assert res is not None
    assert res.intent == MessageIntent.GREETING
    assert res.tier == 1
    assert res.is_chitchat is True
    assert "Acme Corp" in res.response_override

    res_hi = intent_service.classify_fast_tier("Hi there", business_name="Acme Corp")
    assert res_hi is not None
    assert res_hi.intent == MessageIntent.GREETING

    # Multilingual
    res_es = intent_service.classify_fast_tier("Hola", business_name="Acme Corp")
    assert res_es is not None
    assert res_es.intent == MessageIntent.GREETING

    res_ar = intent_service.classify_fast_tier("Salam", business_name="Acme Corp")
    assert res_ar is not None
    assert res_ar.intent == MessageIntent.GREETING


def test_custom_greeting_override():
    custom = "Welcome to our VIP store! How can we assist you?"
    res = intent_service.classify_fast_tier("Hey", business_name="Acme Corp", custom_greeting=custom)
    assert res is not None
    assert res.intent == MessageIntent.GREETING
    assert res.response_override == custom


def test_gratitude_detection():
    res = intent_service.classify_fast_tier("Thank you so much!", business_name="Acme Corp")
    assert res is not None
    assert res.intent == MessageIntent.GRATITUDE
    assert res.tier == 1
    assert res.is_chitchat is True
    assert "welcome" in res.response_override.lower()


def test_farewell_detection():
    res = intent_service.classify_fast_tier("Goodbye, have a great day", business_name="Acme Corp")
    assert res is not None
    assert res.intent == MessageIntent.FAREWELL
    assert res.tier == 1
    assert res.is_chitchat is True


def test_bot_identity_detection():
    res = intent_service.classify_fast_tier("Are you an AI or a real person?", business_name="Acme Corp")
    assert res is not None
    assert res.intent == MessageIntent.BOT_IDENTITY
    assert res.tier == 1
    assert "Acme Corp" in res.response_override

    res_who = intent_service.classify_fast_tier("Who are you?", business_name="Acme Corp")
    assert res_who is not None
    assert res_who.intent == MessageIntent.BOT_IDENTITY


def test_explicit_escalation_detection():
    res = intent_service.classify_fast_tier("I want to speak to a human agent right now", business_name="Acme Corp")
    assert res is not None
    assert res.intent == MessageIntent.HUMAN_ESCALATION
    assert res.tier == 1
    assert res.suggest_escalation is True
    assert "contact details" in res.response_override.lower()

    # Frustration expression
    res_frust = intent_service.classify_fast_tier("This bot is useless, connect me with a person", business_name="Acme Corp")
    assert res_frust is not None
    assert res_frust.intent == MessageIntent.HUMAN_ESCALATION
    assert res_frust.suggest_escalation is True


def test_hybrid_inquiry_disambiguation():
    # Greets, but contains substantive question
    res = intent_service.classify_fast_tier("Hello! Do you offer international shipping to Canada?", business_name="Acme Corp")
    assert res is not None
    assert res.intent == MessageIntent.HYBRID_INQUIRY
    assert res.tier == 2
    assert res.is_chitchat is False  # Must not bypass RAG retrieval


def test_out_of_scope_deflection_formatting():
    deflection_with_topics = intent_service.generate_out_of_scope_deflection(
        business_name="Acme Corp",
        sample_topics=["Shipping Policy.pdf", "Pricing FAQ.md"],
    )
    assert "Acme Corp" in deflection_with_topics
    assert "'Shipping Policy.pdf'" in deflection_with_topics
    assert "'Pricing FAQ.md'" in deflection_with_topics

    deflection_no_topics = intent_service.generate_out_of_scope_deflection(
        business_name="Acme Corp",
        sample_topics=None,
    )
    assert "Acme Corp" in deflection_no_topics
