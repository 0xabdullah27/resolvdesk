# Implementation Plan: Multi-Tenant Organization & Owner Authentication Foundation

**Branch**: `001-tenant-auth-foundation` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tenant-auth-foundation/spec.md`

## Summary

Implements the multi-tenant organization and business owner authentication foundation for ResolvDesk. The solution establishes self-service store owner registration, atomic organization & widget key provisioning, owner session management via Better Auth on Next.js 15+ App Router, stateless JWT verification on FastAPI via Better Auth's JWKS endpoint, and strict database query-level multi-tenant isolation (`WHERE organization_id = ...`) in the repository layer.

## Technical Context

**Language/Version**: Python 3.12+ (Backend Resource Server), TypeScript 5.x / Node.js 20+ (Frontend Auth & Dashboard)

**Primary Dependencies**:
- **Backend**: FastAPI 0.115+, SQLModel 0.0.22+, asyncpg 0.29+, Pydantic v2, PyJWT / PyJWKClient, Alembic 1.13+
- **Frontend**: Next.js 15+ (App Router), Better Auth (with JWT & JWKS plugins), Tailwind CSS v4, Redux Toolkit, Axios

**Storage**: PostgreSQL (Neon-hosted or local PostgreSQL 16+) with asyncpg connection pooling and SQLModel ORM; schema changes tracked via Alembic migrations.

**Testing**:
- **Backend**: pytest, pytest-asyncio, httpx, TestClient
- **Frontend**: Jest, React Testing Library

**Target Platform**: Linux / Cloud Containers (Docker, Google Cloud Run, Vercel, Neon PostgreSQL)

**Project Type**: Web Application (Next.js frontend Auth Server/Dashboard + FastAPI async backend Resource Server)

**Performance Goals**:
- < 200ms p95 API response latency on authenticated endpoints
- Sub-millisecond JWT verification overhead via local PyJWKClient in-memory key caching (LRU cache with 24-hour TTL)

**Constraints**:
- Strict multi-tenant query filtering (`WHERE organization_id = ...`) enforced at the database query level
- Owner session tokens stored exclusively in httpOnly, Secure cookies; never in client-accessible storage (`localStorage`/`sessionStorage`)
- Zero shared-memory tenant state on backend services
- Atomic multi-table mutations for registration and provisioning

**Scale/Scope**: Designed to scale to 10,000+ active organizations; initial foundation establishes 2 cooperating services (Next.js and FastAPI).

## Constitution Check

*GATE: Evaluated before Phase 0 research and verified post-Phase 1 design.*

| Principle / Rule | Compliance Status | Implementation Detail |
|---|---|---|
| **I. Strict Multi-Tenant Isolation** | **PASS** | Every query filtering by tenant executes `WHERE organization_id = ...` at the repository layer. Tenant ID is extracted directly from verified JWT claims, never trusted from client route parameters. |
| **IV. Frictionless & Secure Widget** | **PASS** | Generates unique public widget keys (`rd_live_...`). Public widget config endpoint operates unauthenticated and strictly read-only, never exposing administrative or tenant internal IDs. |
| **V. Layered Architecture & Boundary Defense** | **PASS** | Backend strictly structured as Router -> Service -> Repo. All client payloads validated with Pydantic v2 schemas at the boundary. Atomic provisioning transaction wraps Organization and Widget creation. |
| **Infrastructure: Relational DB & Migrations** | **PASS** | Neon PostgreSQL accessed via SQLModel async sessions. All DDL tracked in Alembic migrations. |
| **Security: Session & Route Protection** | **PASS** | Better Auth manages sessions in httpOnly cookies. Next.js `middleware.ts` guards dashboard routes server-side. Bearer JWT statelessly verified on FastAPI via JWKS public keys. |
| **Quality Gates: Testing Standards** | **PASS** | Contract tests (`contracts/api.md`), integration isolation tests, and schema unit tests defined for continuous verification. |

## Project Structure

### Documentation (this feature)

```text
specs/001-tenant-auth-foundation/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output: Architecture & tech choices (/speckit-plan)
├── data-model.md        # Phase 1 output: Entities, schema, indexes (/speckit-plan)
├── quickstart.md        # Phase 1 output: Validation scenarios (/speckit-plan)
├── contracts/           # Phase 1 output: API specifications (/speckit-plan)
│   └── api.md
└── tasks.md             # Phase 2 output: Actionable tasks (/speckit-tasks)
```

### Source Code Layout

```text
backend/
├── alembic/
│   ├── versions/            # Database migration scripts
│   └── env.py               # Async Alembic environment configuration
├── app/
│   ├── core/
│   │   ├── auth.py          # PyJWKClient JWT verification dependency & Security
│   │   ├── config.py        # Pydantic Settings (DB, JWKS URL, CORS)
│   │   └── database.py      # Async engine & sessionmaker
│   ├── models/
│   │   ├── organization.py  # SQLModel Organization entity
│   │   ├── owner.py         # SQLModel Owner entity
│   │   └── widget.py        # SQLModel Widget entity
│   ├── repos/
│   │   ├── organization_repo.py # Tenant-isolated queries
│   │   └── widget_repo.py       # Public key & widget queries
│   ├── routers/
│   │   ├── organizations.py # Owner organization management endpoints
│   │   ├── registration.py  # Atomic registration completion endpoint
│   │   └── widget.py        # Public unauthenticated widget endpoint
│   ├── schemas/
│   │   ├── organization.py  # Pydantic input/output schemas
│   │   └── registration.py  # Pydantic registration payload schemas
│   ├── services/
│   │   ├── organization_service.py # Organization business logic
│   │   └── registration_service.py # Atomic multi-entity provisioning transaction
│   └── main.py              # FastAPI app, CORS, error handlers, router mounting
├── tests/
│   ├── contract/            # Contract verification tests against api.md
│   ├── integration/         # Multi-tenant isolation & atomic registration tests
│   └── unit/                # JWT validation & Pydantic schema tests
├── alembic.ini
└── pyproject.toml

frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/     # Store owner login page
│   │   │   └── sign-up/     # Store owner registration page
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/   # Protected owner dashboard
│   │   │   ├── settings/    # Organization & widget settings
│   │   │   ├── error.tsx    # Route error boundary
│   │   │   └── loading.tsx  # Suspense loading boundary
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...all]/ # Better Auth route handler (exposes /jwks, /sign-in, /sign-up)
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Landing page / store owner onboarding
│   ├── components/
│   │   ├── forms/           # Registration and login forms with React Hook Form + Zod
│   │   ├── layout/          # Dashboard sidebar and header navigation
│   │   └── ui/              # Reusable UI primitives (buttons, inputs, cards)
│   ├── lib/
│   │   ├── api.ts           # Axios client configured with JWT Bearer interceptor
│   │   ├── auth.ts          # Better Auth server configuration with JWT & JWKS plugins
│   │   └── auth-client.ts   # Better Auth client hooks (useSession, signIn, signUp)
│   ├── store/
│   │   ├── hooks.ts         # Pre-typed Redux hooks (useAppDispatch, useAppSelector)
│   │   ├── index.ts         # Redux Toolkit store configuration
│   │   └── slices/          # Organization and UI state slices
│   └── middleware.ts        # Next.js server-side route protection
├── tests/                   # Frontend component and integration tests
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

**Structure Decision**: Web application layout separating Next.js (`frontend/`) and FastAPI (`backend/`). Next.js serves the owner dashboard and acts as the Better Auth Identity Provider, exposing public JWKS keys. FastAPI acts as the stateless Resource Server verifying JWTs and handling business logic with strict SQLModel repository tenant boundaries.

## Complexity Tracking

> **No Constitution violations detected.** All architectural gates and constraints are fully adhered to without requiring complexity justifications or exceptions.
