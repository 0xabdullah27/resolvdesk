# Implementation Tasks: Platform Admin & User Management Dashboard

**Feature Branch**: `013-platform-admin-dashboard` | **Spec**: [specs/013-platform-admin-dashboard/spec.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/013-platform-admin-dashboard/spec.md) | **Plan**: [specs/013-platform-admin-dashboard/plan.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/013-platform-admin-dashboard/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema extensions, model definitions, and shared configuration for platform administration.

- [X] T001 Configure platform administrator settings in backend/app/core/config.py
- [X] T002 [P] Create Alembic migration for owner role column and audit logs in backend/alembic/versions/20260909_add_owner_role_and_audit_logs.py
- [X] T003 [P] Update Owner and OwnerBase SQLModel with role attribute in backend/app/models/owner.py
- [X] T004 [P] Create AdminAuditLog SQLModel in backend/app/models/admin_audit_log.py
- [X] T005 [P] Create Pydantic schemas for admin metrics, directory, and status in backend/app/schemas/admin.py

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend repositories, superadmin authentication dependencies, frontend client, and edge middleware that MUST be complete before any user story can be implemented.

⚠️ **CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Implement aggregated metrics and directory query methods in backend/app/repos/admin_repo.py
- [X] T007 [P] Implement audit logging persistence methods in backend/app/repos/admin_audit_log_repo.py
- [X] T008 Implement get_current_superadmin dependency in backend/app/core/auth.py
- [X] T009 Add superadmin account role bootstrap logic on startup in backend/app/main.py
- [X] T010 Implement AdminService business logic layer in backend/app/services/admin_service.py
- [X] T011 Create and register admin router endpoints in backend/app/routers/admin.py and mount in backend/app/main.py
- [X] T012 [P] Implement frontend Axios admin API client in frontend/lib/api/admin.ts
- [X] T013 Update edge route protection for admin paths in frontend/middleware.ts

**Checkpoint**: Foundation ready — superadmin authentication and database access established. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Platform Creator High-Level Overview & Metrics (Priority: P1) 🎯 MVP

**Goal**: As the platform owner, view aggregated KPI cards (Total Users, Total Organizations, Active vs Suspended Users, Total Ingested Documents, Total Visitor Conversations) on a dedicated administrative overview screen, while blocking non-admin access.

**Independent Test**: Log in as superadmin, navigate to `/admin`, and verify that platform overview metrics cards load with live counts. Log in as a regular store owner and verify that access to `/admin` is denied with 403/redirect to `/dashboard`.

### Tests for User Story 1

- [X] T014 [P] [US1] Add integration tests for GET /api/v1/admin/metrics superadmin access and non-admin 403 in backend/tests/test_admin_router.py

### Implementation for User Story 1

- [X] T015 [US1] Implement GET /api/v1/admin/metrics endpoint handler in backend/app/routers/admin.py
- [X] T016 [P] [US1] Create server layout with admin header and workspace switcher in frontend/app/(admin)/admin/layout.tsx
- [X] T017 [P] [US1] Create loading skeleton and error boundary in frontend/app/(admin)/admin/loading.tsx and frontend/app/(admin)/admin/error.tsx
- [X] T018 [P] [US1] Implement semantic KPI summary cards component in frontend/components/admin/metrics-overview.tsx
- [X] T019 [US1] Assemble platform metrics overview page in frontend/app/(admin)/admin/page.tsx
- [X] T020 [US1] Add Admin Console navigation entry for superadmins in frontend/components/navigation/user-menu.tsx

**Checkpoint**: At this point, User Story 1 is fully functional and delivers an independently testable MVP.

---

## Phase 4: User Story 2 - User & Organization Directory with Search & Filtering (Priority: P1)

**Goal**: Provide a searchable, filterable, and paginated directory table of all registered users and organizations with account status, creation date, and aggregated counters.

**Independent Test**: Search for users by email or organization name in the directory table, filter by status (All, Active, Suspended), and verify debounced search returns matching records with pagination under 500ms.

### Tests for User Story 2

- [X] T021 [P] [US2] Add integration tests for GET /api/v1/admin/users pagination, search, and status filtering in backend/tests/test_admin_router.py

### Implementation for User Story 2

- [X] T022 [US2] Implement GET /api/v1/admin/users endpoint handler in backend/app/routers/admin.py
- [X] T023 [P] [US2] Create semantic status badge component in frontend/components/admin/user-status-badge.tsx
- [X] T024 [P] [US2] Implement searchable and filterable directory table component in frontend/components/admin/user-directory-table.tsx
- [X] T025 [US2] Integrate UserDirectoryTable below metrics cards in frontend/app/(admin)/admin/page.tsx

**Checkpoint**: At this point, User Stories 1 and 2 are functional and allow complete observability across registered accounts.

---

## Phase 5: User Story 3 - User Access Control & Account Suspension/Activation (Priority: P2)

**Goal**: Allow the platform owner to suspend or reactivate user accounts. Suspended users are immediately blocked from logging in or using the dashboard, active sessions are invalidated, and deployed chat widgets display an offline notice without consuming AI tokens.

**Independent Test**: Suspend an active user from the admin table. Verify the user receives 403 on subsequent API calls, their deployed widget displays `"Support is temporarily offline"`, and message sending is rejected. Reactivate the account and confirm full restoration.

### Tests for User Story 3

- [X] T026 [P] [US3] Add integration tests for PATCH /api/v1/admin/users/{user_id}/status, self-suspension blocking, and widget deactivation in backend/tests/test_admin_router.py

### Implementation for User Story 3

- [X] T027 [US3] Implement PATCH /api/v1/admin/users/{user_id}/status endpoint with session revocation in backend/app/routers/admin.py
- [X] T028 [US3] Update widget configuration endpoint to return is_active=False for suspended owners in backend/app/services/widget_service.py
- [X] T029 [US3] Update chat streaming access check to reject requests for suspended accounts in backend/app/services/chat_service.py
- [X] T030 [US3] Update embeddable widget to render offline notice and block message inputs on is_active=false in frontend/public/widget.js
- [X] T031 [P] [US3] Implement suspension confirmation modal with reason field in frontend/components/admin/suspend-user-modal.tsx
- [X] T032 [US3] Connect suspend and reactivate action triggers from directory table to modal and API client in frontend/components/admin/user-directory-table.tsx

**Checkpoint**: User Stories 1, 2, and 3 are functional; account governance and token drain protection are fully operational.

---

## Phase 6: User Story 4 - Workspace Activity & Health Inspection (Priority: P3)

**Goal**: Allow the platform creator to inspect individual organization resource counters (documents count, total chats, tickets created, allowed origins) without violating customer chat privacy.

**Independent Test**: Select an organization in the directory, open the workspace metrics inspection modal, and verify resource counters are displayed while confirming no private customer chat messages are exposed.

### Tests for User Story 4

- [X] T033 [P] [US4] Add integration test for GET /api/v1/admin/users/{user_id} workspace details endpoint in backend/tests/test_admin_router.py

### Implementation for User Story 4

- [X] T034 [US4] Implement GET /api/v1/admin/users/{user_id} endpoint in backend/app/routers/admin.py
- [X] T035 [P] [US4] Create read-only workspace resource inspection modal in frontend/components/admin/workspace-metrics-modal.tsx
- [X] T036 [US4] Connect View Details row action in directory table to trigger inspection modal in frontend/components/admin/user-directory-table.tsx

**Checkpoint**: All 4 user stories are fully implemented and functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Design token compliance audit, full test suite validation, production build verification, and end-to-end quickstart execution.

- [X] T037 [P] Audit all admin components to verify strict semantic theme token usage per Constitution Principle VII
- [X] T038 Run backend integration test suite via pytest in backend/tests/test_admin_router.py
- [X] T039 Validate frontend Next.js production build via npm run build in frontend/
- [X] T040 Execute manual end-to-end validation scenarios per specs/013-platform-admin-dashboard/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. **Blocks all user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational Phase 2. Delivers MVP platform metrics.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Integrates with US1 page.
- **User Story 3 (Phase 5)**: Depends on Phase 4 directory table.
- **User Story 4 (Phase 6)**: Depends on Phase 4 directory table.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies
```
[Phase 1: Setup]
       │
       ▼
[Phase 2: Foundational]
       │
       ├─────────────────────────┐
       ▼                         ▼
[Phase 3: US1 Metrics (MVP)]   [Phase 4: US2 Directory]
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
[Phase 5: US3 Access Control]     [Phase 6: US4 Workspace Inspection]
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                         [Phase 7: Polish]
```

### Parallel Opportunities
- **Phase 1 Setup**: Tasks `T002`, `T003`, `T004`, `T005` can run in parallel.
- **Phase 2 Foundational**: Tasks `T007` and `T012` can run in parallel with repository and service tasks.
- **Phase 3 (US1)**: Tasks `T014`, `T016`, `T017`, `T018` can be developed in parallel.
- **Phase 4 (US2)**: Tasks `T021`, `T023`, `T024` can be developed in parallel.
- **Phase 5 (US3)**: Tasks `T026` and `T031` can run in parallel with backend service updates.
- **Phase 6 (US4)**: Tasks `T033` and `T035` can run in parallel.

---

## Implementation Strategy

### MVP Scope (Phases 1, 2, and 3)
1. Complete **Phase 1: Setup** (migration, models, schemas).
2. Complete **Phase 2: Foundational** (superadmin dependency, admin service, middleware).
3. Complete **Phase 3: User Story 1** (metrics endpoint, KPI cards, admin layout, user menu link).
4. **Checkpoint**: Platform creator can log in, view high-level platform health metrics, and verify non-admin protection.

### Incremental Feature Delivery
1. Deliver **Phase 4: User Story 2** to provide full visibility into user accounts and organizations with search and filters.
2. Deliver **Phase 5: User Story 3** to provide suspension access control and widget deactivation.
3. Deliver **Phase 6: User Story 4** to provide deep-dive workspace resource counters.
4. Execute **Phase 7: Polish** to ensure theme token compliance, automated test passage, and clean build.
