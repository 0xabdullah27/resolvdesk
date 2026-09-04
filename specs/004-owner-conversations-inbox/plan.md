# Implementation Plan: Owner Conversations Inbox & Analytics API

**Branch**: `004-owner-conversations-inbox` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-owner-conversations-inbox/spec.md`

---

## Summary

Implements the authenticated **Owner Conversations Inbox & Analytics API** (`/api/v1/conversations`) enabling business owners to monitor, paginate, inspect, and analyze all customer conversations conducted via their organization's chat widget. Enforces strict query-level tenant isolation, provides chronological message transcript retrieval with role indicators, calculates real-time aggregate conversation statistics, and supports escalation filtering.

---

## Technical Context

**Language/Version**: Python 3.12+ (managed via `uv`)  
**Primary Dependencies**: `fastapi`, `sqlmodel`, `pydantic`, `asyncpg`, `pyjwt`  
**Storage**: PostgreSQL / Neon (`conversations` and `messages` tables, pre-existing with foreign key indexes)  
**Testing**: `pytest`, `pytest-asyncio`, `httpx.AsyncClient`  
**Target Platform**: Linux / Containerized Server & Local Windows / macOS Dev  
**Project Type**: Web Service API (FastAPI Resource Server)  
**Performance Goals**: Inbox listing and transcript retrieval respond in < 150ms for organizations with up to 10,000 conversations  
**Constraints**: Zero cross-tenant data leakage (Principle I); authenticated via Better Auth RS256 JWT (`CurrentOwner`); three-layer architecture (`router` -> `service` -> `repo`)  
**Scale/Scope**: Up to 10,000 conversations per organization with full 90-day history  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [X] **Principle I: Strict Multi-Tenant Isolation**: Every SQL query (`SELECT ... FROM conversations WHERE organization_id = :org_id`) enforces tenant isolation at the database query level. Cross-tenant access attempts return HTTP 404.
- [X] **Principle II: Grounded AI & Zero Hallucination**: N/A for inbox API (displays recorded conversation history without LLM generation).
- [X] **Principle III: Continuous Human Safety Net**: Supports `is_escalated` filtering to highlight conversations requiring human attention.
- [X] **Principle IV: Frictionless & Secure Widget**: Owner endpoints are separated from public widget endpoints; protected by `Authorization: Bearer <jwt_token>`.
- [X] **Principle V: Layered Architecture & Boundary Defense**: Strict three-layer boundary: `router` (`routers/conversations.py`) -> `service` (`owner_conversation_service.py`) -> `repo` (`conversation_repo.py`). Pydantic v2 schemas validate query and response types.
- [X] **Principle VI: Provider-Agnostic AI Layer**: N/A for this feature (analytics and history persistence only).

---

## Project Structure

### Documentation (this feature)

```text
specs/004-owner-conversations-inbox/
├── plan.md              # This implementation plan
├── research.md          # Query optimization and architecture decisions
├── data-model.md        # Relational models and schema representations
├── quickstart.md        # Verification guide with curl commands and pytest invocations
├── contracts/           # API contracts for owner conversations and analytics
│   └── conversations_api.md
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   └── conversation.py            # Conversation and Message entities (pre-existing)
│   ├── repos/
│   │   └── conversation_repo.py       # Add list_conversations_with_metadata, get_conversation_stats
│   ├── schemas/
│   │   └── conversation.py            # ConversationListItem, ListResponse, DetailResponse, StatsResponse
│   ├── services/
│   │   └── owner_conversation_service.py # Stateless business logic for owner inbox
│   ├── routers/
│   │   └── conversations.py           # Authenticated /api/v1/conversations router
│   └── main.py                        # Register conversations router
└── tests/
    ├── contract/
    │   └── test_owner_conversations_contract.py # Contract tests (pagination, 401, 404, stats)
    └── integration/
        └── test_owner_conversations_isolation.py # Multi-tenant isolation and data accuracy tests
```

---

## Complexity Tracking

| Aspect | Justification |
| :--- | :--- |
| **Efficient Message Count and Preview Query** | Instead of N+1 queries, `ConversationRepository` utilizes SQL subqueries or correlated joins to extract message counts and the latest message snippet in a single paginated query. |
| **Separate Owner Conversation Router** | Kept separate from public `/api/v1/widget` router to prevent permission bleed and enforce distinct security models (JWT vs widget public key). |
