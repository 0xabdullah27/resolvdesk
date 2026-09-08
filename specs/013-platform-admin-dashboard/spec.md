# Feature Specification: Platform Admin & User Management Dashboard

**Feature Branch**: `013-platform-admin-dashboard`

**Created**: 2026-09-09

**Status**: Ready for Planning

**Input**: User description: "I want to create an owner dashboard where the owner can see how many users and everything about users created and more details that first of this team or what what I can track of the users. I think there is a active and something relative to this option like owner may have the ability to control this. And I need the owner dashboard in the ResolvDesk. I don't mean the owner who registered. The owner means I am, who I, I mean who I have created the website and I am the owner. So I want the owner dashboard for me, not for the owner of the root of my users. So I want to create control for myself where I can manage the users."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Platform Creator High-Level Overview & Metrics (Priority: P1)

As the creator and platform owner of ResolvDesk, I want an overarching platform administrative view showing platform-wide metrics so that I can monitor how many users and organizations have registered, how many widgets are actively running, and overall platform volume.

**Why this priority**: Essential for platform visibility. The platform creator currently has no single administrative screen to see total registered user accounts, active organizations, or usage trends across the platform.

**Independent Test**: Can be tested independently by logging in as the platform administrator and viewing the platform metrics summary cards (total registered users, total organizations, active widgets, total conversations).

**Acceptance Scenarios**:

1. **Given** an authenticated platform administrator navigating to the admin portal, **When** the page loads, **Then** the system displays aggregated KPI cards showing total registered users, active vs suspended users, total organizations, total documents uploaded, and total platform conversations.
2. **Given** a non-admin tenant user, **When** attempting to access the platform admin route, **Then** the system denies access and redirects to their tenant dashboard with an unauthorized notice.

---

### User Story 2 - User & Organization Directory with Search & Filtering (Priority: P1)

As the platform owner, I want a searchable, filterable directory of all registered users and their organizations so that I can inspect details about who is using ResolvDesk, when they signed up, and their current activity status.

**Why this priority**: The creator needs immediate visibility into individual accounts to provide support, identify spam or abuse, and track customer adoption.

**Independent Test**: Can be tested by searching for users by email, full name, or organization name, filtering by status (Active, Suspended), and viewing their profile details.

**Acceptance Scenarios**:

1. **Given** the platform admin directory table, **When** searching for a user by email, name, or organization name, **Then** the table instantly filters and displays matching accounts with pagination.
2. **Given** the directory list, **When** the admin filters by status (e.g., "Suspended" or "Active"), **Then** only accounts matching that status are displayed.
3. **Given** a specific user row in the directory, **When** the admin clicks on the user, **Then** the system reveals detailed workspace statistics (organization name, verified website URL, document count, conversation count, created date, and last active timestamp).

---

### User Story 3 - User Access Control & Account Suspension/Activation (Priority: P2)

As the platform owner, I want the ability to toggle user account status (Activate / Suspend) so that I can disable malicious or abusive accounts and reinstate legitimate users when appropriate.

**Why this priority**: Crucial operational control for the platform creator to protect the SaaS infrastructure against abuse, spam, or non-compliant usage.

**Independent Test**: Can be tested by suspending a target user account, verifying they can no longer log in to their dashboard, and verifying that reactivating them restores access.

**Acceptance Scenarios**:

1. **Given** an active user account in the admin directory, **When** the platform owner clicks "Suspend Account" and confirms, **Then** the user's status updates to `suspended`, their active sessions are invalidated, and their dashboard access is immediately blocked.
2. **Given** a suspended user account, **When** the platform owner clicks "Reactivate Account", **Then** the user's status returns to `active` and they can log in normally.
3. **Given** a suspended user account whose public chat widget is deployed on an external website, **When** a visitor loads the widget, **Then** the widget displays an inactive notice ("Support is temporarily offline") and rejects new chat message submissions, preventing token consumption.

---

### User Story 4 - Workspace Activity & Health Inspection (Priority: P3)

As the platform owner, I want to inspect individual workspace metrics (such as storage usage, document volume, conversation rate, and widget origins) so that I can understand how each business is utilizing the platform without violating tenant data privacy.

