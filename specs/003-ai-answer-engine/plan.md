# Implementation Plan: AI Answer Engine & Streaming Chat API

**Branch**: `003-ai-answer-engine` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-ai-answer-engine/spec.md`

---

## Summary

Implements the public, unauthenticated Visitor Chat API (`POST /api/v1/widget/chat`) with real-time token-by-token Server-Sent Events (SSE) streaming. Features strict tenant-isolated vector retrieval from Qdrant (`organization_id` payload filter), provider-agnostic OpenAI-compatible LLM streaming (supporting Mistral, OpenAI, Cohere, Groq via `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`), two-phase anti-hallucination prompt grounding with polite fallbacks, 10-message multi-turn conversation memory, and abuse prevention (sliding-window IP rate limiter of 30 req/min and 1,000-character input bounds).

---

## Technical Context

**Language/Version**: Python 3.12+ (managed via `uv`)  
**Primary Dependencies**: `fastapi`, `sqlmodel`, `httpx`, `asyncpg`, `qdrant-client`, `tiktoken`  
**Storage**: PostgreSQL / Neon (conversations & messages history), Qdrant Cloud (`resolvdesk_documents` vector store)  
**Testing**: `pytest`, `pytest-asyncio`, `httpx.AsyncClient`  
**Target Platform**: Linux / Containerized Server & Local Windows / macOS Dev  
**Project Type**: Web Service API (FastAPI Resource Server)  
**Performance Goals**: Time-to-first-token < 2 seconds for 95% of queries; supports 100 concurrent visitor conversations per organization  
**Constraints**: Zero cross-tenant data leakage; zero hallucinated facts; rate limited at 30 req/min per IP; max 1,000 chars per message  
**Scale/Scope**: Up to 100 concurrent visitor sessions per org; 90-day retention for chat history  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [X] **Principle I: Strict Multi-Tenant Isolation**: Semantic vector search in Qdrant strictly filters by `organization_id`. Conversations and messages tables link directly to `organization_id`.
- [X] **Principle II: Grounded AI & Zero Hallucination**: Strict system prompt enforces answers derived solely from retrieved document chunks. Confidence gate triggers standard polite fallback if unanswerable.
- [X] **Principle III: Continuous Human Safety Net**: Polite fallback offers human escalation whenever document chunks do not contain the answer.
- [X] **Principle IV: Frictionless & Secure Widget**: Unauthenticated visitor chat validated via read-only `widget_key` (including grace keys). Protected by 30 req/min IP rate limiter and 1,000-character bounds.
- [X] **Principle V: Layered Architecture & Boundary Defense**: Strict router (`routers/widget.py` or `routers/chat.py`) -> service (`chat_service.py`) -> repository (`conversation_repo.py`, `vector_repo.py`) separation. Input validation at Pydantic schema layer.
- [X] **Principle VI: Provider-Agnostic AI Layer**: Unified OpenAI-compatible chat completion interface reading `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` from environment settings. Zero vendor SDK lock-in.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-ai-answer-engine/
├── plan.md              # This implementation plan
├── research.md          # Technical research and architectural decisions
├── data-model.md        # Relational models and conversation lifecycle
├── quickstart.md        # Runnable verification scenarios and test commands
├── contracts/           # API contracts (SSE streaming format & error codes)
│   └── chat_api.md
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
backend/
├── alembic/
│   └── versions/
│       └── 003_create_conversations_and_messages.py  # DB migration for chat entities
├── app/
│   ├── core/
│   │   ├── config.py             # LLM settings (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL)
│   │   └── rate_limiter.py       # In-memory sliding-window IP rate limiter
│   ├── models/
│   │   ├── conversation.py       # Conversation and Message SQLModel entities
│   │   └── __init__.py           # Export models
│   ├── repos/
│   │   └── conversation_repo.py  # Multi-turn history and session repository
│   ├── schemas/
│   │   └── chat.py               # ChatRequest, ChatMessageRead schemas
│   ├── services/
│   │   └── chat_service.py       # RAG retrieval, prompt grounding & SSE streaming engine
│   └── routers/
│       └── widget.py             # Mount POST /api/v1/widget/chat endpoint
└── tests/
    ├── contract/
    │   └── test_chat_contract.py # Contract tests (SSE format, 404, 422, 429)
    └── integration/
        └── test_chat_rag.py      # End-to-end RAG retrieval, grounding, and memory tests
```

**Structure Decision**: Monorepo backend layout maintaining standard three-layer architecture (router -> service -> repo) matching established patterns in Feature 001 and Feature 002.

---

## Complexity Tracking

| Aspect | Justification |
| :--- | :--- |
| **Direct HTTP Streaming vs Agent Framework** | A direct OpenAI-compatible HTTP streaming client was selected over heavy agent frameworks because this phase requires a single-turn RAG completion (`prompt + chunks -> tokens`). Direct streaming is faster, lighter, and ensures 100% provider-agnostic compliance (Principle VI). |
| **Sliding-Window IP Rate Limiter** | An in-memory sliding window prevents automated scraping and runaway LLM costs without adding external cache dependencies (like Redis) for v1. |
