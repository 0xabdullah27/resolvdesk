# Feature Specification: Analytics & Insights Dashboard

**Feature Branch**: `010-analytics-dashboard`  
**Created**: 2026-09-06  
**Status**: Clarified  
**Input**: Implement Section 3.7 of System Specification — Analytics & Insights Dashboard for business owners to track conversation volume, deflection rates, daily trends, top customer questions, and knowledge gaps (unanswered queries).

---

## Clarifications

### Session 2026-09-06
- **Q: What time window and filtering options should be supported for the analytics volume charts?**  
  **A:** Flexible range switcher supporting `Last 7 Days`, `Last 14 Days`, and `Last 30 Days`, defaulting to `Last 7 Days`.
- **Q: How should 'Unanswered Questions' (Knowledge Base Gaps) be detected and displayed?**  
  **A:** Queries where the assistant message contained the fallback message (`"I don't have information..."`) or had 0/empty citations, aggregated by frequency with timestamps and a direct CTA to add documents/snippets.
- **Q: Which charting approach do you prefer for the volume trends on the dashboard?**  
  **A:** Use `Recharts` for interactive tooltip popovers, smooth curves, and responsive animations styled with Tailwind design tokens.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Support Overview & AI Deflection KPIs (Priority: P1)

As a business owner, I want to see key performance indicators on my main dashboard — including total conversations (all-time & 30-day), total messages, AI deflection rate, and escalated tickets — so that I can immediately quantify how much support time and workload the AI assistant is saving my business.

**Why this priority**: Business owners need instant validation of ROI. Showing deflection rate and conversation volume directly proves the value of ResolvDesk.

**Independent Test**: Can be verified by logging in as an organization owner, opening `/dashboard`, and viewing the KPI summary cards displaying accurate counts computed from the tenant's database records.

**Acceptance Scenarios**:
1. **Given** an authenticated owner with existing conversations, **When** they load `/dashboard`, **Then** they see 4 primary KPI cards:
   - **Total Conversations** (with a subtitle showing count in the last 30 days)
   - **Total Messages** (total visitor + assistant messages across all conversations)
   - **AI Deflection Rate** (percentage of conversations resolved without human escalation, e.g., 85%)
   - **Active Support Tickets** (open and in-progress tickets requiring owner attention)
2. **Given** a brand-new organization with zero conversations, **When** they load `/dashboard`, **Then** the KPI cards show `0` (or `100%` deflection with an explanatory hint) and an onboarding encouragement banner.
3. **Given** database queries for analytics, **When** executing queries, **Then** all SQL calculations are strictly filtered by `organization_id` at the database level.

---

### User Story 2 - Interactive Volume & Deflection Trends (Priority: P2)

As a business owner, I want to view a timeline chart of daily conversation activity and deflection trends with a flexible date range filter (7 days, 14 days, 30 days), so that I can identify customer traffic patterns, peak support days, and escalation spikes over time.

**Why this priority**: Trend visualization provides actionable operational insight into when customers reach out and whether deflection remains consistent across days.

**Independent Test**: Can be verified by selecting 7d, 14d, and 30d filter pills on the volume chart and observing Recharts interactive bar/area chart render with tooltips showing conversations, automated resolutions, and escalations per day.

**Acceptance Scenarios**:
1. **Given** the overview dashboard, **When** viewing the Volume Trends section, **Then** a Recharts chart displays daily volume with date labels.
2. **Given** the date range filter, **When** switching between `7D`, `14D`, and `30D`, **Then** the chart dynamically updates the data points and date axis without a full page reload.
3. **Given** days within the range where zero conversations occurred, **When** the trend data is generated, **Then** those dates are padded with `0` values rather than omitted, preserving chronological continuity.
4. **Given** hovering over any day bar or line, **When** hovered, **Then** a formatted tooltip displays exact numbers for Total Conversations, AI Resolved, and Escalated.

---

### User Story 3 - Knowledge Base Gaps & Unanswered Questions (Priority: P3)

As a business owner, I want to see a list of unanswered questions (questions where the AI had to fall back because the knowledge base lacked relevant information) with their frequency count, so that I can immediately identify gaps in my business documentation and upload new answers.

**Why this priority**: The primary way a business owner improves their AI assistant is by knowing what it couldn't answer. This closes the feedback loop between customer inquiries and document ingestion.

