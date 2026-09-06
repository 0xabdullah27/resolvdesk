# Implementation Plan: Enforce Required Website URL on Signup & Restrict Widget CORS Origins

**Branch**: `011-signup-website-cors` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-signup-website-cors/spec.md`

---

## Summary

Enforce a mandatory store/website address during merchant registration across frontend and backend. Persist the store URL on the `Organization` entity in PostgreSQL via an Alembic migration. During atomic registration, extract and normalize the domain and automatically configure the Organization's default `WidgetConfiguration` with `allowed_origins = f"{domain}, localhost"` instead of open wildcard `*`. This immediately locks widget execution to the merchant's live storefront and local testing environment, preventing unauthorized third-party embeds and AI token exhaustion.

---

## Technical Context

**Language/Version**: Python 3.11 (FastAPI backend), TypeScript 5+ (Next.js 16 App Router frontend)  
**Primary Dependencies**:
- Backend: FastAPI, SQLModel, Pydantic v2, Alembic, asyncpg, Starlette
- Frontend: Next.js 16 (Turbopack), React 19, React Hook Form, Zod, Tailwind CSS v4, Lucide React, Sonner
**Storage**: PostgreSQL (hosted on Neon) via async SQLModel session  
**Testing**: `pytest` (backend unit & contract suites), Jest / RTL (frontend)  
**Target Platform**: Web application (Next.js client + FastAPI resource server)  
**Project Type**: Multi-tenant SaaS Web Application  
**Performance Goals**: Sub-second registration processing (< 500ms API response), 0ms overhead on origin checking  
**Constraints**: Zero downtime schema migration, strict tenant isolation, no hard-coded styling utilities (Constitution VII)  
**Scale/Scope**: All newly provisioned merchant accounts  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Strict Multi-Tenant Isolation)**: PASS. Allowed origins are configured strictly per-tenant on `widget_configurations` (`WHERE organization_id = ...`).
- **Principle V (Layered Architecture & Boundary Defense)**: PASS.
  - Router: `RegistrationCompleteRequest` validates input at API boundary.
  - Service: `RegistrationService` extracts domain, orchestrates multi-table transaction.
  - Repo: `OrganizationRepo` and `WidgetRepo` execute SQL queries.
  - Schema Migration: Managed via Alembic `006_add_website_url_to_organizations.py`.
- **Principle VII (Strict Semantic Theming & Global Design Tokens)**: PASS. Form elements use `text-destructive`, `text-muted-foreground`, `bg-destructive/10`, `border-border`, and `bg-primary`.
- **Infrastructure Constraints (Alembic & Async DB)**: PASS. Migration file included; async SQLAlchemy sessions used.

---

## Project Structure

### Documentation (this feature)

```text
specs/011-signup-website-cors/
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Specification quality checklist (16/16 passing)
├── plan.md              # This file
├── research.md          # Phase 0 decisions & normalization strategy
├── data-model.md        # Phase 1 schema changes & entity models
├── quickstart.md        # Phase 1 verification scenarios
└── contracts/
    └── registration-api.md # Phase 1 API schema contracts
```

### Source Code Impact

```text
backend/
├── alembic/versions/
│   └── 006_add_website_url_to_organizations.py # [NEW] Alembic migration for website_url
├── app/
│   ├── models/
│   │   └── organization.py       # [MODIFY] Add website_url column to OrganizationBase/Organization
│   ├── schemas/
│   │   └── registration.py       # [MODIFY] Add required website_url to RegistrationCompleteRequest
│   ├── repos/
│   │   ├── organization_repo.py  # [MODIFY] Update create_organization to accept website_url
│   │   └── widget_repo.py        # [MODIFY] Support custom allowed_origins default in create_widget_config
│   └── services/
│       └── registration_service.py # [MODIFY] Extract/normalize domain and pass to widget provisioning
└── tests/
    ├── unit/
    │   └── test_registration.py   # [MODIFY] Update test payloads and assert widget allowed_origins
    └── contract/
        └── test_widget_contract.py # [MODIFY] Verify origin restriction contract

frontend/
├── lib/
│   └── validations/
│       └── auth.ts               # [MODIFY] Make websiteUrl strictly required with URL/domain regex
├── components/
│   └── auth/
│       └── register-form.tsx      # [MODIFY] Remove "Optional" badge, add explanatory helper text
└── actions/
    └── auth-actions.ts           # [MODIFY] Ensure websiteUrl is passed to backend registration API
```

---

## Phases

### Phase 0: Outline & Research (Completed)
- Documented domain normalization logic using `urllib.parse`.
- Evaluated and confirmed dual storage on `organizations.website_url` and `widget_configurations.allowed_origins`.
- Output: [`research.md`](./research.md).

### Phase 1: Design & Contracts (Completed)
- Created entity updates in [`data-model.md`](./data-model.md).
- Authored registration endpoint contract in [`contracts/registration-api.md`](./contracts/registration-api.md).
- Created verification scenarios in [`quickstart.md`](./quickstart.md).
- Output: [`data-model.md`](./data-model.md), [`contracts/registration-api.md`](./contracts/registration-api.md), [`quickstart.md`](./quickstart.md).
