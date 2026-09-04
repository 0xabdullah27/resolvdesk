# Tasks: AI Answer Engine & Streaming Chat API

**Input**: Design documents from `/specs/003-ai-answer-engine/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/chat_api.md](./contracts/chat_api.md), [quickstart.md](./quickstart.md)

**Scope**: Public visitor chat endpoint (`POST /api/v1/widget/chat`) with real-time Server-Sent Events (SSE) streaming, strict tenant-isolated vector retrieval from Qdrant, provider-agnostic LLM client (reading `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`), two-phase anti-hallucination prompt grounding, multi-turn conversation memory, and sliding-window IP rate limiting.

**Tests**: Included per Constitution quality gates (Principle I tenant isolation, Principle II zero-hallucination, Principle IV rate limiting).

---

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task specifies exact file paths

---

## Phase 1: Setup (Configuration & Infrastructure)

**Purpose**: Add LLM configuration settings and rate limiter infrastructure.

- [ ] T001 Add `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` settings to `backend/app/core/config.py`
- [ ] T002 Add `sse-starlette` dependency (or native async generator streaming support) to `backend/pyproject.toml`
- [ ] T003 [P] Implement in-memory sliding-window IP rate limiter (30 requests/minute per client IP) in `backend/app/core/rate_limiter.py`

---

## Phase 2: Foundational (Data Models & Repositories)

**Purpose**: Core `Conversation` and `Message` entities, Alembic database migration, and conversation repository that all chat operations depend upon.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 [P] Implement `Conversation` and `Message` SQLModel entities with foreign keys and indexes in `backend/app/models/conversation.py`
- [ ] T005 [P] Register `Conversation` and `Message` in `backend/app/models/__init__.py`
- [ ] T006 Create and apply Alembic migration for conversations and messages in `backend/alembic/versions/003_create_conversations_and_messages.py`
- [ ] T007 [P] Implement `ConversationRepository` supporting session creation, message append, and chronological history retrieval (last 10 messages) in `backend/app/repos/conversation_repo.py`
- [ ] T008 [P] Define Pydantic schemas (`ChatRequest`, `ChatMessageRead`, `ConversationHistoryResponse`) in `backend/app/schemas/chat.py`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Public Visitor Chat Session & Streaming RAG Answers (Priority: P1) 🎯 MVP

**Goal**: Enable anonymous website visitors to submit a question via public `widget_key`, retrieve top 5 Qdrant chunks strictly filtered by `organization_id`, stream the AI answer token-by-token using Server-Sent Events (SSE), and persist conversation and message records in PostgreSQL.

**Independent Test**: Send `POST /api/v1/widget/chat` with a valid `widget_key` and question matching an ingested document; verify HTTP 200 SSE stream delivers token chunks progressively, and conversation and message records are created in PostgreSQL.

### Tests for User Story 1

- [ ] T009 [P] [US1] Contract test for `POST /api/v1/widget/chat` SSE stream and event shapes (`start`, `token`, `done`) in `backend/tests/contract/test_chat_contract.py`
- [ ] T010 [P] [US1] Integration test for complete visitor chat flow (widget key -> Qdrant retrieval -> LLM streaming -> message persistence) in `backend/tests/integration/test_chat_rag.py`

### Implementation for User Story 1

- [ ] T011 [US1] Implement provider-agnostic OpenAI-compatible LLM streaming client using `httpx.AsyncClient` in `backend/app/services/llm_service.py`
- [ ] T012 [US1] Implement RAG chat orchestration service in `backend/app/services/chat_service.py` coordinating widget key validation, Qdrant vector retrieval (`organization_id` filter), prompt assembly, and SSE token streaming
- [ ] T013 [US1] Implement `POST /api/v1/widget/chat` SSE streaming endpoint in `backend/app/routers/widget.py`

**Checkpoint**: User Story 1 is fully functional and testable independently (Backend Chat MVP complete).

---

## Phase 4: User Story 2 - Grounded AI, Zero Hallucination & Polite Fallback (Priority: P1)

**Goal**: Enforce strict grounding in retrieved document chunks; output the standardized fallback without guessing if relevant information is absent or similarity score is low.

**Independent Test**: Ask an off-topic question or query with zero relevant document chunks in Qdrant; verify the streamed answer outputs: *"I don't have information about that in my knowledge base. Would you like me to connect you with a human who can help?"* without fabricating facts.

### Tests for User Story 2

- [ ] T014 [P] [US2] Unit test verifying anti-hallucination prompt construction and confidence threshold gate in `backend/tests/unit/test_grounding.py`
- [ ] T015 [P] [US2] Integration test verifying unindexed or off-topic questions return the standard fallback in `backend/tests/integration/test_chat_rag.py`

### Implementation for User Story 2

- [ ] T016 [US2] Implement similarity confidence threshold check (< 0.55 or 0 chunks) to immediately return polite fallback in `backend/app/services/chat_service.py`
- [ ] T017 [US2] Implement rigid system prompt template enforcing strict grounding and scope redirection in `backend/app/services/chat_service.py`

**Checkpoint**: User Stories 1 and 2 are fully functional and integrated.

---

## Phase 5: User Story 3 - Multi-Turn Conversation History & Context Window (Priority: P2)

**Goal**: Load the last 10 messages for continuing chat sessions so the assistant can resolve pronouns and maintain context across multiple questions.

**Independent Test**: Send a base question, then send a follow-up with `conversation_id` referencing "that" or "it"; verify the assistant accurately incorporates prior turns.

### Tests for User Story 3

- [ ] T018 [P] [US3] Contract test for `GET /api/v1/widget/conversations/{conversation_id}` history re-hydration in `backend/tests/contract/test_chat_contract.py`
- [ ] T019 [P] [US3] Integration test verifying multi-turn pronoun resolution across multiple messages in `backend/tests/integration/test_chat_rag.py`

### Implementation for User Story 3

- [ ] T020 [US3] Implement conversation history context injection (last 10 messages) into the LLM prompt in `backend/app/services/chat_service.py`
- [ ] T021 [US3] Implement `GET /api/v1/widget/conversations/{conversation_id}` endpoint in `backend/app/routers/widget.py`

**Checkpoint**: User Stories 1, 2, and 3 are fully functional.

---

## Phase 6: User Story 4 - Public Widget Abuse Prevention & Guardrails (Priority: P3)

**Goal**: Enforce rate limiting (30 req/min per IP), message length bounds (1,000 chars), and rotation grace period handling.

**Independent Test**: Send 31 messages within 60 seconds; verify 31st request returns HTTP 429. Submit a 1,001-character message; verify HTTP 422. Test with rotated key in grace period; verify HTTP 200.

### Tests for User Story 4

- [ ] T022 [P] [US4] Contract tests for rate limiting (429), message length bounds (422), invalid widget key (404), and suspended organization (403) in `backend/tests/contract/test_chat_contract.py`
- [ ] T023 [P] [US4] Unit test for sliding-window rate limiter in `backend/tests/unit/test_rate_limiter.py`

### Implementation for User Story 4

- [ ] T024 [US4] Integrate sliding-window rate limiter dependency on chat endpoint in `backend/app/routers/widget.py`
- [ ] T025 [US4] Add schema validation for 1,000-character maximum and non-empty string in `backend/app/schemas/chat.py`
- [ ] T026 [US4] Support widget key grace period lookup and suspended organization checks in `backend/app/services/chat_service.py`

---

## Phase 7: Polish & Documentation

**Purpose**: End-to-end verification, test execution, and cleanup.

- [ ] T027 [P] Run full automated test suite (`uv run pytest tests/ -v`) and verify 100% pass rate
- [ ] T028 [P] Verify OpenAPI documentation and Swagger schema at `/docs`
- [ ] T029 Update Git with conventional commit and push branch `003-ai-answer-engine`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS** all user stories.
- **User Stories (Phases 3–6)**: All depend on Foundational phase completion.
  - Can proceed sequentially in priority order (US1 → US2 → US3 → US4) or in parallel where noted.
- **Polish (Phase 7)**: Depends on all user stories being completed.

### User Story Dependencies

- **User Story 1 (P1)**: Starts immediately after Foundational (Phase 2). No dependencies on other stories.
- **User Story 2 (P1)**: Extends US1 prompt and chunk scoring logic in `backend/app/services/chat_service.py`. Can be implemented right after US1 core engine or concurrently.
- **User Story 3 (P2)**: Extends US1 session handling by retrieving previous 10 messages from `ConversationRepository`.
- **User Story 4 (P3)**: Adds security guards (rate limiting, validation bounds, key grace period) on top of the existing endpoint.

### Parallel Opportunities

- In Phase 1: `T003` (rate limiter) can be developed in parallel with `T001`-`T002`.
- In Phase 2: `T004` (models), `T007` (repo), and `T008` (schemas) can be written in parallel before migration `T006`.
- In User Story 1: Tests `T009` and `T010` can be written in parallel before implementation.
- In User Story 2: Unit test `T014` and integration test `T015` can be written in parallel.
- Across stories: Once Phase 2 is complete, US2 and US3 can proceed in parallel once US1 core service interfaces are in place.

---

## Parallel Example: User Story 1

```bash
# Launch contract and integration tests for User Story 1 together:
Task: "T009 [P] [US1] Contract test for POST /api/v1/widget/chat SSE stream in backend/tests/contract/test_chat_contract.py"
Task: "T010 [P] [US1] Integration test for complete visitor chat flow in backend/tests/integration/test_chat_rag.py"

