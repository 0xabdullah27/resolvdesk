# Implementation Plan: Platform Admin & User Management Dashboard

**Branch**: `013-platform-admin-dashboard` | **Date**: 2026-09-09 | **Spec**: [specs/013-platform-admin-dashboard/spec.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/013-platform-admin-dashboard/spec.md)

**Input**: Feature specification from `specs/013-platform-admin-dashboard/spec.md`

## Summary

Build a dedicated Platform Admin Console (`/admin`) for the ResolvDesk platform creator to monitor high-level system growth (total users, organizations, documents, conversations), search and filter across registered business accounts, inspect workspace resource utilization, and toggle account access (suspend/reactivate). Suspended accounts are immediately blocked from dashboard access and their deployed chat widgets transition into a polite offline state ("Support is temporarily offline") to prevent token consumption.

## Technical Context

**Language/Version**: Python 3.11+ (FastAPI), TypeScript 5+ (Next.js 15+ App Router, React 19)

**Primary Dependencies**: FastAPI, SQLModel, asyncpg, Alembic, Better Auth, Tailwind CSS v4, Lucide React, Axios

**Storage**: PostgreSQL (hosted on Neon) with async connection pooling

**Testing**: `pytest`, `pytest-asyncio`, `HTTPX AsyncClient` (backend); Next.js production build (`npm run build`) and test suites

**Target Platform**: Web browsers, Node.js 20+ runtime, cloud Linux server

**Project Type**: Full-stack web application (FastAPI backend + Next.js App Router frontend)

**Performance Goals**: < 500ms p95 latency for directory search & filtering with server-side pagination; < 1.5s admin KPI metrics load

**Constraints**: Strict tenant privacy preservation (no access to customer chat transcripts), 100% semantic theme token discipline (no hardcoded color utility classes), instant session invalidation on suspension

**Scale/Scope**: Platform administrator console supporting thousands of registered business accounts and millions of customer interactions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post Phase 1 design.*

| Principle | Gate Status | Compliance Details |
|-----------|-------------|-------------------|
| **I. Strict Multi-Tenant Isolation** | **PASS** | Platform admin queries aggregated metrics via explicit SQL aggregations. Customer chat messages and transcripts remain strictly private and inaccessible. |
| **II. Grounded AI & Zero Hallucination** | **PASS** | Admin console does not modify knowledge grounding; suspension prevents unauthorized AI invocation. |
| **III. Continuous Human Safety Net** | **PASS** | Deployed widgets belonging to suspended accounts display an offline notice without trapping users in broken states. |
| **IV. Frictionless & Secure Widget** | **PASS** | Widget handles `is_active: false` gracefully without breaking merchant storefronts. |
| **V. Layered Architecture & Boundary Defense** | **PASS** | Router (`routers/admin.py`) -> Service (`services/admin_service.py`) -> Repo (`repos/admin_repo.py`). Pydantic input validation at the edge. |
| **VI. Provider-Agnostic AI Layer** | **PASS** | No LLM provider specifics are introduced in administrative routing or models. |
| **VII. Strict Semantic Theming & Global Design Tokens** | **PASS** | All `/admin` pages and components use design tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.) with zero hardcoded palette classes (`slate-*`, `zinc-*`, etc.). |

## Project Structure

### Documentation (this feature)

```text
specs/013-platform-admin-dashboard/
├── spec.md              # Feature specification with resolved clarifications
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 technical decisions & architecture
├── data-model.md        # Phase 1 entities, schemas, and state transitions
├── contracts/
│   └── admin-api.yaml   # Phase 1 OpenAPI interface contract
└── quickstart.md        # Phase 1 runnable validation scenarios
```

### Source Code (repository root)

```text
backend/
├── alembic/
│   └── versions/
│       └── xxxx_add_owner_role_and_audit_logs.py   # Schema migration
├── app/
│   ├── core/
│   │   ├── auth.py             # get_current_superadmin dependency
│   │   └── config.py           # PLATFORM_OWNER_EMAIL configuration
│   ├── models/
│   │   ├── owner.py            # Owner model with role field
│   │   └── admin_audit_log.py  # AdminAuditLog SQLModel
│   ├── repos/
│   │   └── admin_repo.py       # Aggregated queries and account updates
│   ├── schemas/
│   │   └── admin.py            # Platform metrics and user summary schemas
│   ├── services/
│   │   ├── admin_service.py    # Admin domain logic and audit logging
│   │   └── widget_service.py   # Widget config returns is_active=False on suspension
│   └── routers/
│       └── admin.py            # /api/v1/admin router endpoints
└── tests/
    └── test_admin_router.py    # Integration tests for admin endpoints

frontend/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx      # Superadmin route layout & nav
│   │       ├── page.tsx        # Platform Admin Dashboard page
│   │       ├── loading.tsx     # Admin route loading skeleton
│   │       └── error.tsx       # Admin route error boundary
├── components/
│   ├── admin/
│   │   ├── metrics-overview.tsx        # KPI summary cards
│   │   ├── user-directory-table.tsx    # Filterable & searchable table
│   │   ├── user-status-badge.tsx       # Semantic status badge
│   │   ├── suspend-user-modal.tsx      # Confirmation dialog for suspension
│   │   └── workspace-metrics-modal.tsx # Read-only workspace resource counters
│   └── navigation/
│       └── user-menu.tsx       # Shows "Admin Console" link for superadmins
├── lib/
│   └── api/
│       └── admin.ts            # Frontend API client for admin endpoints
├── middleware.ts               # Protects /admin routes against unauthorized visitors
└── public/
    └── widget.js               # Handles config.is_active=false offline state
```

**Structure Decision**: Standard web application with distinct backend (`backend/app/...`) and frontend (`frontend/app/...`) modules. Backend strictly follows the 3-layer architecture (router -> service -> repo) and frontend defaults to Server Components with dedicated loading and error boundaries.

## Complexity Tracking

> **Constitution Check passed with zero violations. No complexity justifications required.**
