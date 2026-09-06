# Tasks: Enforce Required Website URL on Signup & Restrict Widget CORS Origins

**Feature**: `011-signup-website-cors` | **Branch**: `011-signup-website-cors` | **Date**: 2026-09-06  
**Spec**: [`spec.md`](./spec.md) | **Plan**: [`plan.md`](./plan.md)

---

## Phase 1: Setup (Database & Schema Migration)

**Purpose**: Database schema expansion to store the merchant's website URL on the Organization entity.

- [ ] T001 Create Alembic migration script for adding `website_url` column to `organizations` table in `backend/alembic/versions/006_add_website_url_to_organizations.py`
- [ ] T002 Update `OrganizationBase` and `Organization` SQLModel entities to include `website_url` in `backend/app/models/organization.py`

---

## Phase 2: Foundational (Repositories & Schemas)

**Purpose**: Update data access repositories and boundary schemas before implementing business logic.

- [ ] T003 [P] Update `OrganizationRepo.create_organization` to accept and persist `website_url` in `backend/app/repos/organization_repo.py`
- [ ] T004 [P] Update `WidgetRepo.create_widget_config` to accept `allowed_origins` string parameter in `backend/app/repos/widget_repo.py`
- [ ] T005 [P] Update `RegistrationCompleteRequest` and `OrganizationResponse` schemas to require `website_url` in `backend/app/schemas/registration.py`

**Checkpoint**: Core models, schemas, and repositories ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Required Website URL & Automatic Origin Provisioning (Priority: P1) 🎯 MVP

**Goal**: As a merchant, provide my store URL at signup, enforce it across frontend and backend, and automatically lock my initial widget's allowed origins to my domain (plus localhost) rather than wildcard `*`.

**Independent Test**: Navigate to `/register`, verify submission without website URL fails validation, submit with `https://mystore.com`, and verify that the newly created widget has `allowed_origins = 'mystore.com, localhost'`.

### Tests for User Story 1
- [ ] T006 [P] [US1] Update registration unit tests for website URL validation and domain normalization in `backend/tests/unit/test_registration.py`

### Implementation for User Story 1
- [ ] T007 [US1] Implement domain extraction helper and provision widget with `allowed_origins = f"{domain}, localhost"` in `backend/app/services/registration_service.py`
- [ ] T008 [P] [US1] Update frontend Zod registration validation schema with required `websiteUrl` validation in `frontend/lib/validations/auth.ts`
- [ ] T009 [US1] Update registration form UI to make Website URL required, remove Optional badge, and add helper text in `frontend/components/auth/register-form.tsx`
- [ ] T010 [US1] Forward `websiteUrl` in the onboarding server action payload to the backend in `frontend/actions/auth-actions.ts`

**Checkpoint**: At this point, User Story 1 is fully functional and testable end-to-end as an MVP increment.

---

## Phase 4: User Story 2 - Seamless Widget Operation on Authorized Merchant Domain (Priority: P2)

**Goal**: Online shoppers visiting the merchant's live storefront can interact with the widget without cross-origin blocks.

**Independent Test**: Simulate cross-origin requests from the registered merchant domain and verify 200 OK responses with matching `Access-Control-Allow-Origin`.

### Tests for User Story 2
- [ ] T011 [P] [US2] Update contract test verifying cross-origin `/config` and `/chat` requests succeed from merchant's authorized domain in `backend/tests/contract/test_widget_contract.py`

### Implementation for User Story 2
- [ ] T012 [US2] Verify public widget config and chat streaming requests accept requests matching the registered origin in `backend/app/routers/widget.py`

**Checkpoint**: User Stories 1 AND 2 are both operational and verified independently.

---

## Phase 5: User Story 3 - Protection Against Rogue Embeds on Unauthorized Domains (Priority: P3)

**Goal**: Requests originating from unauthorized external websites attempting to embed the merchant's widget key are rejected with 403 Forbidden, protecting merchant AI quota.

**Independent Test**: Send a request to `/api/v1/widget/chat` with an unlisted origin header and assert `HTTP 403 Forbidden: Domain not authorized for this widget.`.

### Tests for User Story 3
- [ ] T013 [P] [US3] Unit test verifying 403 Forbidden is returned for requests from unlisted external origins in `backend/tests/unit/test_chat_service.py`

### Implementation for User Story 3
- [ ] T014 [US3] Verify widget script in `frontend/public/widget.js` halts gracefully when receiving 403 unauthorized domain responses without crashing host storefront

**Checkpoint**: All three user stories are fully implemented and protected against unauthorized usage.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Execute migrations, run regression test suites, verify production builds, and validate quickstart guide.

- [ ] T015 Apply Alembic migration `006_add_website_url_to_organizations.py` to PostgreSQL database
- [ ] T016 Run full backend test suite (`pytest`) to confirm 100% test pass rate
- [ ] T017 Run frontend production build (`npm run build`) to ensure 0 TypeScript or ESLint errors
- [ ] T018 Execute manual verification scenarios per `specs/011-signup-website-cors/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **Phase 3 (User Story 1 - MVP)**: Depends on Phase 2 completion.
- **Phase 4 (User Story 2)**: Depends on Phase 3 completion.
- **Phase 5 (User Story 3)**: Depends on Phase 3 completion.
- **Phase 6 (Polish)**: Depends on all user stories being complete.

### Parallel Opportunities
- `T003`, `T004`, `T005` in Phase 2 can run in parallel (different repo and schema files).
- `T006` (backend test) and `T008` (frontend Zod schema) in Phase 3 can run in parallel.
- `T011` (contract test) and `T013` (chat service unit test) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`T001` - `T002`).
2. Complete Phase 2: Foundational (`T003` - `T005`).
3. Complete Phase 3: User Story 1 (`T006` - `T010`).
4. **STOP and VALIDATE**: Test User Story 1 independently (signup with website URL and inspect database origins).

### Incremental Delivery
1. Setup + Foundational $\rightarrow$ Foundation ready.
2. User Story 1 $\rightarrow$ Test signup validation and automatic origin configuration.
3. User Story 2 $\rightarrow$ Test storefront authorized visitor interaction.
4. User Story 3 $\rightarrow$ Test rogue origin rejection (403 Forbidden).
5. Polish $\rightarrow$ Migration, automated test suite, frontend build.
