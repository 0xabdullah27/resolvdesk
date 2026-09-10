# Implementation Plan: Conversational Intent & Chit-Chat Handling

**Branch**: `feat/rag-pipeline-architecture` | **Date**: 2026-09-10 | **Spec**: [spec.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/014-chat-intent-handling/spec.md)

**Input**: Feature specification from `specs/014-chat-intent-handling/spec.md`

## Summary

Implement an intelligent two-tier conversational intent classification and response engine inside ResolvDesk's backend chat service. Tier 1 executes fast heuristic pattern detection (<50ms, 0 token cost) to recognize greetings, courtesies, farewells, and explicit escalation demands, responding immediately with warm, branded messages while bypassing redundant knowledge retrieval. Tier 2 handles substantive domain queries via tenant-isolated semantic search and LLM generation, deflecting out-of-scope inquiries using topics pulled from the organization's uploaded documents. Intent tags are saved in message metadata JSON for conversation inbox inspection and reporting.

## Technical Context

**Language/Version**: Python 3.12 (Backend), TypeScript 5.x / Next.js 16 (Frontend)

**Primary Dependencies**: FastAPI, SQLModel, Pydantic v2, Qdrant Client, httpx, OpenAI-compatible SDK

**Storage**: PostgreSQL (hosted on Neon) via asyncpg, Qdrant Vector Store

**Testing**: Pytest with pytest-asyncio and FastAPI TestClient

**Target Platform**: Linux / Containerized Cloud Server (Neon + Cloud Backend)

**Project Type**: Web service (FastAPI backend + Next.js frontend)

**Performance Goals**:
- Standalone greetings response latency: `< 100ms` (time-to-first-token)
- Compound domain inquiries: `< 1.5s` (time-to-first-token)
- Zero external LLM token cost for basic greetings and pleasantries

**Constraints**:
- Must preserve strict tenant isolation (`organization_id` filter on all queries)
- Must not break existing SSE protocol (`start`, `token`, `escalate_suggestion`, `done`)
- Must avoid relational table schema migrations by persisting intent tags in `metadata` JSON

**Scale/Scope**:
- Handles all visitor chats across Web Widget, Dashboard conversation preview, and upcoming Omnichannel adapters (WhatsApp, Telegram)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance Status | Rationale |
|---|---|---|
| **I. Strict Multi-Tenant Isolation** | **PASS** | Organization context, document topic suggestions, and conversation queries strictly filter by `organization_id`. |
| **II. Grounded AI & Zero Hallucination** | **PASS** | Disambiguates greetings from knowledge queries; substantive queries remain strictly grounded in retrieved chunks with fallback when confidence is low. |
| **III. Continuous Human Safety Net** | **PASS** | Explicit escalation requests and severe frustration immediately render in-chat contact capture form without trapping users in bot loops. |
| **IV. Frictionless & Secure Widget** | **PASS** | Maintains rate limiting, origin verification, and public widget security. |
| **V. Layered Architecture** | **PASS** | Clean separation: `api/v1/widget/chat.py` (Router) -> `services/intent_service.py` & `services/chat_service.py` (Service) -> `repos/conversation_repo.py` & `repos/document_repo.py` (Repo). |
| **VI. Provider-Agnostic AI Layer** | **PASS** | LLM interactions continue using the unified OpenAI-compatible client abstraction. |
| **VII. Strict Semantic Theming** | **PASS** | Front-end inbox intent badges use semantic theme tokens (`bg-primary/10`, `text-primary`, `border-border`). |

## Project Structure

### Documentation (this feature)

```text
specs/014-chat-intent-handling/
├── spec.md              # Feature specification with 5 clarified Q&As
├── plan.md              # This implementation plan
├── research.md          # Phase 0: Two-tier architecture, metadata persistence, topic extraction
├── data-model.md        # Phase 1: Message metadata schema, Intent enum, IntentResult
├── quickstart.md        # Phase 1: Validation guide & curl test scenarios
├── contracts/           # Phase 1: SSE event contract documentation
│   └── chat-sse-contracts.md
└── checklists/
    └── requirements.md  # Quality checklist (16/16 passing)
```

### Source Code

```text
backend/app/
├── models/
│   └── conversation.py          # Message model with metadata_json JSON column
├── schemas/
│   ├── intent.py                # MessageIntent enum and IntentClassificationResult
│   └── chat.py                  # SSE payload and chat schemas
├── services/
│   ├── intent_service.py        # Two-tier intent classification & heuristic rules
│   └── chat_service.py          # Stream chat coordinator integrating intent routing
├── repos/
│   ├── conversation_repo.py     # Message append supporting metadata JSON
│   └── document_repo.py         # Helper to fetch active document titles for deflection
└── tests/
    └── test_chat_intent.py      # Unit and integration tests for intent routing
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *None* | All designs strictly follow three-layer architecture and constitutional principles. | N/A |
