# Implementation Plan: Analytics & Insights Dashboard

**Branch**: `010-analytics-dashboard` | **Date**: 2026-09-06 | **Spec**: [specs/010-analytics-dashboard/spec.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/010-analytics-dashboard/spec.md)

## Summary

Build an end-to-end Analytics & Insights Dashboard (System Specification Section 3.7) providing organization owners with real-time operational visibility into AI assistant performance. This includes:
1. **Deflection & Volume KPIs**: Total conversations (all-time & 30d), total messages, AI deflection rate (% resolved without escalation), and active escalated tickets.
2. **Interactive Volume Trends**: Recharts daily timeline with `7D | 14D | 30D` range switcher, tooltips, and zero-filled dates.
3. **Knowledge Base Gaps (Unanswered Questions)**: Detection and frequency clustering of customer queries that triggered the AI fallback or lacked document citations, providing a direct CTA to upload missing knowledge.
4. **Top Customer Questions**: Aggregated view of most frequently asked visitor inquiries to reveal customer intent.

---

## Technical Context

- **Backend Language/Framework**: Python 3.11+, FastAPI, SQLModel (async), SQLAlchemy 2.0, PostgreSQL (Neon / asyncpg).
- **Frontend Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts v3.8.
- **Architecture Standard**: Strict 3-Layer backend (`router` → `service` → `repo`) with tenant isolation (`WHERE organization_id = ...`) enforced at the SQL level.
- **Testing**: pytest, pytest-asyncio, httpx AsyncClient, SQLite in-memory test DB for CI/unit/integration testing.

---

## Architecture & Layers

```
[ Frontend: /dashboard ]
       │
       ▼ Server Action: getAnalyticsOverviewAction, getAnalyticsTrendsAction, getKnowledgeGapsAction
[ Next.js Server (Cookie JWT Forwarding) ]
       │
       ▼ GET /api/v1/analytics/* (Bearer JWT)
[ FastAPI Router: routers/analytics.py ] (HTTP parameter validation, auth dependency CurrentOwner)
       │
       ▼ Service: services/analytics_service.py (Business logic, deflection calculation, gap aggregation)
[ Analytics Repo: repos/analytics_repo.py ] (Strict tenant-isolated SQL queries on Neon PostgreSQL)
       │
       ▼
[ Tables: conversations, messages ]
```

---

## Proposed Changes

### Backend

#### [NEW] [analytics.py](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/schemas/analytics.py)
Pydantic schemas for analytics:
- `AnalyticsOverviewResponse`: `total_conversations`, `total_conversations_30d`, `total_messages`, `escalated_conversations`, `deflection_rate`, `open_tickets_count`, `resolved_tickets_count`.
- `DailyVolumePoint`: `date` (YYYY-MM-DD), `total_conversations`, `ai_resolved`, `escalated`, `total_messages`.
- `AnalyticsTrendsResponse`: `range_days`, `points: List[DailyVolumePoint]`.
- `KnowledgeGapItem`: `question`, `frequency`, `last_asked_at`, `conversation_id`.
- `KnowledgeGapsResponse`: `items: List[KnowledgeGapItem]`, `total: int`.
- `TopQuestionItem`: `question`, `frequency`, `last_asked_at`.
- `TopQuestionsResponse`: `items: List[TopQuestionItem]`, `total: int`.

#### [NEW] [analytics_repo.py](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/repos/analytics_repo.py)
Database repository adhering strictly to tenant isolation:
- `get_overview(session, organization_id) -> dict`: Single or parallel SQL count aggregations.
- `get_daily_trends(session, organization_id, start_date, end_date) -> List[dict]`: Groups by date with missing dates padded.
- `get_unanswered_queries(session, organization_id, limit: int = 10) -> List[dict]`: Identifies visitor messages followed by assistant messages containing fallback text or 0 citations.
- `get_top_visitor_questions(session, organization_id, limit: int = 10) -> List[dict]`: Top asked questions grouped by clean normalized text with counts.

#### [NEW] [analytics_service.py](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/services/analytics_service.py)
Business logic layer:
- Calculates deflection rate: `((total - escalated) / total) * 100` (or `100.0` when total is 0).
- Normalizes date ranges and fills empty dates for 7, 14, and 30 day windows.
- Aggregates knowledge gap questions and cleans query text.

#### [NEW] [analytics.py](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/routers/analytics.py)
HTTP Router mounted at `/api/v1/analytics`:
- `GET /overview`: Returns `AnalyticsOverviewResponse`.
- `GET /trends`: Query param `range_days: int = 7` (allowed: 7, 14, 30). Returns `AnalyticsTrendsResponse`.
- `GET /knowledge-gaps`: Query param `limit: int = 10`. Returns `KnowledgeGapsResponse`.
- `GET /top-questions`: Query param `limit: int = 10`. Returns `TopQuestionsResponse`.

#### [MODIFY] [main.py](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/main.py)
Mount `analytics.router` under `/api/v1/analytics`.

---

### Frontend

#### [NEW] [analytics.ts](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/types/analytics.ts)
TypeScript interfaces matching the backend analytics schemas.

#### [NEW] [analytics-actions.ts](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/actions/analytics-actions.ts)
Server actions for fetching analytics data with error handling and session authentication.

#### [NEW] [analytics-kpi-cards.tsx](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/components/dashboard/analytics-kpi-cards.tsx)
Responsive 4-card grid rendering:
- Total Conversations (with 30d trend subtitle)
- Total Messages
- AI Deflection Rate (% with badge and description)
- Active Support Tickets (open + in progress)

#### [NEW] [volume-trends-chart.tsx](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/components/dashboard/volume-trends-chart.tsx)
Client component using `Recharts`:
- Responsive container with AreaChart / BarChart showing automated conversations vs escalations.
- `7D | 14D | 30D` range pill switcher with optimistic loading state.
- Custom tooltip styled to match ResolvDesk dark/light theme tokens.

#### [NEW] [knowledge-gaps-card.tsx](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/components/dashboard/knowledge-gaps-card.tsx)
List of unanswered visitor questions:
- Shows question text, frequency badge, relative timestamp.
- Direct CTA: "Add to Knowledge Base" linking to `/dashboard/documents?tab=manual`.
- Friendly empty state when all questions were answered.

#### [NEW] [top-questions-card.tsx](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/components/dashboard/top-questions-card.tsx)
List of top customer questions asked across the organization.

#### [MODIFY] [page.tsx](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/app/dashboard/page.tsx)
Compose the complete Overview dashboard:
- Welcome banner with live quick-links.
- Analytics KPI Cards.
- Volume Trends Chart.
- 2-Column Grid: Knowledge Base Gaps & Top Customer Questions.
- Compact Onboarding Checklist.

---

## Verification Plan

### Automated Tests
- Integration tests in `backend/tests/integration/test_analytics_isolation.py`:
  - Verify tenant isolation on `/api/v1/analytics/overview`.
  - Verify date range calculations and zero-padding on `/api/v1/analytics/trends`.
  - Verify knowledge gaps query extracts fallback questions.
  - Verify top questions aggregation.
- Run full pytest test suite: `pytest tests`.
- Run frontend build verification: `npm run build` in `frontend/`.
