# Tasks: Multi-Tenant Organization & Owner Authentication Foundation

**Input**: Design documents from `/specs/001-tenant-auth-foundation/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: Included per Constitution quality gates (Principle I tenant isolation, contract verification, schema validation).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g. `[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task specifies exact file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, environment configuration, database connection, and migrations framework.

- [ ] T001 Initialize backend environment with uv and FastAPI dependencies in `backend/pyproject.toml`
- [ ] T002 Initialize Next.js 15+ frontend application with TypeScript, Tailwind CSS v4, and Redux Toolkit in `frontend/package.json`
- [ ] T003 [P] Configure environment settings and Pydantic Settings in `backend/app/core/config.py`
- [ ] T004 [P] Configure frontend environment variables in `frontend/.env.local.example` and `frontend/.env.local`
- [ ] T005 [P] Setup asyncpg database engine, sessionmaker, and connection pooling in `backend/app/core/database.py`
- [ ] T006 [P] Configure Alembic async migrations environment in `backend/alembic.ini` and `backend/alembic/env.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 [P] Implement SQLModel entities for Organization, Owner, and Widget in `backend/app/models/organization.py`, `backend/app/models/owner.py`, and `backend/app/models/widget.py`
- [ ] T008 Generate and verify baseline database schema migration in `backend/alembic/versions/001_initial_auth_tables.py`
- [ ] T009 [P] Setup Better Auth server configuration with JWT and JWKS plugins in `frontend/src/lib/auth.ts`
- [ ] T010 [P] Implement Next.js catch-all route handler exposing Better Auth and JWKS in `frontend/src/app/api/auth/[...all]/route.ts`
- [ ] T011 Implement PyJWKClient JWT verification dependency with in-memory key caching in `backend/app/core/auth.py`
- [ ] T012 [P] Implement development authentication test token generator for automated testing in `backend/app/core/auth.py`
- [ ] T013 [P] Configure Axios client with JWT Bearer token interceptor in `frontend/src/lib/api.ts`
- [ ] T014 Setup Redux Toolkit store and typed hooks in `frontend/src/store/index.ts` and `frontend/src/store/hooks.ts`
- [ ] T015 Setup FastAPI application with CORS middleware, error handlers, and router mounting in `backend/app/main.py`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Business Owner Account & Organization Registration (Priority: P1) 🎯 MVP

**Goal**: Enable a new e-commerce store owner to register with email/password and business details, atomically provisioning the owner account, organization workspace, and default widget configuration in a single transaction.

**Independent Test**: Register with valid owner and business details; verify that the owner, organization, and default widget configuration records are simultaneously created in PostgreSQL with an active session, and that any failure triggers a complete rollback with zero orphaned records.

### Tests for User Story 1

- [ ] T016 [P] [US1] Contract test for registration complete endpoint in `backend/tests/contract/test_registration_contract.py`
- [ ] T017 [P] [US1] Integration test for atomic rollback on registration failure in `backend/tests/integration/test_registration_atomicity.py`

### Implementation for User Story 1

- [ ] T018 [P] [US1] Define Pydantic request and response schemas for registration in `backend/app/schemas/registration.py`
- [ ] T019 [P] [US1] Implement organization and owner database queries in `backend/app/repos/organization_repo.py`
- [ ] T020 [P] [US1] Implement widget database queries in `backend/app/repos/widget_repo.py`
- [ ] T021 [US1] Implement RegistrationService orchestrating atomic multi-table transaction in `backend/app/services/registration_service.py`
- [ ] T022 [US1] Implement registration endpoint `POST /api/v1/registration/complete` in `backend/app/routers/registration.py`
- [ ] T023 [P] [US1] Setup Better Auth client hooks in `frontend/src/lib/auth-client.ts`
- [ ] T024 [P] [US1] Implement Owner Registration Form with React Hook Form and Zod in `frontend/src/components/forms/register-form.tsx`
- [ ] T025 [US1] Create Store Owner Registration page calling Better Auth sign-up and backend provisioning in `frontend/src/app/(auth)/sign-up/page.tsx`

**Checkpoint**: User Story 1 is fully functional and testable independently (MVP ready).

---

## Phase 4: User Story 2 - Secure Owner Login & Session Management (Priority: P1)

**Goal**: Enable an existing store owner to log in securely, receive a 7-day sliding session, withstand brute-force attacks via rate limiting, access server-protected routes, and log out immediately revoking access.

**Independent Test**: Log in with valid credentials and verify session token is issued; verify 5 consecutive failed logins trigger rate-limiting cooldown; verify protected dashboard route rejects unauthenticated access; verify logout terminates active session.

### Tests for User Story 2

- [ ] T026 [P] [US2] Contract test for Better Auth login and token endpoints in `frontend/tests/contract/test_auth_contract.test.ts`
- [ ] T027 [P] [US2] Unit test for login rate limiting and cooldown responses in `backend/tests/unit/test_login_rate_limiting.py`
- [ ] T028 [P] [US2] Integration test for protected route middleware in `frontend/tests/integration/test_middleware.test.ts`

### Implementation for User Story 2

- [ ] T029 [P] [US2] Configure Better Auth rate limiting plugin and 7-day sliding session duration in `frontend/src/lib/auth.ts`
- [ ] T030 [P] [US2] Implement Owner Login Form with React Hook Form and Zod in `frontend/src/components/forms/login-form.tsx`
- [ ] T031 [US2] Create Store Owner Login page in `frontend/src/app/(auth)/sign-in/page.tsx`
- [ ] T032 [US2] Implement Next.js server-side route protection middleware in `frontend/src/middleware.ts`
- [ ] T033 [P] [US2] Implement authenticated owner current profile endpoint `GET /api/v1/me` in `backend/app/routers/organizations.py`
- [ ] T034 [US2] Create authenticated dashboard shell with logout handler in `frontend/src/app/(dashboard)/dashboard/page.tsx`
- [ ] T035 [P] [US2] Implement error boundary and loading suspense states in `frontend/src/app/(dashboard)/error.tsx` and `frontend/src/app/(dashboard)/loading.tsx`

**Checkpoint**: User Stories 1 and 2 are fully functional and integrated.

---

## Phase 5: User Story 3 - Organization Profile & Default Widget Provisioning (Priority: P2)

**Goal**: Allow authenticated owners to view their organization settings, rotate their public widget key with a 24-hour grace period, and expose an unauthenticated public widget configuration endpoint for website visitors with strict tenant isolation.

**Independent Test**: Query organization profile as Owner 1 and verify tenant isolation prevents Owner 2 from reading or modifying it; trigger widget key rotation and verify both old and new keys work for 24 hours; verify unauthenticated visitor can fetch widget config via `GET /api/v1/widget/config?key=rd_live_...`.

### Tests for User Story 3

- [ ] T036 [P] [US3] Integration test verifying strict multi-tenant query isolation (`WHERE organization_id = ...`) and cross-tenant 403 rejection in `backend/tests/integration/test_tenant_isolation.py`
- [ ] T037 [P] [US3] Contract test for key rotation and widget config endpoints in `backend/tests/contract/test_widget_contract.py`

### Implementation for User Story 3

- [ ] T038 [P] [US3] Define Pydantic schemas for organization profile and widget settings in `backend/app/schemas/organization.py` and `backend/app/schemas/widget.py`
- [ ] T039 [US3] Implement OrganizationService for profile retrieval and tenant validation in `backend/app/services/organization_service.py`
- [ ] T040 [P] [US3] Implement WidgetService supporting key generation and 24-hour grace rotation in `backend/app/services/widget_service.py`
- [ ] T041 [US3] Implement organization profile endpoint `GET /api/v1/organization/profile` in `backend/app/routers/organizations.py`
- [ ] T042 [US3] Implement key rotation endpoint `POST /api/v1/organization/widget/rotate-key` in `backend/app/routers/organizations.py`
- [ ] T043 [US3] Implement unauthenticated public widget configuration endpoint `GET /api/v1/widget/config` in `backend/app/routers/widget.py`
- [ ] T044 [P] [US3] Implement Redux slice for organization and widget settings in `frontend/src/store/slices/organization-slice.ts`
- [ ] T045 [US3] Create Organization and Widget Settings page with embed code snippet and key rotation modal in `frontend/src/app/(dashboard)/settings/page.tsx`

**Checkpoint**: User Stories 1, 2, and 3 are functional and isolated.

---

## Phase 6: User Story 4 - Account Password Recovery & Security Reset (Priority: P3)

**Goal**: Provide a self-service password recovery mechanism using a 15-minute time-limited reset token, enabling locked-out owners to reset their password and invalidate existing sessions.

**Independent Test**: Request password reset for a registered email; verify 15-minute token is generated; complete reset with new password; verify old password is rejected and old sessions are invalidated; verify expired token (> 15 minutes) is rejected.

### Tests for User Story 4

- [ ] T046 [P] [US4] Integration test for password reset request, 15-minute expiration, and session invalidation in `frontend/tests/integration/test_password_reset.test.ts`

### Implementation for User Story 4

- [ ] T047 [P] [US4] Configure Better Auth password reset plugin with 15-minute token expiry in `frontend/src/lib/auth.ts`
- [ ] T048 [P] [US4] Implement Forgot Password request form with React Hook Form and Zod in `frontend/src/components/forms/forgot-password-form.tsx`
- [ ] T049 [US4] Create Forgot Password request page in `frontend/src/app/(auth)/forgot-password/page.tsx`
- [ ] T050 [P] [US4] Implement Reset Password confirmation form with React Hook Form and Zod in `frontend/src/components/forms/reset-password-form.tsx`
- [ ] T051 [US4] Create Reset Password page in `frontend/src/app/(auth)/reset-password/page.tsx`

**Checkpoint**: All 4 User Stories are fully functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: System-wide hardening, structured logging, OpenAPI documentation, and end-to-end quickstart validation.

- [ ] T052 [P] Implement structured logging with tenant context and request correlation ID in `backend/app/core/logging.py`
- [ ] T053 [P] Configure OpenAPI documentation tags, security schemes, and error schemas in `backend/app/main.py`
- [ ] T054 Run and verify all 5 end-to-end validation scenarios in `specs/001-tenant-auth-foundation/quickstart.md`
- [ ] T055 Update README setup instructions for full-stack authentication foundation in `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

```mermaid
flowchart TD
    P1[Phase 1: Setup] --> P2[Phase 2: Foundational]
    P2 --> P3[Phase 3: US1 - Registration (P1) 🎯 MVP]
    P2 --> P4[Phase 4: US2 - Login & Sessions (P1)]
    P3 --> P4
    P4 --> P5[Phase 5: US3 - Profile & Widget (P2)]
    P4 --> P6[Phase 6: US4 - Password Reset (P3)]
    P5 --> P7[Phase 7: Polish & Cross-Cutting]
    P6 --> P7
```

- **Setup (Phase 1)**: Can start immediately (no dependencies).
- **Foundational (Phase 2)**: Depends on Phase 1; **BLOCKS all user stories**.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Establishes owner and organization data.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and integrates with US1 for authentication credentials.
- **User Story 3 (Phase 5)**: Depends on Phase 4 (requires authenticated owner context).
- **User Story 4 (Phase 6)**: Depends on Phase 4 (recovers registered owner credentials).
- **Polish (Phase 7)**: Depends on completion of desired user stories.

---

## Parallel Execution Opportunities

### Phase 1 & 2 (Foundational)
```text
Parallel Stream A (Backend):  T001 -> T003 -> T005 -> T006 -> T007 -> T008 -> T011 -> T012 -> T015
Parallel Stream B (Frontend): T002 -> T004 -> T009 -> T010 -> T013 -> T014
```

### User Story 1 (Registration MVP)
```text
Parallel Stream A (Backend):  T016 (test) -> T018 -> T019 & T020 -> T021 -> T022
Parallel Stream B (Frontend): T023 -> T024 -> T025
```

### User Story 2 (Login & Session)
```text
Parallel Stream A (Backend):  T027 (test) -> T033
Parallel Stream B (Frontend): T026 (test) -> T028 (test) -> T029 -> T030 -> T031 -> T032 -> T034 -> T035
```

### User Story 3 (Profile & Widget)
```text
Parallel Stream A (Backend):  T036 (test) & T037 (test) -> T038 -> T039 & T040 -> T041, T042, T043
Parallel Stream B (Frontend): T044 -> T045
```

---

## Implementation Strategy & MVP

### MVP Scope (Phases 1, 2, and 3)
1. Complete **Phase 1: Setup** and **Phase 2: Foundational**.
2. Complete **Phase 3: User Story 1 (Registration)**.
3. **Validate MVP**: Ensure an owner can register, receive their organization and default widget key, and confirm all records exist in PostgreSQL.

### Incremental Milestones
- **Increment 1 (MVP)**: User Story 1 complete — self-service registration works.
- **Increment 2**: User Story 2 complete — store owners can log in, stay authenticated across reloads, and access protected dashboards.
- **Increment 3**: User Story 3 complete — store owners can view their embed code, rotate widget keys with a 24-hour grace window, and visitors can fetch public widget configurations unauthenticated.
- **Increment 4**: User Story 4 complete — self-service password recovery flow operates with 15-minute token expiry.
- **Increment 5**: Phase 7 Polish complete — full test suite passing and quickstart scenarios verified.
