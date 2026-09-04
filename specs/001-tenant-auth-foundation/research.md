# Research: Multi-Tenant Organization & Owner Authentication Foundation

**Branch**: `001-tenant-auth-foundation` | **Date**: 2026-09-04

---

## R-001: Authentication Architecture (Better Auth + FastAPI JWKS)

**Decision**: Next.js acts as the Auth Authority via Better Auth (email/password, JWT plugin with RS256 JWKS). FastAPI acts as a stateless Resource Server that validates JWTs by fetching public keys from Next.js's `/.well-known/jwks.json` endpoint.

**Rationale**:
- Better Auth natively manages user tables, sessions, password hashing, and token issuance in the Next.js layer.
- FastAPI never stores credentials or manages sessions — it only validates cryptographic signatures via `PyJWKClient`, keeping the backend fully stateless.
- The `jwt()` plugin in Better Auth signs tokens with RS256, embedding `sub` (user_id) and custom claims (e.g., `organization_id`) that FastAPI extracts after verification.
- Session sliding (7-day inactivity expiration) is handled by Better Auth's session configuration on the Next.js side.

**Alternatives Considered**:
- **FastAPI-managed JWT issuance**: Rejected because it duplicates credential management across two services and violates the single-source-of-truth principle for authentication.
- **Auth0 / Clerk**: Rejected because the user chose self-hosted Better Auth for control and cost.

---

## R-002: Database ORM & Async Driver

**Decision**: SQLModel with async sessions via `asyncpg` driver against Neon PostgreSQL.

**Rationale**:
- SQLModel provides a Pydantic + SQLAlchemy hybrid that gives type-safe models and validation in a single class hierarchy.
- `asyncpg` is the fastest async PostgreSQL driver for Python and pairs with SQLAlchemy's async engine.
- Neon provides serverless PostgreSQL with autoscaling and branching for development/testing environments.

**Alternatives Considered**:
- **SQLAlchemy Core only**: Rejected because SQLModel's integrated Pydantic validation reduces boilerplate.
- **Tortoise ORM**: Rejected because SQLModel has better ecosystem support and integrates directly with FastAPI's dependency injection.

---

## R-003: Password Hashing Strategy

**Decision**: Better Auth handles all password hashing internally using bcrypt (its default). FastAPI never sees raw passwords.

**Rationale**:
- Since Better Auth is the auth authority (Next.js), all signup/signin flows go through Better Auth's API. The FastAPI backend never receives or processes raw credentials.
- Better Auth uses bcrypt with configurable work factors by default.

**Alternatives Considered**:
- **Argon2id in FastAPI**: Would only apply if FastAPI managed credentials directly — not applicable in this architecture.

---

## R-004: Multi-Tenant Isolation Strategy

**Decision**: Every table with tenant-scoped data includes an `organization_id` UUID foreign key column. All repository queries include `WHERE organization_id = :org_id` as a mandatory filter. The `organization_id` is extracted from the verified JWT claims (embedded by Better Auth at token issuance time).

**Rationale**:
- Constitution Principle I mandates tenant isolation at the query filter level.
- Embedding `organization_id` in the JWT avoids an extra DB lookup per request to resolve the user's organization.
- Index on `organization_id` on all tenant-scoped tables ensures query performance.

**Alternatives Considered**:
- **Row-Level Security (RLS) in PostgreSQL**: Good long-term option but adds operational complexity; deferred to a future iteration. The application-level WHERE clause is simpler to test and audit now.
- **Separate schemas per tenant**: Rejected because it does not scale with thousands of tenants and complicates migrations.

---

## R-005: Widget Key Generation & Rotation

**Decision**: Widget keys are generated as URL-safe random tokens (`secrets.token_urlsafe(32)`) prefixed with `rd_pub_`. Rotation creates a new primary key and preserves the previous key with a `grace_expires_at` timestamp set to 24 hours in the future. Widget request resolution accepts either the primary key or the grace-period key (if not expired).

**Rationale**:
- `secrets.token_urlsafe(32)` provides 256 bits of entropy — sufficient for public non-secret identifiers.
- The 24-hour grace window prevents service disruption when webmasters need time to update embedded snippets.
- Only one previous key is retained (not a history), keeping the lookup simple.

**Alternatives Considered**:
- **UUID as widget key**: Rejected because UUIDs are predictable and not sufficiently random for public-facing identifiers.
- **No grace period (immediate rotation)**: Rejected per user clarification.

---

## R-006: Login Rate Limiting

**Decision**: Rate limiting is enforced at the FastAPI middleware level using an in-memory sliding window counter keyed by `(IP, email)`. Maximum 5 failed attempts per 15-minute window. On exceeding the limit, the endpoint returns `429 Too Many Requests` with a `Retry-After` header.

**Rationale**:
- IP + email combination prevents a single attacker from locking out accounts globally while still blocking automated credential stuffing from a single source.
- In-memory counter is sufficient for a single-instance deployment; can be replaced with Redis for horizontal scaling in future.

**Alternatives Considered**:
- **Account-level lockout**: Rejected because it enables denial-of-service attacks against legitimate users.
- **CAPTCHA**: Deferred to future iteration; adds frontend complexity.

---

## R-007: Development Authentication Bypass

**Decision**: In development mode (`DEBUG=true`), FastAPI's `get_current_user` dependency supports an `X-Dev-User-Id` and `X-Dev-Org-Id` header bypass that skips JWT verification. This is controlled by an environment flag and is completely disabled in production.

**Rationale**:
- FR-012 requires development-friendly auth for testing backend APIs before the Next.js frontend is operational.
- The dev bypass allows Swagger UI testing and pytest integration tests without running Better Auth.
- Production safety is ensured by the `DEBUG` environment variable gate.

**Alternatives Considered**:
- **Mock JWT server**: Higher fidelity but significantly more setup for early development.
- **Test fixtures with `unittest.mock.patch`**: Used alongside the header bypass for unit tests.

---

## R-008: Password Reset Token Mechanism

**Decision**: Password reset is handled entirely by Better Auth's built-in `forgetPassword` and `resetPassword` flows. Better Auth generates a time-limited token (configured to 15 minutes), sends it to the user's email (or logs it in dev mode), and validates it on submission.

**Rationale**:
- Better Auth already manages user credentials and has built-in password reset support.
- No custom token table is needed in the FastAPI backend.
- Dev mode email can be configured to log to console instead of sending real emails.

**Alternatives Considered**:
- **Custom reset token table in FastAPI**: Rejected because it duplicates Better Auth's built-in functionality.

---

## R-009: Project Package Management

**Decision**: `uv` for Python dependency management in the backend. `npm` for frontend (Next.js) dependencies.

**Rationale**:
- `uv` is significantly faster than pip/poetry for dependency resolution and installation.
- Native `pyproject.toml` support with lockfile generation.

**Alternatives Considered**:
- **Poetry**: Slower resolution; `uv` is the modern replacement.
- **pip + requirements.txt**: No lockfile, no reproducible builds.
