# Feature Specification: Conversations Inbox & Ticket Management UI

**Feature Branch**: `009-conversations-inbox-ui`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User requested to build the next feature on the roadmap: Conversations Inbox and Ticket Management UI for business owners to monitor visitor chat logs, inspect escalated tickets, review citations, and track real-time support volume.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Conversations and View Transcripts (Priority: P1)

As a business owner, I want to see an organized list of all customer conversations from my website and select any conversation to read its full transcript, so that I can understand what customers are asking and review how the AI assistant responded.

**Why this priority**: Without the ability to list conversations and inspect transcripts, the business owner has no visibility into customer interactions, making the inbox fundamentally non-functional.

**Independent Test**: Can be verified by logging in as an organization owner, navigating to the Conversations page, observing the chronological list of customer chats, selecting a conversation, and reading the entire conversation history with timestamps and speaker roles.

**Acceptance Scenarios**:

1. **Given** an authenticated business owner with active customer conversations, **When** they navigate to `/dashboard/conversations`, **Then** they see a responsive split-pane interface with a scrollable list of conversations on the left and a detail pane on the right.
2. **Given** a list of conversations, **When** the owner clicks on a conversation row, **Then** the detail pane immediately loads and displays the complete chronological message history (visitor questions and assistant answers) with relative timestamps.
3. **Given** the first conversation in the list, **When** the page loads on a desktop screen, **Then** it is automatically selected and rendered in the transcript pane by default.
4. **Given** a business owner with no customer conversations, **When** they open the conversations page, **Then** they see an informative empty state explaining that conversations will appear once website visitors chat with the embedded widget.

---

### User Story 2 - Filter Escalated Support Tickets and Review Contact Details (Priority: P2)

As a business owner, I want to quickly filter for conversations that were escalated to human support and view the customer's contact email, issue summary, and document citations, so that I can follow up with customers who need human assistance.

**Why this priority**: Human escalation is the core safety net of the platform; business owners must be able to isolate high-priority escalated tickets from regular automated chats immediately.

**Independent Test**: Can be verified by toggling the "Escalated Only" filter tab, confirming that only conversations with escalation flags are listed, selecting an escalated chat, and verifying the customer's email address, escalation badge, and reference citations are prominently displayed.

**Acceptance Scenarios**:

1. **Given** the conversation list, **When** the owner clicks the "Escalated" filter tab, **Then** the list updates to display only conversations where human assistance or a support ticket was requested.
2. **Given** an escalated conversation, **When** viewing its transcript, **Then** an escalation banner is visible at the top of the transcript pane displaying the customer's contact email, creation timestamp, and escalation status.
3. **Given** assistant messages that referenced knowledge base documents, **When** viewing the transcript, **Then** citation pills/badges indicating the source documents are visible beneath each grounded assistant message.
4. **Given** the filter is toggled back to "All Conversations", **Then** both automated chats and escalated chats are displayed in chronological order.

---

### User Story 3 - Real-Time Support Volume Metrics & Refresh (Priority: P3)

As a business owner, I want to see aggregate support overview statistics (total chats, total messages, escalation count, and 24-hour activity) and refresh the inbox, so that I can monitor overall support health and see new incoming customer inquiries without leaving the dashboard.

**Why this priority**: Operational metrics provide business value and high-level health monitoring, but depend on the underlying conversation listing and transcript capabilities.

**Independent Test**: Can be verified by viewing the summary metric cards at the top of the conversations view, comparing them against the database aggregates, and clicking the refresh button to trigger an update of conversations and stats.

**Acceptance Scenarios**:

1. **Given** the conversations dashboard, **When** the owner views the page header, **Then** they see key metric indicators: Total Conversations, Total Messages, Escalated Tickets, and 24h Active Volume.
2. **Given** new incoming customer chats from the website widget, **When** the owner clicks the "Refresh" button or a background polling cycle fires, **Then** the list smoothly updates with new conversations without resetting the active transcript pane.
3. **Given** a search query typed into the search box, **When** the owner types keywords, **Then** the conversation list dynamically filters by matching preview snippets or customer identifiers.

---

### Edge Cases

