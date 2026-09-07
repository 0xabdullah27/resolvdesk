# Feature Specification: Dashboard Client Cache & Optimistic State Management

**Feature Branch**: `012-dashboard-client-cache`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "I think we should use the provider and only load the data when the user comes to the dashbaord so that no quering goes again and agian to the db like i go to the widget and then go to the overview and when i click the widget agian so the widget page is rerender and it is showing the loading state for now. that i don't want. so i mean tosay that if the user update the data like for examplw mark escalated chat as resolved so the ui should be instantly update while the req is gone to hte backend and if req failed so revert and show the error toash. and on the page navigaiton of the dashbaord the page should not show the ladoing state and should not fetch the data every time"

## Clarifications

### Session 2026-09-07
- Q: How should the dashboard client cache determine when to refresh data if the user stays on the dashboard without refreshing the browser? → A: Manual & Mutation Only: Data remains in memory indefinitely until the user presses F5/Refresh or performs a mutation (zero automatic background network requests).
- Q: Since data stays cached indefinitely without automatic background timers, where and how should the manual refresh action be provided in the user interface? → A: Unified Header Refresh: A single "↻ Refresh" button in the persistent dashboard top navigation bar that re-syncs all domain resources with a subtle "Last updated X min ago" label.
- Q: Which user actions across the dashboard should support optimistic UI updates with automatic rollback? → A: Ticket Status & Document Deletion: Optimistically update conversation ticket status (open/in_progress/resolved) and document list removals immediately upon user action, while keeping file uploads on explicit loading progress.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Navigation Without Repeated Data Fetching or Loading Flashes (Priority: P1)

As a business owner navigating through my ResolvDesk dashboard (Overview, Widget Customizer, Documents, Conversations Inbox), I want each page to load its data on first visit and remain cached in memory so that when I switch between tabs, pages render instantaneously without triggering repeated database queries or flashing loading skeletons.

**Why this priority**: Eliminates jarring loading states and unnecessary backend database load during normal session navigation, delivering a fast, desktop-grade user experience.

**Independent Test**: Can be tested by navigating from Overview to Widget Customizer and back to Overview. The second visit must render immediately from memory without exhibiting loading skeletons or emitting network fetch requests.

**Acceptance Scenarios**:

1. **Given** a user has visited the Widget Customizer page once during the active session, **When** the user navigates to the Overview and clicks back to Widget Customizer, **Then** the page renders immediately with cached settings without showing a loading skeleton or re-querying the database.
2. **Given** a user is switching between dashboard navigation links (Overview, Documents, Conversations, Widget), **When** a route was previously loaded, **Then** its content displays without layout shift or loading placeholders.

---

### User Story 2 - Optimistic Mutation with Instant UI Updates & Automatic Rollback (Priority: P1)

As a support manager working in the Conversations Inbox, when I mark an escalated conversation as "Resolved" (or change any ticket status), I want the user interface to update immediately without waiting for the server response, and if the network or backend request fails, I want the system to seamlessly revert the change and alert me with an error notification.

**Why this priority**: Direct manipulation responsiveness is critical for high-volume customer ticket triage; merchants should not experience input lag or waiting spinners on routine status toggles.

**Independent Test**: Can be tested by updating a conversation ticket status to "Resolved" while simulating a network failure. The item must visually mark as resolved instantly, then revert back to "Open" while displaying an error toast alert.

**Acceptance Scenarios**:

1. **Given** an open, escalated conversation in the inbox, **When** the user clicks "Mark as Resolved", **Then** the conversation badge and status immediately display as "Resolved", the open tickets counter decrements instantly, and the network request is dispatched in the background.
2. **Given** an in-flight status update request, **When** the backend returns an error or the network drops, **Then** the UI immediately rolls back the ticket status to its prior state ("Open"), increments the open tickets counter back, and presents a visible error toast notification explaining the failure.

---

### User Story 3 - Cross-Dashboard State Synchronization (Priority: P2)

As a business owner monitoring my overall operations, when I perform an action in one section (such as resolving an escalated ticket in the Inbox or saving widget customizations), I want the relevant metric cards and views across the entire dashboard (e.g. Open Tickets KPI, ticket lists) to reflect the updated state consistently without requiring a manual browser refresh.

