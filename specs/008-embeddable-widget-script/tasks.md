# Tasks: Embeddable Customer Chat Widget Script

**Feature**: Embeddable Customer Chat Widget Script (`public/widget.js`)  
**Branch**: `008-embeddable-widget-script`  
**Spec**: [`specs/008-embeddable-widget-script/spec.md`](./spec.md) | **Plan**: [`specs/008-embeddable-widget-script/plan.md`](./plan.md)  
**Input**: Design artifacts from `specs/008-embeddable-widget-script/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize static asset structure and test harness layout

- [ ] T001 Create standalone test storefront fixture in `frontend/public/test-widget.html` with host CSS resets
- [ ] T002 Initialize base script structure and IIFE wrapper in `frontend/public/widget.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend contract additions and schema models required across widget streaming and escalation

- [ ] T003 [P] Define `ChatEscalateRequest` and `ChatEscalateResponse` schemas in `backend/app/schemas/chat.py`
- [ ] T004 Implement `escalate_conversation` in `backend/app/services/chat_service.py` to flag `Conversation.is_escalated = True` and record audit message
- [ ] T005 Implement `POST /api/v1/widget/chat/escalate` endpoint in `backend/app/routers/widget.py`
- [ ] T006 [P] Add contract tests for escalation in `backend/tests/test_widget_escalate.py`

**Checkpoint**: Foundation ready - backend escalation endpoint and test fixture prepared.

---

## Phase 3: User Story 1 - Visitor Floating Launcher & Customized Greeting (Priority: P1) 🎯 MVP

**Goal**: Deliver an embeddable script that reads the merchant's widget key, fetches branding, isolates styles in native Shadow DOM, mounts a floating launcher, and displays the welcome greeting bubble.

**Independent Test**: Load `http://localhost:3000/test-widget.html` with `<script src="/widget.js" data-widget-key="rd_live_..." defer></script>`. The styled launcher bubble mounts in < 300ms, resists host page CSS resets, opens the chat window with merchant colors and bot name, and closes cleanly.

### Implementation for User Story 1

- [ ] T007 [US1] Implement script tag attribute extraction (`data-widget-key`, `data-api-base`) in `frontend/public/widget.js`
- [ ] T008 [US1] Implement public config retrieval (`GET /api/v1/widget/config`) with silent graceful failure on API/network errors in `frontend/public/widget.js`
- [ ] T009 [US1] Implement client-side domain authorization check (`allowed_origins` vs `window.location.hostname`) in `frontend/public/widget.js`
- [ ] T010 [US1] Implement Shadow DOM creation (`attachShadow({ mode: "open" })`) and host container mount in `frontend/public/widget.js`
- [ ] T011 [US1] Implement encapsulated CSS styles with dynamic tokens (`--rd-primary`), mobile full-screen media queries (< 640px), and launcher animations in `frontend/public/widget.js`
- [ ] T012 [US1] Implement floating launcher button with placement support (`bottom-right`, `bottom-left`), click toggle handler, and SVG icons in `frontend/public/widget.js`
- [ ] T013 [US1] Implement chat window markup (sticky header, bot display name, status dot, close button, and welcome message bubble) in `frontend/public/widget.js`

**Checkpoint**: User Story 1 (MVP) is fully functional. The widget self-initializes, isolates styles via Shadow DOM, and displays merchant branding.

---

## Phase 4: User Story 2 - Real-Time AI Streaming & Knowledge Base Citations (Priority: P2)

**Goal**: Allow visitors to submit questions up to 1,000 characters, stream token-by-token AI answers via SSE, display document citation badges, and persist sessions across page transitions via `localStorage`.

**Independent Test**: Type a question in the widget input. The user bubble displays immediately, tokens stream progressively in < 2 seconds, citation badges appear under grounded answers, and refreshing the page seamlessly restores conversation history.

### Implementation for User Story 2

