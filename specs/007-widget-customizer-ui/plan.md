# Implementation Plan: Widget Customizer UI & Configuration Management

**Branch**: `007-widget-customizer-ui` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-widget-customizer-ui/spec.md`

## Summary

Feature 007 implements the **Widget Customizer UI** on `/dashboard/widget`, connecting Next.js 16 App Router frontend to FastAPI backend endpoints. Business owners can customize bot branding (display name, welcome greeting, 6-color preset swatches + custom hex code, placement, and authorized domains), preview changes instantly in a visual-only interactive simulation canvas (< 50ms reactivity), copy their live embed `<script>` snippet, and rotate their public widget key with a 24-hour grace window to ensure zero storefront downtime.

## Technical Context

**Language/Version**: TypeScript 5.8 (Next.js 16.3 / React 19) + Python 3.12 (FastAPI 0.115)  
**Primary Dependencies**:
- Frontend: `next@16.3`, `react-hook-form`, `@hookform/resolvers`, `zod`, `lucide-react`, Tailwind CSS v4, Base UI primitives.
- Backend: `fastapi`, `sqlmodel`, `asyncpg`, `pydantic`.  
**Storage**: PostgreSQL (hosted on Neon) using SQLModel async sessions.  
**Testing**: `pytest` (backend contracts and unit tests), `npm run build` (frontend typecheck and bundle validation).  
**Target Platform**: Modern web browsers (desktop and mobile responsive); deployed on Vercel (frontend) and Cloud / Docker (backend).  
**Project Type**: Full-stack web application (FastAPI backend + Next.js App Router frontend).  
**Performance Goals**: Live preview reaction latency < 50ms; embed snippet copy feedback < 100ms; backend update response < 200ms.  
**Constraints**:
- Strict multi-tenant query isolation (`WHERE organization_id = ...`) per Constitution Principle I.
- 100% semantic CSS theme tokens (`bg-card`, `text-foreground`, `border-border`, etc.) per Constitution Principle VII.
- Dual-key 24-hour rotation grace period to prevent storefront outages per Constitution Principle IV.  
**Scale/Scope**: Up to 50 documents grounded per tenant; 1 widget configuration per organization.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- [x] **Principle I: Strict Multi-Tenant Isolation**: `PATCH /api/v1/organization/widget` queries and mutations strictly filter by `WHERE organization_id = :org_id` at the database level.
- [x] **Principle II: Grounded AI & Zero Hallucination**: N/A for customizer UI (handled by answer engine in Feature 003).
- [x] **Principle III: Continuous Human Safety Net**: N/A for customizer UI (escalation handled in Feature 004/008).
- [x] **Principle IV: Frictionless & Secure Widget**: Public widget keys (`rd_live_*`) are read-only; key rotation preserves a 24-hour grace window for uninterrupted visitor chats.
- [x] **Principle V: Layered Architecture & Boundary Defense**: Backend changes follow router -> service -> repo; client inputs validated with Zod before mutation.
- [x] **Principle VI: Provider-Agnostic AI Layer**: N/A for widget customizer.
- [x] **Principle VII: Strict Semantic Theming & Global Design Tokens**: All frontend components use semantic tokens (`bg-background`, `border-border`, `text-primary`, etc.); custom user brand colors are applied strictly to preview elements via inline CSS properties.

## Project Structure

### Documentation (this feature)

```text
specs/007-widget-customizer-ui/
├── plan.md              # This file
├── research.md          # Phase 0 decisions & tradeoffs
├── data-model.md        # Entities, schemas & state transitions
├── quickstart.md        # Verification and manual test scenarios
├── contracts/           # API and UI interface contracts
│   └── widget_customizer_contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   └── widget.py                        # Existing WidgetConfiguration model
│   ├── repos/
│   │   └── widget_repo.py                   # Add update_config method
│   ├── schemas/
│   │   └── organization.py                  # Add WidgetUpdateRequest schema
│   ├── services/
│   │   └── widget_service.py                # Add update_config service method
│   └── routers/
│       └── organizations.py                 # Add PATCH /organization/widget endpoint
└── tests/
    └── contract/
        └── test_widget_contract.py          # Contract tests for PATCH /organization/widget

frontend/
├── actions/
│   └── widget-actions.ts                    # Server Actions (get, update, rotate)
├── types/
│   └── widget.ts                            # WidgetConfig & payload types
├── lib/
│   └── validations/
│       └── widget.ts                        # Zod form validation schema
├── components/
│   └── widget/
│       ├── widget-customizer-view.tsx       # Main client container orchestrating state
│       ├── widget-appearance-form.tsx       # Form inputs for name, greeting, color, placement
│       ├── widget-domains-card.tsx          # Allowed domains radio toggle & list input
│       ├── widget-live-preview.tsx          # Interactive visual sandbox (bubble & mock chat)
│       ├── widget-embed-card.tsx            # Embed script block with copy & rotate buttons
│       ├── widget-rotate-dialog.tsx         # Confirmation modal for 24h key rotation
│       └── widget-reset-dialog.tsx          # Confirmation modal for factory reset
└── app/
    └── dashboard/
        └── widget/
            ├── page.tsx                     # Server Component fetching initial config
            ├── loading.tsx                  # Route loading skeleton
            └── error.tsx                    # Error boundary
```

## Complexity Tracking

> **No violations of constitutional principles. All gates passed.**
