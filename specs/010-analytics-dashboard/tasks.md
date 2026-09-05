# Tasks: Feature 010 — Analytics & Insights Dashboard

**Branch**: `010-analytics-dashboard`  
**Spec**: [specs/010-analytics-dashboard/spec.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/010-analytics-dashboard/spec.md)  
**Plan**: [specs/010-analytics-dashboard/plan.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/010-analytics-dashboard/plan.md)

---

## Phase 1: Setup & Schemas (Shared Infrastructure)

- [x] T001 [P] Create backend Pydantic models for analytics responses in `backend/app/schemas/analytics.py` (`AnalyticsOverviewResponse`, `DailyVolumePoint`, `AnalyticsTrendsResponse`, `KnowledgeGapItem`, `KnowledgeGapsResponse`, `TopQuestionItem`, `TopQuestionsResponse`).
- [x] T002 [P] Create frontend TypeScript definitions in `frontend/types/analytics.ts` matching backend response schemas.

---

## Phase 2: Foundational Repository Layer (Strict Tenant Isolation)

- [x] T003 Create `backend/app/repos/analytics_repo.py` implementing tenant-isolated queries (`WHERE organization_id = :org_id`):
  - `get_overview_metrics(session, organization_id)`
  - `get_daily_volume_raw(session, organization_id, start_date, end_date)`
  - `get_knowledge_gaps_raw(session, organization_id, limit)`
  - `get_top_questions_raw(session, organization_id, limit)`

---

## Phase 3: User Story 1 (P1) — Support Overview & AI Deflection KPIs

- [x] T004 [US1] Implement `get_overview` in `backend/app/services/analytics_service.py` to calculate total conversations, 30d conversations, total messages, active/resolved tickets, and deflection rate (`((total - escalated) / total) * 100`).
- [x] T005 [US1] Create `backend/app/routers/analytics.py` and implement endpoint `GET /api/v1/analytics/overview`.
- [x] T006 [US1] Register `analytics.router` in `backend/app/main.py` under prefix `/api/v1/analytics`.
- [x] T007 [US1] Implement `getAnalyticsOverviewAction` in `frontend/actions/analytics-actions.ts` with error handling and JWT forwarding.
- [x] T008 [US1] Create KPI cards component `frontend/components/dashboard/analytics-kpi-cards.tsx` rendering Total Chats, Messages, Deflection Rate %, and Active Tickets.

---

## Phase 4: User Story 2 (P2) — Interactive Volume & Deflection Trends

- [x] T009 [US2] Implement `get_daily_trends` in `backend/app/services/analytics_service.py` with zero-filling for empty dates across 7, 14, and 30 day ranges.
- [x] T010 [US2] Implement endpoint `GET /api/v1/analytics/trends` in `backend/app/routers/analytics.py` with `range_days` query parameter validation.
- [x] T011 [US2] Implement `getAnalyticsTrendsAction` in `frontend/actions/analytics-actions.ts`.
- [x] T012 [US2] Build `frontend/components/dashboard/volume-trends-chart.tsx` using `Recharts` with responsive area/bar visualization, custom styled tooltip, and interactive `7D | 14D | 30D` range switcher.

---

## Phase 5: User Story 3 (P3) — Knowledge Base Gaps (Unanswered Questions)

- [x] T013 [US3] Implement `get_knowledge_gaps` in `backend/app/services/analytics_service.py` detecting fallback responses and empty citations grouped by frequency.
- [x] T014 [US3] Implement endpoint `GET /api/v1/analytics/knowledge-gaps` in `backend/app/routers/analytics.py`.
- [x] T015 [US3] Implement `getKnowledgeGapsAction` in `frontend/actions/analytics-actions.ts`.
- [x] T016 [US3] Build `frontend/components/dashboard/knowledge-gaps-card.tsx` with question preview, frequency badges, and "Add to Knowledge Base" CTA linking to `/dashboard/documents`.

---

## Phase 6: User Story 4 (P4) — Frequently Asked Customer Questions

- [x] T017 [US4] Implement `get_top_questions` in `backend/app/services/analytics_service.py` and endpoint `GET /api/v1/analytics/top-questions` in `backend/app/routers/analytics.py`.
- [x] T018 [US4] Implement `getTopQuestionsAction` in `frontend/actions/analytics-actions.ts`.
- [x] T019 [US4] Build `frontend/components/dashboard/top-questions-card.tsx` rendering frequent queries and frequency indicators.

---

## Phase 7: Dashboard Assembly & End-to-End Verification

- [x] T020 Update `frontend/app/dashboard/page.tsx` to compose the full layout: Welcome banner, KPI cards, Volume Trends, Knowledge Gaps & Top Questions grid, and compact Onboarding Checklist.
- [x] T021 Write integration tests in `backend/tests/integration/test_analytics_isolation.py` verifying multi-tenant isolation, deflection calculations, and trend zero-padding.
- [x] T022 Run complete automated test suite (`pytest tests` & `npm run build`).
- [ ] T023 Stage, commit with conventional commit message, and push to branch `010-analytics-dashboard`.