- [ ] T014 [P] [US2] Enhance `backend/app/services/chat_service.py` to yield `event: citation` SSE payloads containing retrieved document titles and ids
- [ ] T015 [US2] Implement `localStorage` session manager (`resolvdesk_session_${widgetKey}`) with 24-hour sliding TTL and rehydration in `frontend/public/widget.js`
- [ ] T016 [US2] Implement chat input form with 1,000-character validation, debounce protection, and auto-growing/auto-scroll behavior in `frontend/public/widget.js`
- [ ] T017 [US2] Implement SSE streaming consumer (`POST /api/v1/widget/chat`) using native `ReadableStream` reader and `TextDecoder` in `frontend/public/widget.js`
- [ ] T018 [US2] Implement progressive token bubble rendering with animated typing indicator and auto-scroll in `frontend/public/widget.js`
- [ ] T019 [US2] Implement citation badge UI rendering (`[1] Document Title`) below completed assistant messages in `frontend/public/widget.js`
- [ ] T020 [US2] Implement network error retry prompt when streaming is interrupted in `frontend/public/widget.js`

**Checkpoint**: User Stories 1 and 2 are fully integrated and functional.

---

## Phase 5: User Story 3 - Human Escalation & Support Ticket Handoff (Priority: P3)

**Goal**: Provide a reactive inline human escalation prompt when AI confidence is low or when requested, allowing visitors to submit their email and summary to generate a ticket without locking the chat input.

**Independent Test**: Ask an ungrounded question. The assistant streams the fallback response and renders an inline "Escalate to Human Agent" button. Clicking expands an email form; submitting creates a ticket and renders an inline confirmation card (`Ticket #TK-XXXXXX Submitted`) while keeping the typing box open.

### Implementation for User Story 3

- [ ] T021 [P] [US3] Update `backend/app/services/chat_service.py` to yield `event: escalate_suggestion` when similarity score is below threshold or fallback triggered
- [ ] T022 [US3] Implement reactive inline "Escalate to Human Agent" button rendering upon `escalate_suggestion` or fallback in `frontend/public/widget.js`
- [ ] T023 [US3] Implement expandable inline escalation form (email input with validation and optional note) in `frontend/public/widget.js`
- [ ] T024 [US3] Implement escalation API submission (`POST /api/v1/widget/chat/escalate`) with loading state and error handling in `frontend/public/widget.js`
- [ ] T025 [US3] Implement inline ticket confirmation card rendering (displaying ticket ID and email notice) while keeping the chat input active in `frontend/public/widget.js`

**Checkpoint**: All 3 User Stories are complete, fully delivering the customer chat widget with a continuous human safety net.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Bundle optimization, asset size validation, automated testing, and verification against all acceptance criteria.

- [ ] T026 [P] Verify bundle size of `frontend/public/widget.js` is under 40 KB gzipped
- [ ] T027 Run full backend test suite (`uv run pytest`) ensuring all existing and new tests pass
- [ ] T028 Run frontend production build (`npm run build`) ensuring zero compilation or type errors
- [ ] T029 Execute full quickstart validation walkthrough in `specs/008-embeddable-widget-script/quickstart.md` using `frontend/public/test-widget.html`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — completes backend schemas and endpoints.
- **Phase 3 (User Story 1 - P1 MVP)**: Depends on Phase 2 — builds launcher, Shadow DOM, and branding.
- **Phase 4 (User Story 2 - P2)**: Depends on Phase 3 — adds SSE streaming, citations, and `localStorage`.
- **Phase 5 (User Story 3 - P3)**: Depends on Phase 4 — adds reactive inline escalation and ticket confirmation.
- **Phase 6 (Polish)**: Depends on all user stories being implemented.

### Parallel Opportunities

- **T003**, **T006**: Backend schemas and tests can be created in parallel.
- **T014**, **T021**: Backend citation emission and escalation event flags can be developed alongside frontend tasks.
- **T026**: Bundle size measurement can run alongside automated test execution.

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1).
3. Validate launcher rendering, merchant color theming, and Shadow DOM style isolation on `test-widget.html`.

### Incremental Feature Delivery
- **Increment 1 (MVP)**: Standalone launcher, Shadow DOM isolation, merchant branding, and welcome greeting.
- **Increment 2**: Live token-by-token SSE streaming, knowledge base citation badges, and `localStorage` session continuity across reloads.
- **Increment 3**: Continuous human safety net via reactive inline escalation form and ticket confirmation card.
- **Final Polish**: Bundle size audit (< 40 KB gzipped) and test suite execution.
