# Tasks: Dashboard Client Cache & Optimistic State Management

**Input**: Implementation plan from [`specs/012-dashboard-client-cache/plan.md`](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/012-dashboard-client-cache/plan.md) and specification from [`specs/012-dashboard-client-cache/spec.md`](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/012-dashboard-client-cache/spec.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define the TypeScript types, interfaces, and hooks needed for client-side state caching.

- [ ] T001 [P] Create state types, resource status definitions, and snapshot interfaces in `frontend/types/dashboard-cache.ts`
- [ ] T002 [P] Create typed consumer hook `useDashboard` in `frontend/hooks/use-dashboard.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the core `DashboardProvider` context and wrap dashboard sub-routes.

**⚠️ CRITICAL**: Must be completed before user story page implementations can begin.

- [ ] T003 Implement core in-memory cache provider `DashboardProvider` in `frontend/providers/dashboard-provider.tsx` with lazy loaders (`loadOverview`, `loadTrends`, `loadKnowledgeGaps`, `loadTopQuestions`, `loadWidgetProfile`, `loadDocuments`, `loadConversations`)
- [ ] T004 Mount `<DashboardProvider>` inside `frontend/app/dashboard/layout.tsx` to maintain persistent in-memory client state across all dashboard sub-routes

**Checkpoint**: Foundation ready — dashboard provider is mounted and accessible across all sub-pages.

---

## Phase 3: User Story 1 - Instant Navigation Without Repeated Data Fetching or Loading Flashes (Priority: P1) 🎯 MVP

**Goal**: Load each dashboard section on first visit and cache in memory so subsequent visits render instantly (<50ms) without showing loading skeletons or firing repeated database queries.

**Independent Test**: Navigate from Overview (`/dashboard`) to Widget (`/dashboard/widget`) and back to Overview. The second visit must render immediately from memory without exhibiting loading skeletons or emitting network fetch requests.

### Implementation for User Story 1

- [ ] T005 [US1] Update `frontend/app/dashboard/page.tsx` to consume cached analytics overview, trends, knowledge gaps, and top inquiries from `DashboardProvider`
- [ ] T006 [P] [US1] Update `frontend/app/dashboard/widget/page.tsx` to load widget customizer profile into `DashboardProvider` on first visit and serve from cache on return visits
- [ ] T007 [P] [US1] Update `frontend/app/dashboard/documents/page.tsx` to consume cached documents list from `DashboardProvider` on navigation
- [ ] T008 [P] [US1] Update `frontend/app/dashboard/conversations/page.tsx` to consume cached conversations list and stats from `DashboardProvider` on navigation

**Checkpoint**: User Story 1 is fully functional. Intra-dashboard navigation between all 4 tabs is instant with zero loading skeleton flashes.

---

## Phase 4: User Story 2 - Optimistic Mutation with Instant UI Updates & Automatic Rollback (Priority: P1)

**Goal**: Enable instant (<16ms) UI updates when merchants resolve conversation tickets or delete documents, automatically rolling back to a previous snapshot and displaying a Sonner error toast if the backend request fails.

**Independent Test**: In `/dashboard/conversations`, mark an open ticket as "Resolved". Verify the status changes instantly and the open ticket count decrements. When network requests fail (e.g. offline mode), verify status automatically reverts to "Open", the counter restores, and an error toast appears.

### Implementation for User Story 2

- [ ] T009 [US2] Implement `optimisticUpdateTicketStatus` in `frontend/providers/dashboard-provider.tsx` with previous-state snapshot, immediate local ticket state update, counter decrement, background server action call, and Sonner error rollback
- [ ] T010 [US2] Connect `ConversationsInbox` in `frontend/components/conversations/conversations-inbox.tsx` to use `optimisticUpdateTicketStatus` for instantaneous badge and list response
- [ ] T011 [US2] Implement `optimisticDeleteDocument` in `frontend/providers/dashboard-provider.tsx` with snapshot capture, immediate item removal, and Sonner error rollback
- [ ] T012 [US2] Connect `DocumentList` in `frontend/components/documents/document-list.tsx` to use `optimisticDeleteDocument`

**Checkpoint**: User Stories 1 and 2 work seamlessly together. Status toggles and document deletions are instantaneous with safe failure rollback.

---

## Phase 5: User Story 3 - Cross-Dashboard State Synchronization & Unified Manual Refresh (Priority: P2)

**Goal**: Provide a persistent "↻ Refresh" button in the dashboard header that re-syncs all metrics, and ensure counters across different tabs remain synchronized in real time.

**Independent Test**: Resolve an escalated ticket in the Conversations Inbox, then navigate to the Overview; verify the Open Tickets KPI card displays the updated count immediately. Click "↻ Refresh" in the top header and verify canonical state is fetched.

### Implementation for User Story 3

- [ ] T013 [US3] Implement `refreshAll` and `lastRefreshedAt` in `frontend/providers/dashboard-provider.tsx` to invalidate cache and fetch fresh canonical state for active resources
- [ ] T014 [US3] Add unified "↻ Refresh" button and relative timestamp label ("Updated just now") to `frontend/components/dashboard/header.tsx`
- [ ] T015 [US3] Verify synchronized counter updates between `ConversationsInbox` ticket status toggles and `AnalyticsKpiCards` open ticket count in `frontend/components/dashboard/analytics-kpi-cards.tsx`

**Checkpoint**: All user stories functional. Merchants have instant navigation, optimistic actions, synchronized counters, and a manual refresh trigger.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, code cleanup, and performance validation across all dashboard routes.

- [ ] T016 Run quickstart validation scenarios in `specs/012-dashboard-client-cache/quickstart.md` covering tab navigation, optimistic mutations, rollback alerts, and header refresh
- [ ] T017 [P] Clean up any obsolete loading states or dead code in dashboard components

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2).
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2); integrates with US1 cached components.
- **User Story 3 (Phase 5)**: Depends on US1 and US2.
- **Polish (Phase 6)**: Depends on Phases 1–5.

### Parallel Opportunities
- `T001` and `T002` can run in parallel (types vs hook interface).
- `T006`, `T007`, and `T008` can run in parallel (different page files).
- `T011` and `T012` (document deletion) can be developed in parallel with `T009` and `T010` (ticket status).

---

## Implementation Strategy

### MVP Scope (User Story 1)
1. Complete Phase 1 (Setup types & hook).
2. Complete Phase 2 (Foundational `DashboardProvider` in `layout.tsx`).
3. Complete Phase 3 (`page.tsx`, `widget/page.tsx`, `documents/page.tsx`, `conversations/page.tsx`).
4. **VALIDATE**: Switch between Overview and Widget — confirm 0 loading skeletons and 0 redundant network calls.

### Incremental Delivery
1. Foundation + US1 $\rightarrow$ Zero-loading intra-dashboard navigation (MVP!).
2. Add US2 $\rightarrow$ Instant optimistic ticket resolution and document deletion with rollback.
3. Add US3 $\rightarrow$ Unified header refresh button and synchronized KPI counters.
4. Polish $\rightarrow$ Quickstart end-to-end verification.
