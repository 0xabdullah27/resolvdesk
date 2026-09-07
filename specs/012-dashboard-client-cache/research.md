# Research: Dashboard Client Cache & Optimistic State Management

## Executive Summary
This research document evaluates architectural approaches for providing a zero-loading-state intra-dashboard navigation experience and instant optimistic mutations with automatic rollback for ResolvDesk.

---

## 1. Provider Architecture: React Context vs Redux Toolkit vs External Cache

### Decision
Implement a dedicated **React Context Provider (`DashboardProvider`)** wrapped at the `app/dashboard/layout.tsx` boundary, exposing domain-specific accessors via `useDashboard()`.

### Rationale
- **Next.js App Router Alignment**: In Next.js 15/16 with React 19, `DashboardLayout` persists across child page navigation (`/dashboard`, `/dashboard/widget`, `/dashboard/documents`, `/dashboard/conversations`). A client provider mounted in the layout stays in memory across all sub-route transitions.
- **Simplicity & Zero Serialization Overhead**: While `@reduxjs/toolkit` is present in `package.json`, React Context provides direct typed access to domain state and server action dispatchers without needing store slice boilerplate or complex action serializability setups.
- **Bundle & Performance**: Minimal runtime overhead (<5 KB), instant re-renders scoped via memoized context selectors.

### Alternatives Considered
- **RTK Query / Redux Store**: More complex configuration needed for Next.js App Router SSR hydration boundaries (`makeStore` per-request isolation). Overkill for dashboard tab caching.
- **SWR / TanStack Query**: Would require adding another third-party dependency; also defaults to aggressive background window-focus revalidations which the user explicitly requested to avoid.
- **Next.js Native `staleTimes` Router Cache**: Only caches HTML/RSC payloads, does not provide programmatic optimistic state manipulation or cross-page synchronized counters (e.g. updating Open Tickets count when a ticket is resolved in Inbox).

---

## 2. In-Memory Cache Keying & Loading Strategy

### Decision
Store domain data in distinct memory slots (`overview`, `trends`, `knowledgeGaps`, `topQuestions`, `widgetProfile`, `documents`, `conversations`, `conversationStats`) inside the provider state:
- Each domain slot has status: `idle` | `loading` | `loaded` | `error`.
- When a page mounts, it invokes `loadDomainResource()`.
- If status is `loaded`, it returns immediately without fetching.
- If status is `idle`, it transitions to `loading`, invokes the server action once, stores the result, and transitions to `loaded`.

### Rationale
- **On-Demand First Visit**: Matches the user's explicit requirement: *"only load the data when the user comes to the dashboard so that no querying goes again and again to the db"*.
- **Subsequent Instant Visits**: Switching from Overview to Widget and back to Overview renders from `loaded` cache in 0 ms without showing loading skeletons.

---

## 3. Optimistic Updates & Rollback Architecture

### Decision
Implement a **Transactional Optimistic Pattern**:
1. **Snapshot**: Capture a clone of the current target item and any affected global counters.
2. **Apply Optimistic UI**: Immediately update the local state in `DashboardProvider` synchronously (e.g., ticket status set to `resolved`, `open_tickets_count` decremented by 1).
3. **Dispatch Network Action**: Fire the existing Next.js Server Action (`updateTicketStatusAction`, `deleteDocumentAction`) in the background.
4. **Commit or Rollback**:
   - If server succeeds: update with canonical timestamp/data.
   - If server fails: restore the captured snapshot in `DashboardProvider` and trigger `toast.error(errorMessage)` via Sonner.

### Rationale
- Ensures <16ms interaction response (next display frame).
- Guarantees zero orphaned or corrupt UI state if the backend database query or network fails.

---

## 4. Manual Header Refresh Architecture

### Decision
Place a unified **"↻ Refresh"** button in [`frontend/components/dashboard/header.tsx`](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/components/dashboard/header.tsx) connected to `useDashboard().refreshActive() / refreshAll()`.
- When clicked, it sets the active tab's status back to `idle` (or triggers re-fetch) and updates a `lastRefreshedAt` timestamp.
- Shows a subtle indicator e.g. *"Updated just now"* or *"Updated 5m ago"*.

### Rationale
- Gives the merchant complete control over data freshness without requiring a full browser reload (F5).
- Fulfills Clarification Q2 (Unified Header Refresh).
