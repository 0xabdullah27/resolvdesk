# Implementation Plan: Dashboard Client Cache & Optimistic State Management

**Branch**: `012-dashboard-client-cache` | **Date**: 2026-09-07 | **Spec**: [spec.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/specs/012-dashboard-client-cache/spec.md)

**Input**: Feature specification from `/specs/012-dashboard-client-cache/spec.md`

## Summary

Implement an in-memory client state cache provider (`DashboardProvider`) wrapped in `app/dashboard/layout.tsx`. On first visit to each dashboard section, domain data is fetched once and retained in memory across route transitions, eliminating repeated database roundtrips and loading skeleton flashes when switching between tabs (Overview, Widget, Documents, Conversations). High-frequency mutations (marking conversation tickets as resolved and deleting documents) will execute optimistically with automatic snapshot rollbacks and Sonner error toasts upon failure. A unified "↻ Refresh" button in the dashboard top header gives merchants manual control over re-syncing data.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 / Next.js 16 (App Router)

**Primary Dependencies**: React Context (`createContext`, `useContext`), Next.js Server Actions, Lucide React (`RotateCw`, `CheckCircle2`), Sonner (`toast`)

**Storage**: In-memory JavaScript client state (valid for the active browser tab session)

**Testing**: Quickstart validation scenarios (`quickstart.md`), component unit tests

**Target Platform**: Modern Web Browsers (Chrome, Firefox, Safari, Edge)

**Project Type**: Web Application (Frontend Architecture & State Management)

**Performance Goals**: Intra-dashboard tab navigation rendered in <50ms; optimistic UI updates rendered in <16ms; 0 redundant database queries on repeated tab visits within the session

**Constraints**: In-memory state only (no sensitive customer chat data leaked to unencrypted localStorage); strict multi-tenant authentication maintained on all underlying Server Action dispatches

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Rule | Compliance Status | Rationale |
| :--- | :--- | :--- |
| **I. Strict Multi-Tenant Isolation** | **PASS** | Client cache is scoped strictly to the authenticated organization. All background server action requests continue to enforce `organization_id` tenant isolation at the backend database query level. |
| **II. Grounded AI & Safety Net** | **PASS** | Optimistic ticket resolution directly supports human escalation tracking without affecting the grounded answer engine. |
| **V. Layered Architecture** | **PASS** | The frontend provider interacts cleanly with existing Server Actions (`actions/analytics-actions.ts`, `actions/conversation-actions.ts`, etc.), leaving backend router $\rightarrow$ service $\rightarrow$ repo layers intact. |
| **VII. Strict Semantic Theming** | **PASS** | All new UI elements (header refresh button, relative timestamp, toast alerts) consume global semantic tokens (`text-muted-foreground`, `bg-card`, `border-border`). Hard-coded color utilities are strictly avoided. |
| **UI State Rigor** | **PASS** | Initial cold-start loads maintain existing skeletons; optimistic updates implement transactional snapshots with automatic rollback and error alerts on failure. |

## Project Structure

### Documentation (this feature)

```text
specs/012-dashboard-client-cache/
├── spec.md              # Feature specification with clarifications
├── plan.md              # This implementation plan
├── research.md          # Architecture research & technology decisions
├── data-model.md        # Client state shape, slices, and rollback models
├── quickstart.md        # Step-by-step verification scenarios
├── contracts/           # Dashboard provider interface contract
│   └── dashboard-provider.contract.ts
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code (repository root)

```text
frontend/
├── providers/
│   └── dashboard-provider.tsx       # [NEW] In-memory React Context Provider for dashboard cache & optimistic mutations
├── hooks/
│   └── use-dashboard.ts             # [NEW] Typed consumer hook for dashboard state and actions
├── components/
│   ├── dashboard/
│   │   ├── header.tsx               # [MODIFY] Add unified "↻ Refresh" button and relative timestamp label
│   │   ├── analytics-kpi-cards.tsx  # [MODIFY] Connect to cached overview state
│   │   ├── volume-trends-chart.tsx  # [MODIFY] Connect to cached trends state
│   │   ├── knowledge-gaps-card.tsx  # [MODIFY] Connect to cached gaps state
│   │   └── top-questions-card.tsx   # [MODIFY] Connect to cached questions state
│   ├── conversations/
│   │   └── conversations-inbox.tsx  # [MODIFY] Wire optimistic ticket status update and rollback toast
│   └── documents/
│       └── document-list.tsx        # [MODIFY] Wire optimistic document deletion
└── app/
    └── dashboard/
        ├── layout.tsx               # [MODIFY] Wrap children with <DashboardProvider>
        ├── page.tsx                 # [MODIFY] Consume provider cache for zero-loading re-renders
        ├── widget/page.tsx          # [MODIFY] Consume cached widget settings
        ├── documents/page.tsx       # [MODIFY] Consume cached documents list
        └── conversations/page.tsx   # [MODIFY] Consume cached conversation list & stats
```
