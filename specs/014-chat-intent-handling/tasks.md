# Tasks: Conversational Intent & Chit-Chat Handling

**Branch**: `feat/rag-pipeline-architecture` | **Spec**: [spec.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/014-chat-intent-handling/spec.md) | **Plan**: [plan.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/014-chat-intent-handling/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project setup and schema definitions for intent classification

- [ ] T001 [P] Create intent schema definitions (`MessageIntent` enum and `IntentClassificationResult`) in `backend/app/schemas/intent.py`
- [ ] T002 [P] Extend `MessageBase` and `Message` models with `metadata_json` mapped to `metadata` JSON column in `backend/app/models/conversation.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data layer and repository updates that MUST be complete before user stories can execute

**⚠️ CRITICAL**: No user story streaming logic can begin until these foundational persistence utilities are ready.

- [ ] T003 Update `ConversationRepository.append_message` to accept and persist `metadata: Optional[dict] = None` in `backend/app/repos/conversation_repo.py`
- [ ] T004 [P] Add active document title retrieval helper `DocumentRepo.get_tenant_document_titles` in `backend/app/repos/document_repo.py`
- [ ] T005 Create baseline intent routing test harness in `backend/tests/test_chat_intent.py`

**Checkpoint**: Foundation ready — database persistence and schema interfaces in place.

---

## Phase 3: User Story 1 - Pleasantries, Greetings & Chit-Chat (Priority: P1) 🎯 MVP

**Goal**: Website visitors sending standalone greetings (*"Hi"*, *"Hello"*), courtesies (*"Thank you"*), or farewells (*"Bye"*) receive immediate (<50ms) warm, branded responses without querying vector documents or triggering false fallback/escalation prompts.

**Independent Test**: Send `POST /api/v1/widget/chat` with message `"Hello!"`; verify response is an instant friendly welcome referencing the organization's business name, `event: done` has `intent: "GREETING"`, and no `event: escalate_suggestion` is emitted.

### Implementation for User Story 1

- [ ] T006 [P] [US1] Implement Tier 1 heuristic pattern evaluator for greetings, gratitude, and farewells in `backend/app/services/intent_service.py`
- [ ] T007 [US1] Implement greeting and courtesy response generators contextualized with organization business name in `backend/app/services/intent_service.py`
- [ ] T008 [US1] Integrate Tier 1 fast-path routing into `stream_chat` in `backend/app/services/chat_service.py` to bypass Qdrant retrieval for standalone pleasantries
- [ ] T009 [US1] Persist `{"intent": "GREETING"}` metadata on the assistant message record in `backend/app/services/chat_service.py`
- [ ] T010 [P] [US1] Add unit and integration tests for greeting, gratitude, and farewell detection in `backend/tests/test_chat_intent.py`

**Checkpoint**: User Story 1 MVP complete. All basic greetings and pleasantries resolve instantly with 0 external LLM token cost.

---

## Phase 4: User Story 2 - Hybrid Greeting & Business Inquiry Disambiguation (Priority: P1)

**Goal**: When a visitor combines a greeting with a domain question (*"Hello! Do you ship to Canada?"*), the system recognizes the knowledge inquiry, retrieves document chunks from Qdrant, and streams an answer that begins with a natural polite acknowledgment before delivering the grounded answer.

**Independent Test**: Send `"Good morning, what is your return policy?"`; verify the assistant greets the user politely, answers accurately from knowledge chunks, and emits intent `"HYBRID_INQUIRY"`.

### Implementation for User Story 2

- [ ] T011 [US2] Implement compound inquiry disambiguation in `backend/app/services/intent_service.py` to distinguish pure greetings from compound queries
- [ ] T012 [US2] Update `build_system_prompt` in `backend/app/services/chat_service.py` to instruct the LLM to acknowledge greetings naturally while grounding facts strictly in retrieved chunks
- [ ] T013 [P] [US2] Add unit tests verifying hybrid greeting + question queries proceed to semantic search in `backend/tests/test_chat_intent.py`

**Checkpoint**: Compound inquiries smoothly answer customer questions while preserving conversational warmth.

---

## Phase 5: User Story 3 - Out-of-Scope Query Deflection (Priority: P2)

**Goal**: When a visitor asks an off-topic question (e.g., coding, world trivia), the assistant deflects politely and suggests 2–3 topics derived from the organization's uploaded documents instead of claiming missing documentation.

**Independent Test**: Send `"Can you write a poem about stars?"`; verify response states it can only assist with [Org Name] and lists 2–3 document topics, with intent `"OUT_OF_SCOPE"`.

### Implementation for User Story 3

- [ ] T014 [US3] Implement out-of-scope query detector and deflection formatter in `backend/app/services/intent_service.py`
- [ ] T015 [US3] Integrate document title topic suggestions into ungrounded retrieval fallback in `backend/app/services/chat_service.py`
- [ ] T016 [P] [US3] Add unit tests for out-of-scope deflection and document topic suggestion in `backend/tests/test_chat_intent.py`

**Checkpoint**: Off-topic inquiries guide visitors back to the business without generating support tickets.

---

## Phase 6: User Story 4 - Emotion, Frustration & Explicit Escalation Intent (Priority: P2)

**Goal**: When a visitor demands a real person (*"I want to speak to a human"*) or expresses severe frustration, the assistant immediately de-escalates and displays the in-chat contact capture form without re-running vector search.

**Independent Test**: Send `"I need a human agent right now"`; verify assistant responds empathetically and immediately yields `event: escalate_suggestion` with `{"suggest_escalation": true, "reason": "explicit_request"}`.

### Implementation for User Story 4

- [ ] T017 [US4] Implement explicit escalation keywords and frustration pattern detection in `backend/app/services/intent_service.py`
- [ ] T018 [US4] Integrate immediate de-escalation response and `escalate_suggestion` SSE event dispatch in `backend/app/services/chat_service.py`
- [ ] T019 [P] [US4] Add unit tests for explicit human escalation routing in `backend/tests/test_chat_intent.py`

**Checkpoint**: Visitors needing human help are never trapped in chat loops.

---

## Phase 7: User Story 5 - Bot Identity & Capability Inquiries (Priority: P3)

**Goal**: When a visitor asks meta-questions (*"Who are you?"*, *"Are you an AI?"*, *"What can you do?"*), the assistant transparently explains its role as the organization's virtual assistant and outlines its capabilities.

**Independent Test**: Send `"Are you a human or an AI?"`; verify response transparently states it is the AI assistant for [Org Name] and summarizes what it can assist with.

### Implementation for User Story 5

- [ ] T020 [US5] Implement identity and capability query detection in `backend/app/services/intent_service.py`
- [ ] T021 [US5] Implement identity response generator in `backend/app/services/intent_service.py` and integrate with `backend/app/services/chat_service.py`
- [ ] T022 [P] [US5] Add unit tests for bot identity queries in `backend/tests/test_chat_intent.py`

**Checkpoint**: Identity and capability questions answered transparently and accurately.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Dashboard inbox intent badge display and end-to-end verification

- [ ] T023 [P] Add intent badge rendering in the Owner Conversations Inbox UI in `frontend/components/conversations/conversation-thread.tsx`
- [ ] T024 Verify all scenarios in `specs/014-chat-intent-handling/quickstart.md`
- [ ] T025 Run full automated test suite to confirm zero regressions across RAG pipeline and chat streaming

---

## Dependencies & Execution Order

### Phase Dependencies
1. **Setup (Phase 1)**: Can start immediately.
2. **Foundational (Phase 2)**: Depends on Phase 1 completion. Blocks all user stories.
3. **User Story 1 (Phase 3 - P1 MVP)**: Depends on Phase 2. Delivers working greeting fast-path.
4. **User Story 2 (Phase 4 - P1)**: Depends on US1 completion.
5. **User Story 3 (Phase 5 - P2)**: Depends on Phase 2 (and US1).
6. **User Story 4 (Phase 6 - P2)**: Depends on Phase 2.
7. **User Story 5 (Phase 7 - P3)**: Depends on Phase 2.
8. **Polish (Phase 8)**: Depends on desired user stories being complete.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`T001`, `T002`)
2. Complete Phase 2: Foundational (`T003`, `T004`, `T005`)
3. Complete Phase 3: User Story 1 (`T006` - `T010`)
4. **Validate MVP**: Confirm greetings like `"Hi"` return in <50ms with 0 LLM token cost and no fallback error.
