# Tasks: Owner Conversations Inbox & Analytics API

**Input**: Design documents from `specs/004-owner-conversations-inbox/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/conversations_api.md](./contracts/conversations_api.md), [quickstart.md](./quickstart.md)

**Scope**: Authenticated owner conversation endpoints (`/api/v1/conversations`) enabling organization owners to view, paginate, inspect, and analyze all visitor chat sessions. Includes inbox listing with message counts and snippets, full chronological transcript retrieval, overview statistics, and escalation filtering with strict database-level tenant isolation.

**Tests**: Included per Constitution quality gates (Principle I strict multi-tenant isolation, Principle V layered architecture).

---

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task specifies exact file paths

---

## Phase 1: Setup (Schemas & Foundation)

**Purpose**: Create Pydantic v2 data transfer schemas for conversation inbox, transcripts, and analytics.

- [ ] T001 [P] Implement Pydantic schemas (`ConversationListItem`, `ConversationListResponse`, `ConversationDetailResponse`, `ConversationStatsResponse`) in `backend/app/schemas/conversation.py`
- [ ] T002 [P] Export new schemas in `backend/app/schemas/__init__.py`

---

## Phase 2: Foundational (Repository & Service Layer)

**Purpose**: Core database query methods in `ConversationRepository` and domain business logic in `OwnerConversationService`.

**⚠️ CRITICAL**: No router endpoints can be mounted until this phase is complete.

- [ ] T003 [P] Implement `list_conversations_with_metadata` with correlated subqueries for message counts, latest message preview, and pagination in `backend/app/repos/conversation_repo.py`
- [ ] T004 [P] Implement `get_conversation_with_messages` strictly filtering by `organization_id` in `backend/app/repos/conversation_repo.py`
- [ ] T005 [P] Implement `get_conversation_stats` computing total conversations, total messages, escalated count, and 24h activity in `backend/app/repos/conversation_repo.py`
- [ ] T006 Implement `OwnerConversationService` orchestrating inbox listing, detail transcript retrieval, and analytics in `backend/app/services/owner_conversation_service.py`

**Checkpoint**: Foundation ready — router and endpoint implementations can begin.

---

## Phase 3: User Story 1 - Paginated Conversations Inbox (Priority: P1) 🎯 MVP

**Goal**: Enable authenticated organization owners to retrieve a paginated list of visitor conversations sorted by `updated_at DESC` with message counts and preview snippets.

**Independent Test**: Send authenticated `GET /api/v1/conversations?limit=10&offset=0`; verify HTTP 200 returns paginated list of conversations scoped strictly to the owner's organization.

### Tests for User Story 1

- [ ] T007 [P] [US1] Contract test for `GET /api/v1/conversations` (pagination parameters, response shape, 401 unauthorized on missing/invalid token) in `backend/tests/contract/test_owner_conversations_contract.py`
- [ ] T008 [P] [US1] Integration test verifying tenant-isolated conversation listing (Owner A cannot see Owner B's conversations) in `backend/tests/integration/test_owner_conversations_isolation.py`

### Implementation for User Story 1

- [ ] T009 [US1] Implement `GET /api/v1/conversations` paginated endpoint with `CurrentOwner` dependency in `backend/app/routers/conversations.py`
- [ ] T010 [US1] Register `conversations_router` in `backend/app/main.py` under prefix `/api/v1/conversations` with tag `["Conversations"]`

**Checkpoint**: User Story 1 is fully functional and testable independently (Owner Inbox MVP complete).

---

## Phase 4: User Story 2 - Complete Conversation Transcript Inspection (Priority: P1)

**Goal**: Enable owners to inspect the full chronological transcript of a specific conversation, returning HTTP 404 for cross-tenant access attempts.

**Independent Test**: Send authenticated `GET /api/v1/conversations/{conversation_id}` for an owned conversation; verify HTTP 200 returns chronological messages. Send request for another organization's conversation; verify HTTP 404.

### Tests for User Story 2

- [ ] T011 [P] [US2] Contract test for `GET /api/v1/conversations/{conversation_id}` (200 success, 404 not found, 422 invalid UUID) in `backend/tests/contract/test_owner_conversations_contract.py`
- [ ] T012 [P] [US2] Integration test verifying cross-tenant transcript 404 defense and chronological message ordering in `backend/tests/integration/test_owner_conversations_isolation.py`

### Implementation for User Story 2

- [ ] T013 [US2] Implement `GET /api/v1/conversations/{conversation_id}` endpoint in `backend/app/routers/conversations.py`

**Checkpoint**: User Stories 1 and 2 are fully functional and integrated.

---

## Phase 5: User Story 3 - Conversation Overview Analytics & Metrics (Priority: P2)

**Goal**: Provide real-time aggregate statistics for the owner dashboard (`total_conversations`, `total_messages`, `escalated_conversations`, `active_last_24h`).

**Independent Test**: Send authenticated `GET /api/v1/conversations/stats`; verify HTTP 200 returns exact tenant-isolated counts.

### Tests for User Story 3

- [ ] T014 [P] [US3] Contract test for `GET /api/v1/conversations/stats` (response shape, 401 unauthorized) in `backend/tests/contract/test_owner_conversations_contract.py`
- [ ] T015 [P] [US3] Integration test verifying accurate tenant statistics calculation against seeded database records in `backend/tests/integration/test_owner_conversations_isolation.py`

### Implementation for User Story 3

- [ ] T016 [US3] Implement `GET /api/v1/conversations/stats` endpoint in `backend/app/routers/conversations.py`

**Checkpoint**: User Stories 1, 2, and 3 are fully functional.

---

## Phase 6: User Story 4 - Escalation Status & Resolution Filtering (Priority: P3)

**Goal**: Support filtering the conversations inbox by `is_escalated=true|false` so owners can prioritize conversations requiring human intervention.

**Independent Test**: Send `GET /api/v1/conversations?is_escalated=true`; verify only conversations with `is_escalated=True` are returned.

### Tests for User Story 4

- [ ] T017 [P] [US4] Contract test for `is_escalated` boolean query parameter in `backend/tests/contract/test_owner_conversations_contract.py`
- [ ] T018 [P] [US4] Integration test verifying escalation filter accuracy in `backend/tests/integration/test_owner_conversations_isolation.py`

### Implementation for User Story 4

- [ ] T019 [US4] Add `is_escalated: Optional[bool] = None` query filter handling to `backend/app/routers/conversations.py` and `backend/app/services/owner_conversation_service.py`

---

## Phase 7: Polish & Documentation

**Purpose**: End-to-end verification, test execution, and Git synchronization.

- [ ] T020 [P] Run full automated test suite (`uv run pytest tests/ -v`) and verify 100% pass rate
- [ ] T021 [P] Verify OpenAPI documentation and Swagger schema at `/docs`
- [ ] T022 Update Git with conventional commit and push branch `004-owner-conversations-inbox`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS** all user stories.
- **User Stories (Phases 3–6)**: All depend on Foundational phase completion.
  - Can proceed sequentially (US1 → US2 → US3 → US4) or in parallel.
- **Polish (Phase 7)**: Depends on all user stories being completed.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2). Delivers Owner Inbox MVP.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2). Delivers transcript view.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2). Delivers analytics overview.
- **User Story 4 (P3)**: Extends US1 listing endpoint with `is_escalated` filtering.

---

## Parallel Example: User Story 1

```bash
# Launch contract and integration tests for User Story 1 together:
Task: "T007 [P] [US1] Contract test for GET /api/v1/conversations in backend/tests/contract/test_owner_conversations_contract.py"
Task: "T008 [P] [US1] Integration test for tenant-isolated conversation listing in backend/tests/integration/test_owner_conversations_isolation.py"

# Implement router and mount:
Task: "T009 [US1] Implement GET /api/v1/conversations endpoint in backend/app/routers/conversations.py"
Task: "T010 [US1] Register conversations_router in backend/app/main.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (Pydantic schemas).
2. Complete **Phase 2: Foundational** (Repository queries & service layer).
3. Complete **Phase 3: User Story 1** (Paginated `/api/v1/conversations` endpoint).
4. **STOP and VALIDATE**: Run contract and integration tests for User Story 1. Verify inbox listing works.
5. Deploy/test MVP before adding transcript view and analytics.

### Incremental Delivery

1. **Setup + Foundational**: Establish schemas, queries, and service orchestrator.
2. **Add User Story 1 (P1)**: Paginated inbox listing (MVP).
3. **Add User Story 2 (P1)**: Complete conversation transcript view with cross-tenant 404 security.
4. **Add User Story 3 (P2)**: Conversation overview analytics (`/stats`).
5. **Add User Story 4 (P3)**: Escalation status filtering (`is_escalated`).
6. **Polish**: Full test suite pass (`59 + N` tests), OpenAPI check, Git push.