# Launch LLM service and Chat service interfaces:
Task: "T011 [US1] Implement provider-agnostic OpenAI-compatible LLM streaming client in backend/app/services/llm_service.py"
Task: "T012 [US1] Implement RAG chat orchestration service in backend/app/services/chat_service.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (configuration and dependencies).
2. Complete **Phase 2: Foundational** (data models, migration, repo, schemas).
3. Complete **Phase 3: User Story 1** (LLM streaming client, RAG orchestrator, and `/api/v1/widget/chat` SSE endpoint).
4. **STOP and VALIDATE**: Run `backend/tests/contract/test_chat_contract.py` and `backend/tests/integration/test_chat_rag.py`. Test streaming SSE response via `curl`.
5. Ensure MVP is solid before layering additional guardrails.

### Incremental Delivery

1. **Setup + Foundational**: Establish database tables and repository foundation.
2. **Add User Story 1 (P1)**: Live streaming RAG answers over SSE (Backend MVP).
3. **Add User Story 2 (P1)**: Grounding and zero-hallucination fallback logic.
4. **Add User Story 3 (P2)**: Multi-turn history (last 10 messages) & context window.
5. **Add User Story 4 (P3)**: IP rate limiting (30 req/min), message length validation (1,000 chars), and key rotation grace period.
6. **Polish**: Full regression testing, docs validation, and Git commit.

---

