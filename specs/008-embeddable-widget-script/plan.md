# Implementation Plan: Embeddable Customer Chat Widget Script

**Branch**: `008-embeddable-widget-script` | **Date**: 2026-09-05 | **Spec**: [`specs/008-embeddable-widget-script/spec.md`](./spec.md)

**Input**: Feature specification from `specs/008-embeddable-widget-script/spec.md`

---

## Summary

Deliver a zero-dependency, standalone chat widget script (`frontend/public/widget.js`, < 40 KB gzipped) that merchants embed on their public storefronts (Shopify, WooCommerce, Webflow, custom HTML) via `<script src="https://resolvdesk.com/widget.js" data-widget-key="rd_live_..." defer></script>`. 

The widget initializes automatically, isolates styles from third-party host CSS conflicts using a native Shadow DOM root (`attachShadow({ mode: "open" })`), applies dynamic merchant branding (`--rd-primary`), provides real-time SSE streaming from `POST /api/v1/widget/chat`, preserves shopper sessions across page transitions via `localStorage` (24-hour sliding window), provides a continuous human safety net via a reactive inline ticket escalation form (`POST /api/v1/widget/chat/escalate`), and expands into an immersive full-screen view on mobile viewports (< 640px).

---

## Technical Context

**Language/Version**: 
- **Frontend / Client**: Modern Vanilla JavaScript (ES2020+, Native Web Components/Shadow DOM, zero external dependencies).
- **Backend**: Python 3.11+ (FastAPI, SQLModel, Pydantic v2).

**Primary Dependencies**: 
- **Frontend**: Zero external libraries (Vanilla JS, DOM APIs, Fetch API, ReadableStream).
- **Backend**: FastAPI, SQLModel, asyncpg, SSE (StreamingResponse).

**Storage**: 
- **Client**: Browser `localStorage` (`resolvdesk_session_${widgetKey}`) with 24-hour sliding TTL.
- **Server**: PostgreSQL (Neon) via SQLModel async sessions for `Conversation` and `Message` tables.

**Testing**: 
- **Backend**: `pytest` (`pytest-asyncio`, `httpx`).
- **Frontend**: Browser integration tests via local test fixture (`frontend/public/test-widget.html`) and Next.js build verification (`npm run build`).

**Target Platform**: 
- Cross-browser client environments (Chrome, Safari, Firefox, Edge, iOS Safari, Android Chrome) embedded in third-party websites.

**Project Type**: 
- Embeddable Client Library / Script (`public/widget.js`) + REST & SSE Web Services (`backend/app/routers/widget.py`).

**Performance Goals**: 
- Initial widget script size < 40 KB gzipped.
- Launcher initial mount time < 300 ms after page load.
- Time-to-first-token < 2 seconds on streaming AI answers.

**Constraints**: 
- Zero external runtime script dependencies.
- 100% style encapsulation (zero host page CSS leakage).
- Rate limit enforcement: max 30 requests/minute per IP; max 1,000 characters per user message.
- Silent failure on merchant storefront during backend outages.