**Why this priority**: Prevents desynchronized dashboard numbers where one tab displays outdated metric counts after an action was completed in another tab.

**Independent Test**: Can be tested by resolving a ticket in the Conversations view and then navigating to the Overview; the Open Tickets KPI card must reflect the updated count without refetching.

**Acceptance Scenarios**:

1. **Given** a merchant resolves a ticket in the Conversations Inbox, **When** the merchant views the Dashboard Overview, **Then** the Open Tickets KPI and Resolved Tickets KPI display the synchronized updated values.
2. **Given** a merchant updates and saves widget branding settings, **When** navigating away and returning, **Then** the customized branding state remains active and consistent across preview cards.

---

### Edge Cases

- **Offline / Total Network Disconnect**: If the user performs an optimistic mutation while offline, the action must immediately display an error notification, revert the state, and not leave ghost state.
- **Rapid Successive Toggles**: If the user rapidly toggles a ticket status multiple times (Open $\rightarrow$ Resolved $\rightarrow$ Open), the system must handle state transitions deterministically and not get stuck in an inconsistent intermediate state.
- **Hard Browser Refresh (F5)**: When the user explicitly reloads the browser, the in-memory cache resets and fetches fresh canonical state from the server.
- **Unauthorized Session Expiry**: If the user's session token expires while navigating cached views, subsequent background mutations or explicit refreshes must cleanly trigger re-authentication rather than silent failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain an in-memory client state store for dashboard domain resources (overview analytics, widget settings, conversation stats, and document summaries) across route transitions.
- **FR-002**: System MUST load each dashboard domain resource on-demand upon first visit and retain it in memory indefinitely during the active session without automatic background refetches, only refreshing upon an explicit user action (e.g. page reload or manual refresh) or after a mutation event.
- **FR-003**: System MUST prevent display of full-page loading skeletons or layout shifts when navigating to a previously loaded dashboard route within the active session.
- **FR-004**: System MUST perform optimistic state updates immediately upon user-initiated mutations for conversation ticket status changes and document deletions, while maintaining explicit loading indicators for multi-step binary file uploads.
- **FR-005**: System MUST capture a rollback snapshot before applying any optimistic mutation.
- **FR-006**: System MUST automatically revert the UI to the rollback snapshot and display a user-friendly error notification if the background mutation request fails.
- **FR-007**: System MUST synchronize shared data points across different dashboard views so that changes made in one view immediately update related metrics across other views.
- **FR-008**: System MUST provide a unified "↻ Refresh" control in the persistent dashboard top header that invalidates the client cache, re-fetches canonical state from the server, and updates a visible "Last updated" relative timestamp.

### Key Entities *(include if feature involves data)*

- **Dashboard Client State**: The client-side cache structure that stores retrieved datasets (analytics metrics, volume trends, knowledge gaps, top inquiries, widget customizer settings, and conversations) keyed by tenant organization.
- **Optimistic Mutation Action**: A transactional representation of a pending change containing the target entity ID, the optimistic update payload, the rollback snapshot, and error handling callback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Intra-dashboard navigation between previously visited views occurs in under 50 milliseconds perceived transition time with zero loading skeletons shown.
- **SC-002**: Redundant backend database queries during intra-dashboard tab switching are reduced to 0 for previously visited tabs within the active session.
- **SC-003**: 100% of user-initiated status mutations reflect visually in the UI within 16 milliseconds (next display frame) before network confirmation.
- **SC-004**: 100% of failed background mutations cleanly revert to their previous state with an informative error toast within 500 milliseconds of request failure.
- **SC-005**: Zero desynchronization between Conversation Inbox ticket status and Overview Open/Resolved ticket KPI counters during an active session.

## Assumptions

- The client state cache resides in browser memory for the active user session and does not persist unencrypted sensitive customer chat data across hard browser reloads or logout.
- Initial load on cold start or hard refresh still performs initial server queries and renders proper loading fallbacks.
- Existing tenant isolation and server-side authorization continue to validate all background mutation requests at the API boundary.