**Independent Test**: Can be verified by asking an out-of-scope question in the chat widget, refreshing `/dashboard`, and observing the question listed under "Knowledge Gaps / Unanswered Questions" with an "Add Knowledge" quick link.

**Acceptance Scenarios**:
1. **Given** conversations where the assistant returned a fallback message or had empty citations, **When** the owner views the "Knowledge Gaps" panel on `/dashboard`, **Then** they see the top unanswered visitor queries ordered by frequency/recency.
2. **Given** an unanswered question item, **When** clicking "Add Knowledge", **Then** the owner is routed to `/dashboard/documents` with a shortcut to paste the missing policy or answer.
3. **Given** no fallback messages in the organization's history, **When** viewing the panel, **Then** a positive empty state is shown: *"No knowledge gaps detected. Your AI is answering all customer questions!"*

---

### User Story 4 - Frequently Asked Customer Questions (Priority: P4)

As a business owner, I want to see a list of the most frequent customer questions asked across all website conversations, so that I understand customer intent, popular products, and recurring topics.

**Why this priority**: Understanding what customers ask most frequently helps businesses optimize their product pages, pricing transparency, and FAQ content.

**Acceptance Scenarios**:
1. **Given** visitor messages, **When** loading the insights panel, **Then** the top customer questions with occurrence counts and latest timestamp are displayed.
2. **Given** identical or near-identical questions, **When** aggregated, **Then** they are counted together to show frequency.

---

## Edge Cases

- **Zero conversations**: All metrics display graceful zeroes, deflection displays 100% or `N/A`, and empty states direct the owner to embed the widget.
- **100% escalation rate**: Deflection rate correctly calculates to 0.0% without division-by-zero errors.
- **Sparse data days**: Date ranges with missing days are normalized with zero counts so charts don't break or jump irregularly.
- **Extremely long visitor queries**: Truncated cleanly with tooltips to prevent UI overflow.
- **Tenant isolation**: Data from Organization A must NEVER leak into Organization B's analytics, verified at SQL query level.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an authenticated endpoint `GET /api/v1/analytics/overview` returning:
  - `total_conversations`: all-time count
  - `total_conversations_30d`: count within the last 30 days
  - `total_messages`: total message count across all conversations
  - `escalated_conversations`: count of escalated conversations
  - `deflection_rate`: float percentage `((total - escalated) / total) * 100` (or `100.0` when total is 0)
  - `open_tickets_count`: count of escalated conversations with status `open` or `in_progress`
  - `resolved_tickets_count`: count of escalated conversations with status `resolved`
- **FR-002**: System MUST provide an authenticated endpoint `GET /api/v1/analytics/trends?range_days=7|14|30` returning an array of daily points `{ date: string, total_conversations: int, ai_resolved: int, escalated: int, total_messages: int }` with all missing dates zero-filled.
- **FR-003**: System MUST provide an authenticated endpoint `GET /api/v1/analytics/knowledge-gaps?limit=10` returning unanswered questions where the assistant responded with fallback or had empty citations.
- **FR-004**: System MUST provide an authenticated endpoint `GET /api/v1/analytics/top-questions?limit=10` returning the most frequent visitor questions with frequency count and last asked date.
- **FR-005**: All analytics endpoints MUST strictly validate `organization_id == current_owner.organization_id` at the database query level.
- **FR-006**: Frontend `/dashboard` MUST render KPI metric cards with icons, trend subtitles, and semantic color-coded badges.
- **FR-007**: Frontend MUST render an interactive Recharts volume trend chart with a `7D | 14D | 30D` range switcher.
- **FR-008**: Frontend MUST render a "Knowledge Base Gaps" card listing top unanswered queries with one-click navigation to `/dashboard/documents`.
- **FR-009**: Frontend MUST render a "Top Customer Inquiries" card displaying top questions and frequency count.
- **FR-010**: All mutations or data fetching MUST use Server Actions or Next.js route handlers with error boundaries.

---

## Non-Functional & Architecture Requirements

- **Three-Layer Architecture**: Backend code MUST strictly follow Router (`routers/analytics.py`) → Service (`services/analytics_service.py`) → Repo (`repos/analytics_repo.py`). No query logic in routers.
- **Performance**: Analytics SQL queries MUST execute in `< 100ms` on Neon PostgreSQL using existing indexes on `organization_id`, `created_at`, and `is_escalated`.
- **UI Styling**: Tailwind CSS v4 tokens, responsive design, dark/light theme support, and full mobile compatibility.