- **Empty State**: What happens when an organization has zero conversations? The UI displays an illustrative empty state with instructions on embedding the widget.
- **Single Conversation with Many Messages (50+)**: How does the transcript pane handle long transcripts? The transcript pane maintains an independent vertical scrollbar with auto-scroll to the latest message on initial select.
- **Rapid Navigation Between Conversations**: If the user rapidly clicks through conversation items while network requests are in flight, race conditions are mitigated by discarding outdated responses and displaying only the latest selected conversation.
- **Failed Transcript Retrieval**: If an individual transcript fails to load due to a network hiccup, an inline error state with a "Retry" button is displayed inside the transcript pane without crashing the sidebar list.
- **Tenant Isolation**: Attempts to view a conversation belonging to a different organization must be rejected at the API level (404/403) and rendered as a "Conversation not found" notice in the UI.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a master-detail (split-pane) layout on `/dashboard/conversations` on desktop viewports (>= 768px) and a drill-down layout on mobile viewports (< 768px).
- **FR-002**: System MUST display a scrollable list of conversations with pagination support (page size 20), showing first message preview snippet, relative timestamp, total message count, and escalation badge.
- **FR-003**: System MUST provide filter tabs to switch between "All" conversations and "Escalated Only" conversations.
- **FR-004**: System MUST allow search filtering within the conversation list by keyword in the preview snippet.
- **FR-005**: System MUST retrieve and display the full chronological transcript of the selected conversation, distinguishing between `visitor`, `assistant`, and `system` message roles.
- **FR-006**: System MUST render document citation badges beneath assistant responses that retrieved knowledge base context.
- **FR-007**: System MUST display an Escalation Details Card for escalated conversations, showing the customer's contact email address, timestamp, and status.
- **FR-008**: System MUST display aggregate conversation metric cards (Total Conversations, Total Messages, Escalation Count, 24h Active Volume) consuming the organization stats API.
- **FR-009**: System MUST provide a manual "Refresh" button and periodic background polling (every 30 seconds) to detect new incoming customer inquiries.
- **FR-010**: System MUST display dedicated loading skeletons (`loading.tsx` and component skeleton states) during initial data fetching.
- **FR-011**: System MUST implement error boundaries (`error.tsx` and inline retry cards) to gracefully handle fetch or network failures.
- **FR-012**: System MUST consume centralized semantic design tokens (`bg-background`, `text-foreground`, `border-border`, `bg-card`, `text-muted-foreground`) with zero hard-coded color utilities, supporting dark and light themes seamlessly.
- **FR-013**: System MUST preserve the selected conversation in URL state (`?id=<conversation_id>`) so links can be shared, bookmarked, and reloaded directly.

---

## Key Entities

- **Conversation Summary**: Unique ID, Organization ID, Escalation status (`boolean`), Message count (`int`), First message preview snippet (`string`), Created at timestamp, Updated at timestamp.
- **Conversation Detail**: Unique ID, Organization ID, Escalation status, List of Chronological Messages, Created at, Updated at.
- **Message**: Unique ID, Conversation ID, Role (`visitor` | `assistant` | `system`), Content (`string`), Citations (`array of document references`), Created at timestamp.
- **Conversation Stats**: Total conversations count (`int`), Total messages count (`int`), Escalated conversations count (`int`), Last 24 hours active conversation count (`int`).

---

## Success Criteria *(mandatory)*

- **SC-001 (Time-to-Insight)**: Business owners can view their latest conversations and read any transcript within 2 clicks from the dashboard navigation.
- **SC-002 (Escalation Visibility)**: 100% of escalated tickets display a distinct high-visibility indicator and customer contact email.
- **SC-003 (Performance)**: Conversation list and transcript panes render in under 500ms on local/broadband connections with smooth scrolling.
- **SC-004 (Visual Consistency)**: 100% compliance with ResolvDesk Constitution Principle VII: all styling uses semantic theme tokens and supports seamless dark/light mode.
- **SC-005 (Responsiveness)**: The conversations inbox is completely functional on mobile devices (< 768px) with intuitive list-to-detail navigation and back buttons.
- **SC-006 (Zero-Crash Resilience)**: Zero unhandled runtime exceptions or blank screens during network errors or empty database states.

---

## Assumptions & Dependencies

- **Backend Readiness**: Backend endpoints `GET /api/v1/conversations`, `GET /api/v1/conversations/stats`, and `GET /api/v1/conversations/{id}` are already implemented, tested (74/74 tests passing), and available via the Next.js API proxy (`/api/v1/*`).
- **Authentication**: Business owners are authenticated via Better Auth session cookies (`httpOnly`) handled transparently by the existing frontend authentication layer.
- **Tenant Scoping**: All API responses are pre-filtered at the database level by `organization_id` based on the caller's verified JWT.
