# Quickstart & Validation Guide: Conversational Intent & Chit-Chat Handling

**Feature**: `014-chat-intent-handling`  
**Date**: 2026-09-10  
**Status**: Active

## 1. Overview
This guide provides runnable curl requests and automated pytest scenarios to verify that ResolvDesk handles visitor greetings, courtesies, off-topic questions, and human escalation seamlessly without false "document not found" errors.

---

## 2. Prerequisites
- Backend service running locally: `http://localhost:8000`
- An existing organization with an active `widget_key` (e.g., `wdgt_test_key`)
- Database migrated and Qdrant online.

---

## 3. Test Scenarios

### Scenario 1: Standalone Greeting ("Hello")
**Input**:
```bash
curl -N -X POST "http://localhost:8000/api/v1/widget/chat" \
  -H "Content-Type: application/json" \
  -d '{"widget_key": "YOUR_WIDGET_KEY", "message": "Hello!"}'
```
**Expected Outcome**:
- SSE stream emits `event: start`.
- Streams friendly welcome greeting: *"Hello! Welcome to [Org Name]. How can I assist you today?"*.
- **Does NOT** emit `event: escalate_suggestion`.
- **Does NOT** say *"I don't have information about that in my knowledge base"*.
- Total response latency: `< 100ms`.

---

### Scenario 2: Courtesy / Gratitude ("Thank you so much!")
**Input**:
```bash
curl -N -X POST "http://localhost:8000/api/v1/widget/chat" \
  -H "Content-Type: application/json" \
  -d '{"widget_key": "YOUR_WIDGET_KEY", "message": "Thank you so much, that was helpful!"}'
```
**Expected Outcome**:
- Streams: *"You're very welcome! Let me know if you need anything else."*.
- Appends message with metadata `{"intent": "GRATITUDE"}`.

---

### Scenario 3: Explicit Human Escalation Request ("I want to talk to a human")
**Input**:
```bash
curl -N -X POST "http://localhost:8000/api/v1/widget/chat" \
  -H "Content-Type: application/json" \
  -d '{"widget_key": "YOUR_WIDGET_KEY", "message": "I want to speak to a real person right now"}'
```
**Expected Outcome**:
- Streams empathetic de-escalation response.
- Emits `event: escalate_suggestion` with `{"suggest_escalation": true, "reason": "explicit_request"}`.
- Triggers widget contact capture form.

---

### Scenario 4: Out-of-Scope Deflection with Document Topics
**Input**:
```bash
curl -N -X POST "http://localhost:8000/api/v1/widget/chat" \
  -H "Content-Type: application/json" \
  -d '{"widget_key": "YOUR_WIDGET_KEY", "message": "Can you write a python script for web scraping?"}'
```
**Expected Outcome**:
- Streams polite deflection: *"I can only assist with inquiries regarding [Org Name] (such as our shipping policy, pricing, or account support). How can I help you with our services today?"*.
- Intent classified as `OUT_OF_SCOPE`.
- No false document fallback message.

---

## 4. Automated Test Suite
Run backend unit and integration tests:
```bash
pytest backend/tests/test_chat_intent_service.py -v
```
*(Note: Do not run tests until explicitly requested by the user per user instructions)*
