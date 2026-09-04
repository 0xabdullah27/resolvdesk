# Feature Specification: Owner Conversations Inbox & Analytics API

**Feature Branch**: `004-owner-conversations-inbox`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "owner conversation inbox, full chat history transcript inspection, conversation analytics and metrics, and escalation status filtering"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Paginated Conversations Inbox for Organization Owners (Priority: P1)

A business owner logs into their ResolvDesk dashboard and navigates to the Conversations Inbox. The system displays a paginated list of all visitor chat sessions that have occurred via their website widget, ordered with the most recently active conversations first (`updated_at DESC`). Each conversation preview displays the session ID, created timestamp, last active timestamp, escalation status, total message count, and a preview snippet of the most recent message.

**Why this priority**: Core administrative requirement. Store and website owners must be able to monitor customer inquiries, see what visitors are asking, and verify how the AI assistant is performing.

**Independent Test**: Send authenticated `GET /api/v1/conversations?limit=10&offset=0` with an owner's valid token; verify HTTP 200 returns a paginated list of conversations scoped strictly to their organization with total count, message counts, and snippet previews.

**Acceptance Scenarios**:

1. **Given** an organization has 25 visitor conversations in the database,  
   **When** the authenticated owner requests the conversation list with `limit=10&offset=0`,  
   **Then** the system returns HTTP 200 with `total: 25`, `limit: 10`, `offset: 0`, and exactly 10 conversation items ordered by `updated_at DESC`.

2. **Given** two separate organizations (Org A and Org B), each with active conversations,  
   **When** Org A's owner requests the conversation list,  
   **Then** the response contains only Org A's conversations; Org B's conversations are never visible or counted.

---

### User Story 2 - Complete Conversation Transcript Inspection (Priority: P1)

An owner selects an individual conversation from their inbox to review the interaction. The system loads and displays the full message transcript in chronological order (`created_at ASC`), clearly showing the role (`visitor` vs `assistant`), full message content, and exact timestamps. If an owner attempts to view a conversation belonging to another organization, the system returns HTTP 404 to prevent enumeration and data exposure.

**Why this priority**: Enables owners to audit AI answers, review customer questions, resolve disputes, and verify knowledge base accuracy.

**Independent Test**: Send authenticated `GET /api/v1/conversations/{conversation_id}` for an owned conversation; verify HTTP 200 returns the conversation metadata and ordered message history. Send the same request with a conversation ID belonging to a different organization; verify HTTP 404.

**Acceptance Scenarios**:

1. **Given** an active conversation with multiple visitor and assistant message turns,  
   **When** the owner requests `GET /api/v1/conversations/{conversation_id}`,  
   **Then** the system returns HTTP 200 with the conversation details and all associated messages in strict chronological order (`created_at ASC`).

2. **Given** a valid conversation ID that belongs to Org B,  
   **When** an authenticated owner belonging to Org A requests that conversation ID,  
   **Then** the system returns HTTP 404 Not Found without disclosing whether the conversation exists.

---

### User Story 3 - Conversation Overview Analytics & Metrics (Priority: P2)

The owner views their dashboard overview cards to understand visitor engagement. The system provides real-time aggregate statistics for the organization: total conversations initiated, total messages exchanged, total conversations flagged as escalated, and total conversations active within the last 24 hours.

**Why this priority**: Delivers immediate business insight into customer support volume, AI automation rate, and peak visitor activity periods.

**Independent Test**: Send authenticated `GET /api/v1/conversations/stats`; verify HTTP 200 returns accurate counts for `total_conversations`, `total_messages`, `escalated_conversations`, and `active_last_24h`.

**Acceptance Scenarios**:

1. **Given** an organization with historical and recent visitor interactions,  
   **When** the owner requests `GET /api/v1/conversations/stats`,  
   **Then** the system returns HTTP 200 with exact tenant-isolated counts for total conversations, messages, escalated sessions, and sessions updated in the last 24 hours.

---

