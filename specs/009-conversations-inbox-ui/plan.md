# Implementation Plan: Conversations Inbox & Ticket Management UI

**Branch**: `009-conversations-inbox-ui` | **Date**: 2026-09-06 | **Spec**: [Feature Spec](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/009-conversations-inbox-ui/spec.md)

**Input**: Feature specification from `specs/009-conversations-inbox-ui/spec.md` and user clarification session.

---

## Summary

Build a modern, interactive Conversations Inbox and Ticket Management dashboard on `/dashboard/conversations` for business owners. The interface implements a master-detail split-view layout on desktop (>= 768px) and a drill-down view on mobile (< 768px), providing real-time visibility into customer inquiries, full chronological transcripts with document citation pills, contact email tooling (copy + `mailto:`), and optimistic ticket lifecycle transitions (`open` → `in_progress` → `resolved`).

On the backend, introduce a database migration adding `ticket_status` and `visitor_email` to `conversations`, support saving citation metadata on `messages`, and expose a tenant-isolated `PATCH /api/v1/conversations/{id}/ticket` status mutation endpoint.

On the frontend, deliver Server Actions for auth-scoped fetching and revalidation, a custom `useConversations` hook with 30s background polling and silent list prepending, URL synchronization (`?id=...`), dedicated loading skeletons (`loading.tsx`), error boundaries (`error.tsx`), and 100% adherence to semantic design tokens (ResolvDesk Constitution Principle VII).

---

## Technical Context

**Language/Version**: TypeScript 5.7+ (Node.js 20+), Python 3.12 (FastAPI, Pydantic v2, SQLModel)

**Primary Dependencies**: Next.js 15 (App Router, Server Actions), React 19, Tailwind CSS v4, Lucide React, FastAPI, SQLModel, Alembic, asyncpg, aiosqlite

**Storage**: PostgreSQL (Neon in production, aiosqlite in automated test environments)

**Testing**: `pytest` (backend unit, integration, and contract tests), TypeScript compiler checks (`tsc --noEmit`), ESLint

**Target Platform**: Modern web browsers (Desktop & Mobile, Chrome, Safari, Firefox, Edge)

**Project Type**: Full-stack web application (FastAPI backend + Next.js App Router frontend)

**Performance Goals**:
- Initial inbox layout render under 500ms
- Transcript selection transition under 150ms
- Status mutation optimistic UI feedback under 50ms with non-blocking background sync

**Constraints**:
- Strict multi-tenant isolation at database query filter level (`WHERE organization_id = ...`)
- 100% semantic theme tokens (`bg-background`, `text-foreground`, `border-border`, etc.) with zero hard-coded color palette classes (`slate-*`, `sky-*`, `zinc-*`)
- No disruption of active scroll or selected transcript during 30s background polling

**Scale/Scope**:
- Paginated lists (20 items/page), handling up to 10,000 conversations per organization
- High-message transcripts (50+ turns) rendered with independent virtualization/smooth scrolling

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle / Rule | Compliance Status | Implementation Detail |
|---|---|---|
| **I. Strict Multi-Tenant Isolation** | **PASS** | All list, transcript, and ticket status endpoints filter strictly by `WHERE organization_id = :current_owner_org_id` at the database query level. Cross-tenant access returns 404. |
| **II. Grounded AI & Zero Hallucination** | **PASS** | Grounded turns display document citation pills linking directly to verified knowledge base sources. |
| **III. Continuous Human Safety Net** | **PASS** | Escalated tickets surface prominently with customer contact email, one-click copy, `mailto:` launcher, and interactive ticket resolution lifecycle (`open` → `in_progress` → `resolved`). |
| **IV. Frictionless & Secure Widget** | **PASS** | Anonymous visitor escalations populate `ticket_status='open'` and capture `visitor_email` for administrative follow-up. |
| **V. Layered Architecture & Boundary Defense** | **PASS** | Three-layer backend separation maintained: Router (HTTP/validation) → Service (business logic & transitions) → Repo (DB queries only). Frontend uses Server Actions for boundary communication and cache invalidation. |
| **VI. Provider-Agnostic AI Layer** | **PASS** | AI layer interfaces remain untouched; inbox consumes stored message records and citation payloads. |
| **VII. Strict Semantic Theming & Global Design Tokens** | **PASS** | 100% semantic theme tokens (`bg-background`, `text-foreground`, `border-border`, `bg-card`, `text-muted-foreground`, etc.). Zero hard-coded palette utilities. |
| **Infra: Relational Database & Migrations** | **PASS** | New columns (`ticket_status`, `visitor_email`, `citations`) managed strictly via tracked Alembic migration `005_add_ticket_fields_to_conversations.py`. |
| **Security: Session Security & Route Protection** | **PASS** | Owner auth cookies remain `httpOnly`; privileged dashboard routes protected at server middleware boundary. |
| **UI State Rigor** | **PASS** | Implemented `loading.tsx`, `error.tsx`, empty states, and inline retry handlers without stub/no-op handlers. |

