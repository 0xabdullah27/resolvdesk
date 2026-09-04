# Quickstart: AI Answer Engine & Streaming Chat API

**Feature**: `003-ai-answer-engine`  
**Date**: 2026-09-04  
**Status**: Completed  

---

## 1. Prerequisites & Environment Setup

Ensure your `backend/.env` contains the LLM completion and Qdrant settings:

```env
# LLM Provider (e.g., Mistral, OpenAI, Groq)
LLM_BASE_URL=https://api.mistral.ai/v1
LLM_API_KEY=your-actual-llm-api-key
LLM_MODEL=mistral-small-latest

# Qdrant Vector DB & Cohere Embeddings
QDRANT_URL=https://<your-cluster-id>.eu-central-1-0.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION_NAME=resolvdesk_documents
EMBEDDING_API_BASE=https://api.cohere.com/v2
EMBEDDING_API_KEY=your-cohere-api-key
EMBEDDING_MODEL_NAME=embed-english-v3.0
EMBEDDING_DIMENSION=1024
```

---

## 2. Runnable Verification Scenarios

### Scenario 1: Ask an On-Topic Grounded Question (Streamed SSE)
**Action**: Send a question matching an ingested document (e.g. Return Policy):

```bash
curl -N -X POST http://localhost:8000/api/v1/widget/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "widget_key": "YOUR_ORGANIZATION_WIDGET_KEY",
    "message": "Can I return items after 2 weeks?"
  }'
```

**Expected Result**:
- Immediate HTTP 200 with `Content-Type: text/event-stream`.
- Receives progressive `event: token` events containing the answer.
- Answer accurately quotes policy details without fabrication.
- Receives `event: done` with the assigned `conversation_id`.

---

### Scenario 2: Ask an Off-Topic Question (Verify Zero-Hallucination Fallback)
**Action**: Ask a question not in the knowledge base:

```bash
curl -N -X POST http://localhost:8000/api/v1/widget/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "widget_key": "YOUR_ORGANIZATION_WIDGET_KEY",
    "message": "What is the capital of France?"
  }'
```

**Expected Result**:
- Stream outputs the standardized fallback:
  > *"I don't have information about that in my knowledge base. Would you like me to connect you with a human who can help?"*
- Zero hallucination or irrelevant trivia.

---

### Scenario 3: Multi-Turn Conversation Memory
**Action**: Send a follow-up question referencing the previous turn:

```bash
curl -N -X POST http://localhost:8000/api/v1/widget/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "widget_key": "YOUR_ORGANIZATION_WIDGET_KEY",
    "conversation_id": "<CONVERSATION_ID_FROM_SCENARIO_1>",
    "message": "Does that apply to sale items too?"
  }'
```

**Expected Result**:
- Assistant resolves "that" from the prior turn's topic and answers accurately in context.

---

### Scenario 4: Rate Limiting & Input Guardrails
**Action**: Submit a message exceeding 1,000 characters:

```bash
curl -X POST http://localhost:8000/api/v1/widget/chat \
  -H "Content-Type: application/json" \
  -d '{
    "widget_key": "YOUR_ORGANIZATION_WIDGET_KEY",
    "message": "'$(printf 'A%.0s' {1..1001})'"
  }'
```

**Expected Result**:
- HTTP 422 Unprocessable Content.

---

## 3. Automated Test Execution

Run the contract, unit, and integration test suites:

```bash
# Contract tests for widget chat endpoint & rate limiting
uv run pytest tests/contract/test_chat_contract.py -v

# Integration tests for Qdrant retrieval, RAG grounding, and multi-turn memory
uv run pytest tests/integration/test_chat_rag.py -v

# Full suite verification
uv run pytest tests/ -v
```