**Why this priority**: Helps the platform creator identify high-volume accounts, troubleshoot customer issues, and make informed infrastructure and product decisions.

**Independent Test**: Can be tested by selecting an organization to view its aggregate resource metrics (documents ingested, vector chunks, chat sessions, escalation frequency) in a read-only view.

**Acceptance Scenarios**:

1. **Given** an organization profile in the admin portal, **When** the admin views workspace metrics, **Then** the system displays aggregated resource counters (documents count, total chats, tickets created, allowed origins).
2. **Given** the admin inspection view, **When** displaying tenant data, **Then** the system presents workspace health metrics and aggregated counters while strictly preserving customer chat transcript confidentiality.

---

### Edge Cases

- **Self-Lockout Prevention**: The platform owner cannot suspend their own administrative account.
- **Concurrent Status Changes**: If a suspended user is actively in a session, their next request to the dashboard or API returns an unauthorized session response.
- **Empty State**: When no users match search/filter criteria, a helpful empty state with "Clear filters" is presented.
- **Large User Volume**: The user table uses server-side pagination, sorting, and debounced search to ensure performance with thousands of registered accounts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated Platform Administration portal accessible only to authorized platform creators/super-admins.
- **FR-002**: System MUST restrict admin portal access using a dedicated administrative role flag (`role: "superadmin"`), blocking regular tenant owners with an unauthorized/forbidden response.
- **FR-003**: System MUST display high-level platform KPI summary cards: Total Users, Total Organizations, Active Users, Suspended Users, Total Ingested Documents, and Total Visitor Conversations.
- **FR-004**: System MUST display a paginated directory table of all registered platform users with columns for: Name, Email, Organization Name, Website URL, Status (Active / Suspended), Created Date, and Actions.
- **FR-005**: System MUST support debounced text searching across user email, user name, and organization name.
- **FR-006**: System MUST support filtering directory records by account status (All, Active, Suspended).
- **FR-007**: System MUST allow the platform administrator to suspend an active user with an optional reason note.
- **FR-008**: System MUST allow the platform administrator to reactivate a suspended user.
- **FR-009**: System MUST prevent the platform administrator from suspending or modifying their own super-admin status.
- **FR-010**: System MUST immediately terminate active sessions and block dashboard access for suspended accounts.
- **FR-011**: System MUST handle visitor interactions on deployed widgets belonging to suspended accounts by displaying a clear inactive notice ("Support is temporarily offline") and blocking message submissions to prevent token consumption.
- **FR-012**: System MUST log all administrative actions (account suspensions, reactivations) with admin identifier, target user identifier, timestamp, and action type.

### Key Entities

- **PlatformAdmin**: System administrator identity authorized to view platform-wide aggregates and modify user account statuses.
- **PlatformUserSummary**: Read-only aggregated projection combining auth credentials, tenant organization details, and workspace utilization metrics.
- **AccountStatus**: Enumerated state of a platform account (`active`, `suspended`, `pending_verification`).
- **PlatformMetrics**: Aggregate summary statistics computed across all organizations (user counts, organizations, documents, conversations, tickets).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Platform administrator can view the total user count and platform KPI overview within 1.5 seconds of loading the admin portal.
- **SC-002**: Searching or filtering across 10,000 user records returns results in under 500 milliseconds via server-side indexing.
- **SC-003**: Suspending a user takes effect immediately, blocking their access to the tenant dashboard on their very next request.
- **SC-004**: 100% of non-admin tenant users are prevented from viewing or accessing administrative routes or administrative API endpoints.

## Assumptions

- **Target User**: The platform creator/owner of ResolvDesk, distinct from merchant/store owners who register their businesses on ResolvDesk.
- **Scope Boundaries**: Billing/subscription management and direct database editing are out of scope for this initial admin release; focus is on user tracking, analytics, and access control.
- **Security**: Strict tenant isolation remains intact; the platform admin portal has cross-tenant visibility for operational health and governance, but does not expose private customer chat credentials.
- **Design Tokens**: The admin interface must strictly adhere to the project's semantic theme tokens and design system for seamless dark/light mode consistency.