---

## Project Structure

### Documentation (this feature)

```text
specs/009-conversations-inbox-ui/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── inbox_api_contracts.md
│   └── inbox_client_contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository layout)

```text
backend/
├── alembic/versions/
│   └── 005_add_ticket_fields_to_conversations.py # [NEW] Migration for ticket_status & visitor_email
├── app/
│   ├── models/
│   │   └── conversation.py                       # [MODIFY] Add ticket_status, visitor_email, citations
│   ├── schemas/
│   │   ├── conversation.py                       # [MODIFY] Add ticket status schemas & DTO updates
│   │   └── chat.py                               # [MODIFY] Add citations to ChatMessageRead
│   ├── repos/
│   │   └── conversation_repo.py                  # [MODIFY] Query support for ticket fields & status updates
│   ├── services/
│   │   ├── owner_conversation_service.py         # [MODIFY] Ticket status transition logic & validation
│   │   └── chat_service.py                       # [MODIFY] Set ticket_status & visitor_email on escalate
│   └── routers/
│       └── conversations.py                      # [MODIFY] Add PATCH /{id}/ticket endpoint
└── tests/
    ├── contract/
    │   └── test_owner_conversations_contract.py  # [MODIFY] Test PATCH /{id}/ticket & updated schemas
    └── integration/
        └── test_owner_conversations_isolation.py # [MODIFY] Test ticket status tenant isolation

frontend/
├── actions/
│   └── conversation-actions.ts                   # [NEW] Server Actions for conversations & tickets
├── types/
│   └── conversation.ts                           # [NEW] TypeScript domain & UI interfaces
├── components/
│   └── conversations/
│       ├── conversations-inbox.tsx               # [NEW] Split-pane controller, polling, URL syncing
│       ├── conversation-list.tsx                 # [NEW] Sidebar search, filters, pagination, card items
│       ├── conversation-transcript.tsx           # [NEW] Transcript bubbles, citations, mobile back
│       ├── escalation-card.tsx                   # [NEW] Customer email tooling & status selector
│       ├── conversation-stats-cards.tsx          # [NEW] 4 overview metrics cards
│       └── conversations-skeleton.tsx            # [NEW] Loading skeleton state
├── app/
│   └── dashboard/
│       └── conversations/
│           ├── page.tsx                          # [MODIFY] Server component wrapping inbox
│           ├── loading.tsx                       # [NEW] Route loading boundary
│           └── error.tsx                         # [NEW] Route error boundary
```

**Structure Decision**: Standard full-stack web application structure matching existing patterns in `backend/` and `frontend/`.

---

## Complexity Tracking

> **No constitutional violations detected. All gates pass cleanly.**

| Check | Status | Notes |
|---|---|---|
| Tenant Isolation | Verified | Handled at SQLModel repo query level (`organization_id = ...`) |
| Theme Token Discipline | Verified | Component templates verified against Tailwind CSS variables |
| Migration Tracking | Verified | Alembic migration 005 planned |

---

## Phase Execution Outline

### Phase 0: Research (Completed)
- Researched desktop split-pane vs. mobile drill-down patterns.
- Resolved background polling and non-disruptive prepend strategy.
- Verified ticket status transition lifecycle.
- Output: `specs/009-conversations-inbox-ui/research.md`.

### Phase 1: Design & Contracts (Completed)
- Designed SQLModel and Pydantic schemas in `specs/009-conversations-inbox-ui/data-model.md`.
- Documented REST API contracts in `specs/009-conversations-inbox-ui/contracts/inbox_api_contracts.md`.
- Defined Server Actions and React component prop contracts in `specs/009-conversations-inbox-ui/contracts/inbox_client_contracts.md`.
- Formulated end-to-end verification guide in `specs/009-conversations-inbox-ui/quickstart.md`.

### Phase 2: Tasks (Next Step)
- To be generated via `/speckit-tasks` to establish the ordered implementation tasks.
