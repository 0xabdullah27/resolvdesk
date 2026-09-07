# Quickstart Validation Guide: Dashboard Client Cache & Optimistic State

This guide defines manual and automated verification scenarios to prove that the in-memory client cache, flicker-free navigation, optimistic mutations, and rollback behavior work correctly.

---

## Prerequisites
- Backend running on `http://localhost:8000`.
- Frontend dev server running on `http://localhost:3000`.
- Logged-in session as a verified business owner with access to `/dashboard`.

---

## Scenario 1: Zero-Loading Tab Navigation
**Goal**: Verify that previously visited tabs render instantaneously without layout shifts or loading skeletons.

1. Open browser DevTools $\rightarrow$ Network tab.
2. Navigate to `http://localhost:3000/dashboard` (initial load renders metrics).
3. Click **"Widget"** in the sidebar (`/dashboard/widget`).
   - Verify: Widget profile loads once.
4. Click **"Overview"** in the sidebar (`/dashboard`).
   - **Expected Outcome**:
     - The Overview page renders immediately (<50ms).
     - **No loading skeleton** or spinner is displayed.
     - **No network requests** are sent to `/api/v1/analytics/*`.
5. Click **"Widget"** again.
   - **Expected Outcome**:
     - Widget customizer renders instantly with pre-populated settings.
     - **Zero network requests** to `/api/v1/widget/profile`.

---

## Scenario 2: Optimistic Ticket Status Update (Success Flow)
**Goal**: Verify that ticket status updates immediately in the UI before network roundtrip.

1. Navigate to `/dashboard/conversations`.
2. Locate an open conversation in the list.
3. Click the status dropdown and change from `"Open"` to `"Resolved"`.
   - **Expected Outcome**:
     - The badge updates to `"Resolved"` **instantly** (<16ms, zero delay).
     - In the Overview page, the `"Open Tickets"` count decrements by 1 immediately.
     - The background network request completes successfully.

---

## Scenario 3: Optimistic Rollback on Network Failure
**Goal**: Verify that a failed status change reverts to its prior state and shows an error toast.

1. Open DevTools $\rightarrow$ Network tab $\rightarrow$ Set Throttling to **"Offline"** (or trigger an artificial API error).
2. Attempt to toggle a ticket status from `"Open"` to `"Resolved"`.
   - **Expected Outcome**:
     - The badge updates to `"Resolved"` optimistically for a split second.
     - Upon request rejection, the badge **automatically rolls back** to `"Open"`.
     - A red error toast notification appears: *"Failed to update ticket status. Changes reverted."*
     - The Open Tickets counter restores to its prior value.

---

## Scenario 4: Unified Manual Refresh
**Goal**: Verify that clicking the header refresh button fetches fresh canonical state.

1. Click the **"↻ Refresh"** button in the dashboard top navigation bar.
2. **Expected Outcome**:
   - The button shows a subtle spinning icon.
   - Network requests are dispatched to fetch the latest analytics and conversation counts.
   - The timestamp label updates to *"Updated just now"*.
