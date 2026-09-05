# Implementation Tasks: Widget Customizer UI & Configuration Management

**Feature**: `007-widget-customizer-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Shared Types & Schemas)

**Purpose**: Shared types, DTOs, and validation schemas across backend and frontend.

- [x] T001 [P] Create frontend TypeScript definitions for widget config in `frontend/types/widget.ts`
- [x] T002 [P] Create frontend Zod validation schemas for widget customizer form in `frontend/lib/validations/widget.ts`
- [x] T003 [P] Create backend Pydantic schema `WidgetUpdateRequest` in `backend/app/schemas/organization.py`

---

## Phase 2: Foundational (Backend Endpoint & Server Actions)

**Purpose**: Core backend mutation endpoints and Next.js Server Actions that MUST be complete before any UI can interact with the server.

- [x] T004 Implement `WidgetRepo.update_config` with strict tenant query isolation (`WHERE organization_id = ...`) in `backend/app/repos/widget_repo.py`
- [x] T005 Implement `WidgetService.update_config` with validation rules in `backend/app/services/widget_service.py`
- [x] T006 Add `PATCH /api/v1/organization/widget` endpoint with `CurrentOwner` auth in `backend/app/routers/organizations.py`
- [x] T007 [P] Add contract tests for `PATCH /api/v1/organization/widget` in `backend/tests/contract/test_widget_contract.py`
- [x] T008 Implement frontend Server Actions (`getWidgetConfigAction`, `updateWidgetConfigAction`, `rotateWidgetKeyAction`) in `frontend/actions/widget-actions.ts`

**Checkpoint**: Backend API and frontend Server Actions ready and verified with contract tests.

---

## Phase 3: User Story 1 - Customize Widget Branding & Appearance (Priority: P1) 🎯 MVP

**Goal**: Enable store owners to customize bot display name, welcome greeting, brand color, placement, and allowed domains, and persist settings to the database.

**Independent Test**: An owner navigates to `/dashboard/widget`, changes the bot name and color, sets placement, and clicks Save. Reloading the page confirms the settings persist.

- [x] T009 [P] [US1] Create color preset palette and custom hex input component in `frontend/components/widget/widget-color-picker.tsx`
- [x] T010 [P] [US1] Create allowed domains card with toggle and protocol-stripping textarea in `frontend/components/widget/widget-domains-card.tsx`
- [x] T011 [P] [US1] Create appearance form component (bot name, greeting, placement, color, domains) in `frontend/components/widget/widget-appearance-form.tsx`
- [x] T012 [P] [US1] Create factory reset confirmation dialog in `frontend/components/widget/widget-reset-dialog.tsx`
- [x] T013 [US1] Create main client container `WidgetCustomizerView` connecting form state, validation, and actions in `frontend/components/widget/widget-customizer-view.tsx`
- [x] T014 [US1] Create route loading skeleton in `frontend/app/dashboard/widget/loading.tsx`
- [x] T015 [US1] Create route error boundary in `frontend/app/dashboard/widget/error.tsx`
- [x] T016 [US1] Replace widget page with Server Component fetching initial config in `frontend/app/dashboard/widget/page.tsx`

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - Live Real-Time Interactive Widget Preview (Priority: P2)

**Goal**: Provide an interactive visual sandbox directly adjacent to the form that reflects changes in real time (< 50ms) as the owner types.

**Independent Test**: Modifying the bot name, greeting, or color immediately updates the preview canvas; clicking the floating bubble toggles between collapsed and expanded states.

- [x] T017 [P] [US2] Create visual chat bubble launcher preview component in `frontend/components/widget/widget-preview-bubble.tsx`
- [x] T018 [P] [US2] Create visual chat window header and greeting mock component in `frontend/components/widget/widget-preview-window.tsx`
- [x] T019 [US2] Create interactive visual preview canvas `<WidgetLivePreview />` with expandable/collapsible toggle in `frontend/components/widget/widget-live-preview.tsx`
- [x] T020 [US2] Connect `watch()` in `WidgetCustomizerView` to stream changes instantly to `<WidgetLivePreview />` in `frontend/components/widget/widget-customizer-view.tsx`

**Checkpoint**: User Stories 1 AND 2 work together seamlessly with instant visual feedback.

---

## Phase 5: User Story 3 - Embed Snippet Generation & Safe Key Rotation (Priority: P3)

**Goal**: Provide one-click HTML embed snippet copying and a secure key rotation dialog that preserves a 24-hour dual-key grace window.

**Independent Test**: Clicking "Copy Code" copies the formatted `<script>` tag; clicking "Rotate Key" opens the grace period confirmation dialog and updates the key upon confirmation.

- [x] T021 [P] [US3] Create confirmation dialog for 24-hour dual-key rotation in `frontend/components/widget/widget-rotate-dialog.tsx`
- [x] T022 [US3] Create embed script snippet card with one-click copy, active key display, and grace period countdown in `frontend/components/widget/widget-embed-card.tsx`
- [x] T023 [US3] Wire `<WidgetEmbedCard />` and `<WidgetRotateDialog />` into `WidgetCustomizerView` in `frontend/components/widget/widget-customizer-view.tsx`

**Checkpoint**: All three user stories are fully implemented, connected, and functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, semantic styling compliance, and end-to-end validation.

- [x] T024 [P] Verify 100% semantic CSS theme tokens across all widget components (no hard-coded colors per Principle VII)
- [x] T025 Run backend contract test suite (`uv run pytest tests/contract/test_widget_contract.py`)
- [x] T026 Run complete backend test suite (`uv run pytest`)
- [x] T027 Run frontend production build (`npm run build` in `frontend/`)
- [x] T028 Execute end-to-end verification scenarios per `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all UI stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion.
- **User Story 2 (Phase 4)**: Depends on US1 form components.
- **User Story 3 (Phase 5)**: Depends on US1 container component.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Parallel Opportunities
- T001, T002, T003 can be executed in parallel (different files, no dependencies).
- T007 (Contract tests) can run in parallel with T008 (Server Actions).
- T009, T010, T011, T012 can be built in parallel as modular UI pieces.
- T017 and T018 can be built in parallel.
- T024, T025, T026, T027 can run in parallel during the polish phase.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (Types & Schemas).
2. Complete Phase 2: Foundational (Backend PATCH endpoint & Server Actions).
3. Complete Phase 3: User Story 1 (Branding & Appearance Form).
4. **STOP and VALIDATE**: Verify form save, reset to defaults, and database persistence.

### Incremental Delivery
1. Foundation Ready: Backend endpoint tested and Server Actions working.
2. US1 Delivered: Complete configuration management working end-to-end (MVP).
3. US2 Delivered: Live interactive visual preview added.
4. US3 Delivered: Embed snippet copy & safe 24h key rotation added.
5. Polish & Verification: Final styling audit, pytest suite, and Turbopack build.