### User Story 4 - Escalation Status & Resolution Filtering (Priority: P3)

The owner needs to prioritize customer interactions that require attention. The inbox supports an optional query parameter `is_escalated=true|false` so the owner can filter for conversations where visitors requested a human agent or hit knowledge base fallbacks.

**Why this priority**: Enables efficient triage and team handoff, ensuring high-priority visitor issues are not lost in high-volume automated chats.

**Independent Test**: Send `GET /api/v1/conversations?is_escalated=true`; verify only conversations with `is_escalated = True` are returned.

**Acceptance Scenarios**:

1. **Given** an organization has 5 escalated conversations and 15 non-escalated conversations,  
   **When** the owner requests `GET /api/v1/conversations?is_escalated=true`,  
   **Then** the system returns `total: 5` and only the 5 escalated conversation items.

---

### Edge Cases

- **New Organization with Zero Conversations**: Returns HTTP 200 with `total: 0`, `items: []`, and stats with all zero values (`total_conversations: 0`, `total_messages: 0`).
- **Malformed Conversation ID**: Requesting a non-UUID string in `GET /api/v1/conversations/{invalid-uuid}` returns HTTP 422 Unprocessable Content.
- **Empty Conversation (No Messages Yet)**: Returns HTTP 200 with `message_count: 0`, `last_message_preview: null`, and empty messages list `[]`.
- **Large Transcripts (100+ Messages)**: Repository executes optimized indexed ordering by `created_at ASC` and delivers complete transcripts with sub-100ms database response time.
- **Missing or Expired Token**: Requests without an `Authorization: Bearer <token>` header return HTTP 401 Unauthorized.
- **Suspended Owner**: If an owner account is marked `SUSPENDED`, requests to conversation endpoints return HTTP 403 Forbidden.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require verified owner authentication (Bearer token) on all conversation management endpoints.
- **FR-002**: System MUST enforce database-level tenant isolation (`WHERE organization_id = current_owner.organization_id`) on all conversation and message queries.
- **FR-003**: System MUST provide paginated conversation listing sorted by `updated_at DESC` with configurable `limit` (default 20, max 100) and `offset` (default 0).
- **FR-004**: Each conversation item in the list MUST include `id`, `created_at`, `updated_at`, `is_escalated`, `message_count`, `last_message_preview`, and `last_message_role`.
- **FR-005**: System MUST provide full chronological message transcript retrieval (`created_at ASC`) for a specified conversation ID.
- **FR-006**: System MUST return HTTP 404 Not Found if a requested conversation ID does not exist or belongs to another organization.
- **FR-007**: System MUST provide aggregate metrics for the organization: total conversations, total messages, escalated conversations, and conversations updated in the last 24 hours.
- **FR-008**: System MUST support filtering conversations by escalation flag (`is_escalated: Optional[bool] = None`).
- **FR-009**: All response timestamps MUST be serialized in ISO 8601 UTC format.
- **FR-010**: All backend code MUST strictly follow the three-layer pattern: `router` -> `service` -> `repo`.

---

## Success Criteria *(mandatory)*

- **SC-001**: 100% of conversation queries strictly filter by `organization_id` at the database query level with zero data leakage across tenants.
- **SC-002**: Inbox pagination query executes in under 150ms for organizations with up to 10,000 conversations.
- **SC-003**: Cross-tenant transcript requests (`GET /api/v1/conversations/{foreign_id}`) return HTTP 404 in 100% of test cases.
- **SC-004**: Automated test suite achieves 100% pass rate across contract, unit, and multi-tenant isolation integration tests.

---

## Key Entities

- **`Conversation`**: Belongs to `Organization`. Attributes: `id` (UUID), `organization_id` (UUID), `is_escalated` (bool), `created_at` (datetime), `updated_at` (datetime).
- **`Message`**: Belongs to `Conversation`. Attributes: `id` (UUID), `conversation_id` (UUID), `role` (visitor | assistant | system), `content` (text), `created_at` (datetime).