**Scale/Scope**: 
- Single high-efficiency client script (`widget.js`), 1 new backend router escalation endpoint, 1 backend service enhancement, and automated tests.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I: Strict Multi-Tenant Isolation**: Public widget requests are resolved by `widget_key` and verify tenant ownership (`WHERE organization_id = ...`) at the database query level. Domain whitelist verification prevents unauthorized cross-domain embeds.
- [x] **Principle II: Grounded AI & Zero Hallucination**: AI responses strictly stream retrieved context chunks. When confidence is below threshold, standardized fallback responses and reactive escalation suggestions are emitted.
- [x] **Principle III: Continuous Human Safety Net**: Anonymous visitors can submit contact details and a summary message to create an actionable support ticket (`POST /api/v1/widget/chat/escalate`) when AI answers fall short.
- [x] **Principle IV: Frictionless & Secure Widget**: Public widget key (`rd_live_*`) is strictly read-only; no visitor authentication is required; IP rate limiting (30 req/min) and 1,000-character caps are enforced.
- [x] **Principle V: Layered Architecture & Boundary Defense**: Backend logic is organized in strict layers: `router` (`widget.py`) -> `service` (`widget_service.py`, `chat_service.py`) -> `repo` (`widget_repo.py`, `conversation_repo.py`). Client inputs are validated at the Pydantic schema layer.
- [x] **Principle VII: Strict Semantic Theming & Design Tokens**: Widget styles are encapsulated in native Shadow DOM and dynamically consume CSS custom properties (`--rd-primary`) mapped from the merchant's saved theme tokens.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-embeddable-widget-script/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Architecture decisions & tradeoffs (Phase 0)
├── data-model.md        # Client & server data models (Phase 1)
├── quickstart.md        # Verification guide & test fixture instructions (Phase 1)
├── contracts/           # API and client contracts (Phase 1)
│   ├── widget_api_contracts.md
│   └── widget_client_contracts.md
└── tasks.md             # Work breakdown (Phase 2 - via /speckit-tasks)
```

### Source Code Layout

```text
backend/
├── app/
│   ├── models/
│   │   └── conversation.py              # Conversation.is_escalated flag
│   ├── schemas/
│   │   ├── chat.py                      # ChatRequest, ChatEscalateRequest, ChatEscalateResponse
│   │   └── widget.py                    # PublicWidgetConfigResponse
│   ├── services/
│   │   └── chat_service.py              # Citations, escalation suggestions, escalate_ticket method
│   └── routers/
│       └── widget.py                    # GET /config, POST /chat, POST /chat/escalate, GET /conversations/{id}
└── tests/
    └── test_widget_escalate.py          # Contract tests for visitor escalation & failure handling

frontend/
└── public/
    ├── widget.js                        # The standalone, zero-dependency embeddable script
    └── test-widget.html                 # Test harness fixture simulating merchant host page
```

**Structure Decision**: 
The embeddable widget is hosted as a static asset in `frontend/public/widget.js`, served directly by Next.js at `/widget.js`. The backend API services in `backend/app/routers/widget.py` support configuration resolution, SSE chat streaming, and visitor escalation.

---

## Planned Implementation Steps

1. **Backend Escalation & Citation Enhancements**:
   - Add `ChatEscalateRequest` and `ChatEscalateResponse` schemas in `backend/app/schemas/chat.py`.
   - Add `escalate_conversation()` method to `backend/app/services/chat_service.py` that validates widget access, sets `Conversation.is_escalated = True`, appends a system audit message, and returns `TK-XXXXXX`.
   - Add `POST /api/v1/widget/chat/escalate` endpoint in `backend/app/routers/widget.py`.
   - Update `chat_service.stream_chat()` to yield `citation` events when documents are matched and `escalate_suggestion` on fallback.
   - Add automated tests in `backend/tests/test_widget_escalate.py`.

2. **Standalone Client Script (`frontend/public/widget.js`)**:
   - **Bootstrapper**: Read `<script>` attributes (`data-widget-key`, `data-api-base`).
   - **Config Loader**: Fetch `GET /api/v1/widget/config?key=...`. Fail silently if unavailable.
   - **Domain Guard**: Compare `window.location.hostname` with `allowed_origins`.
   - **Shadow DOM Mount**: Attach open Shadow Root with encapsulated CSS, CSS custom properties (`--rd-primary`), responsive mobile media queries (< 640px), and high-contrast styling.
   - **Session Manager**: Maintain `localStorage` with 24-hour sliding expiration window (`resolvdesk_session_${key}`).
   - **Chat Controller & Stream Consumer**: Handle message input (1,000 char cap), send `POST /api/v1/widget/chat`, parse SSE tokens, and render citations.
   - **Reactive Escalation UI**: Render inline "Escalate to Human Agent" button on low confidence, present inline email submission form, call `POST /api/v1/widget/chat/escalate`, and display confirmation card while keeping input active.

3. **Verification & Delivery**:
   - Create `frontend/public/test-widget.html` for interactive verification.
   - Run backend test suite (`uv run pytest`).
   - Run frontend build verification (`npm run build`).

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *None* | No constitutional violations. Layered architecture, tenant isolation, and theme token rules strictly upheld. | N/A |
