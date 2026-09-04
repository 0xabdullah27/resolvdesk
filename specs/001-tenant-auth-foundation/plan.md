# Implementation Plan: Multi-Tenant Organization & Owner Authentication Foundation (Backend First)

**Branch**: `001-tenant-auth-foundation` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tenant-auth-foundation/spec.md`

## Summary

Implements the backend multi-tenant organization and business owner authentication foundation for ResolvDesk. Following a **Backend-First** strategy, this milestone establishes the FastAPI Resource Server: SQLModel data models, Alembic migrations, layered repository queries enforcing strict tenant isolation (`WHERE organization_id = ...`), service-layer atomic registration and provisioning transactions, unauthenticated public widget configuration endpoints, and stateless PyJWKClient JWT verification against Better Auth's JWKS. Frontend UI forms, pages, and dashboard layouts are deferred to a subsequent frontend milestone.

## Technical Context

**Language/Version**: Python 3.12+ (Backend Resource Server); Node.js 20+ / TypeScript 5.x (Auth Identity Provider only)

**Primary Dependencies**:
- **Backend (Primary Focus)**: FastAPI 0.115+, SQLModel 0.0.22+, asyncpg 0.29+, Pydantic v2, PyJWT / PyJWKClient, Alembic 1.13+
- **Auth Provider (Minimal Integration)**: Next.js 16 App Router, Better Auth (JWT & JWKS plugins) to expose `GET /api/auth/jwks`

**Storage**: PostgreSQL (Neon-hosted or local PostgreSQL 16+) with asyncpg connection pooling and SQLModel ORM; schema changes tracked via Alembic migrations.

**Testing**:
- **Backend**: pytest, pytest-asyncio, httpx, TestClient
- **Auth Simulation / Mocking**: Local RSA keypair and mock JWKS provider for isolated backend contract and tenant tests without external runtime dependencies (FR-012).

**Target Platform**: Linux / Cloud Containers (Docker, Google Cloud Run, Neon PostgreSQL)

**Project Type**: Backend Web Service (FastAPI async Resource Server with JWKS authentication)

**Performance Goals**:
- < 200ms p95 API response latency on authenticated endpoints
- Sub-millisecond JWT verification overhead via local PyJWKClient in-memory key caching (LRU cache with 24-hour TTL)

**Constraints**:
- Strict multi-tenant query filtering (`WHERE organization_id = ...`) enforced at the repository query level
- Zero shared-memory tenant state on backend services
- Atomic multi-table mutations for registration and provisioning (wrapped in DB transactions)
- Pure backend focus: UI components, React forms, and dashboard layouts deferred to frontend milestone

**Scale/Scope**: Designed to scale to 10,000+ active organizations; establishes the core database and API boundary for all downstream modules (RAG ingestion, chat sessions, ticket escalation).

## Constitution Check

*GATE: Evaluated before Phase 0 research and verified post-Phase 1 design.*

| Principle / Rule | Compliance Status | Implementation Detail |
|---|---|---|
| **I. Strict Multi-Tenant Isolation** | **PASS** | Every query filtering by tenant executes `WHERE organization_id = ...` at the repository layer. Tenant ID is resolved from authenticated JWT claims, never trusted from client parameters. |
| **IV. Frictionless & Secure Widget** | **PASS** | Generates unique public widget keys (`rd_live_...`). Public widget config endpoint (`GET /api/v1/widget/config`) operates unauthenticated and read-only, never exposing private tenant IDs or owner credentials. |
| **V. Layered Architecture & Boundary Defense** | **PASS** | Strict Router → Service → Repo layering in FastAPI. All client inputs validated via Pydantic v2 schemas at the API boundary. Atomic provisioning transaction wraps Organization and Widget creation. |
| **Infrastructure: Relational DB & Migrations** | **PASS** | Neon PostgreSQL accessed via SQLModel async sessions. All DDL tracked in Alembic migrations. |
| **Security: Session & Route Protection** | **PASS** | Bearer JWT statelessly verified on FastAPI via cached JWKS public keys. Inactive tokens rejected. |
| **Quality Gates: Testing Standards** | **PASS** | Automated contract tests (`contracts/api.md`), tenant-isolation integration tests, and schema unit tests executed via pytest-asyncio. |

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
│   │   ├── auth.py          # PyJWKClient JWT verification dependency & dev token generator
│   │   ├── config.py        # Pydantic Settings (DB, JWKS URL, CORS)
│   │   ├── database.py      # Async engine & sessionmaker
│   │   └── logging.py       # Structured logging with tenant correlation IDs
│   ├── models/
│   │   ├── organization.py  # SQLModel Organization entity
│   │   ├── owner.py         # SQLModel Owner entity
│   │   └── widget.py        # SQLModel Widget entity
│   ├── repos/
│   │   ├── organization_repo.py # Tenant-isolated queries (WHERE organization_id = ...)
│   │   └── widget_repo.py       # Public key & widget queries
│   ├── routers/
│   │   ├── organizations.py # Owner organization management endpoints (GET /me, GET /profile, POST /rotate-key)
│   │   ├── registration.py  # Atomic registration completion endpoint (POST /registration/complete)
│   │   └── widget.py        # Public unauthenticated widget endpoint (GET /widget/config)
│   ├── schemas/
│   │   ├── organization.py  # Pydantic input/output schemas
│   │   ├── registration.py  # Pydantic registration payload schemas
│   │   └── widget.py        # Pydantic widget config & rotation schemas
│   ├── services/
│   │   ├── organization_service.py # Organization profile & security logic
│   │   ├── registration_service.py # Atomic multi-entity provisioning transaction
│   │   └── widget_service.py       # Key generation & 24h grace rotation logic
│   └── main.py              # FastAPI app, CORS, error handlers, router mounting
├── tests/
│   ├── conftest.py          # Test database fixtures, mock JWKS keys, and client fixtures
│   ├── contract/            # Contract verification tests against contracts/api.md
│   ├── integration/         # Multi-tenant isolation & atomic registration rollback tests
│   └── unit/                # JWT validation & Pydantic schema tests
├── alembic.ini
└── pyproject.toml

frontend/
├── app/
│   └── api/
│       └── auth/
│           └── [...all]/ # Minimal Better Auth route handler (exposes /jwks and /token for live E2E tests)
├── lib/
│   └── auth.ts          # Better Auth server configuration with JWT & JWKS plugins
├── package.json
└── tsconfig.json
```

**Scope Demarcation**:
- **In Scope (Current Milestone)**: Complete FastAPI backend resource server (models, migrations, repos, services, routers, auth validation, and test suite), plus minimal Better Auth server configuration in Next.js to provide the JWKS endpoint.
- **Deferred to Next Milestone**: All frontend UI components, forms (sign-in, sign-up, forgot password), Redux store slices, dashboard layouts, and browser pages.

## Complexity Tracking

> **No Constitution violations detected.** All architectural gates and constraints are fully adhered to without requiring complexity justifications or exceptions.
