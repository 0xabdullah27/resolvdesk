# Feature Specification: AI Answer Engine & Streaming Chat API

**Feature Branch**: `003-ai-answer-engine`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "option 1: AI Answer Engine & Streaming Chat API (Visitor Chat Sessions, RAG Retrieval, Token Streaming with SSE, Strict Grounding & Anti-Hallucination, Rate Limiting, Public Widget Endpoint)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public Visitor Chat Session & Streaming RAG Answers (Priority: P1)

An anonymous website visitor clicks the floating chat bubble on an organization's website and asks a question (e.g., *"What is your return policy?"*). The system validates the public widget key, retrieves the top 5 most relevant semantic chunks from Qdrant strictly filtered by `organization_id`, and streams the AI-generated answer token-by-token (Server-Sent Events) back to the visitor in real time (< 2s time-to-first-token). The conversation and individual messages are persisted in the database linked to the organization.

**Why this priority**: Core value proposition of ResolvDesk. Without this, visitors cannot interact with the uploaded knowledge base, and business owners have no automated support assistant.

**Independent Test**: Send `POST /api/v1/widget/chat` with a valid `widget_key` and a question matching ingested documents; verify HTTP 200 SSE stream delivers token chunks progressively, and conversation and message records are created in PostgreSQL.

**Acceptance Scenarios**:

1. **Given** an organization has uploaded and indexed knowledge base documents and has an active `widget_key`,  
   **When** an anonymous visitor sends a question via the chat API,  
   **Then** the system retrieves matching chunks filtered by the organization's tenant ID, generates an answer strictly grounded in those chunks, and streams the tokens in real time via Server-Sent Events (SSE).

2. **Given** an existing conversation in progress,  
   **When** the visitor provides the `conversation_id` on their next message,  
   **Then** the new user message and the streamed assistant response are appended to that existing conversation history.

---

### User Story 2 - Grounded AI, Zero Hallucination & Fallback Behavior (Priority: P1)

When a visitor asks a question that is outside the organization's documents (e.g., *"What is the weather in Tokyo?"* or a policy not covered in the documents), the AI assistant MUST NOT invent, guess, or hallucinate facts. Instead, it must gracefully acknowledge that the information is not in the knowledge base and offer to connect the visitor with a human team member.

**Why this priority**: Guarantees business safety and brand trust (Principle II). Fabricated answers can cause severe financial and legal liabilities for store owners.

**Independent Test**: Ask an off-topic question or a query with zero relevant document chunks in Qdrant; verify the streamed answer states: *"I don't have information about that in my knowledge base. Would you like me to connect you with a human who can help?"* and does not make up facts.

**Acceptance Scenarios**:

1. **Given** an organization has no documents matching the visitor's question (similarity score below threshold or empty vector match),  
   **When** the visitor submits the query,  
   **Then** the system outputs the standardized fallback message without fabricating facts.

2. **Given** an off-topic question (e.g., general trivia, competitor inquiries, medical/legal advice),  
   **When** the visitor submits the query,  
   **Then** the assistant politely redirects the visitor back to the organization's products/services.

---

### User Story 3 - Multi-Turn Conversation History & Context Window (Priority: P2)

When a visitor continues chatting (e.g., *"How long does shipping take?"* followed by *"Does that apply to Alaska too?"*), the assistant uses the last 10 messages of the conversation history alongside the newly retrieved knowledge chunks so that pronouns ("that", "it") and conversation context are maintained across multiple turns.

**Why this priority**: Enhances visitor experience and conversation naturalness. Single-turn bots frustrate users by forgetting immediate context.

**Independent Test**: Start a conversation, ask a base question, then ask a context-dependent follow-up; verify the assistant accurately resolves the antecedent using prior turns.

**Acceptance Scenarios**:

1. **Given** an active conversation with prior message turns,  
   **When** a visitor asks a follow-up referring to previous statements,  
   **Then** the assistant incorporates the recent conversation context (last 10 messages) to correctly answer the follow-up.

---

### User Story 4 - Public Widget Abuse Prevention, Rate Limiting & Guardrails (Priority: P3)

The chat endpoint is publicly accessible via the website widget. To protect the organization and the system from scraping, spam, or denial-of-service, the endpoint enforces rate limiting (maximum 30 messages per minute per visitor IP), rejects inputs exceeding 1,000 characters, and validates widget keys (including grace-period keys during rotation).

**Why this priority**: Prevents resource exhaustion, runaway LLM API costs, and public API abuse (Principle IV).

**Independent Test**: Send 31 messages within 60 seconds from the same IP address; verify the 31st request returns HTTP 429 with a "Please slow down" message. Send a 1,001-character message; verify it returns HTTP 422.

**Acceptance Scenarios**:

1. **Given** a visitor sending rapid requests from a single IP,  
   **When** request volume exceeds 30 messages in a rolling 60-second window,  
   **Then** the system returns HTTP 429 Too Many Requests with a retry notice.

2. **Given** a visitor message exceeding 1,000 characters,  
   **When** the message is submitted,  
   **Then** the system rejects the request with HTTP 422 Unprocessable Content ("Message exceeds maximum length of 1,000 characters").

3. **Given** a request with an invalid or revoked `widget_key`,  
   **When** the chat endpoint is called,  
   **Then** the system returns HTTP 404 Not Found without leaking internal organization details.

---

### Edge Cases

- **Empty or Whitespace-Only Messages**: Rejected with HTTP 422 ("Message content cannot be empty").
- **Inactive/Suspended Organization**: If an organization's owner account is suspended, incoming chat requests for its widget key return HTTP 403 Forbidden with a generic "Widget temporarily unavailable" notice.
- **LLM/Embedding Provider Downtime**: If the upstream LLM/embedding API times out or errors, the SSE stream sends a graceful error event: *"Sorry, I'm having trouble connecting right now. Please try again in a moment."* without crashing the server.
- **Simultaneous Concurrent Visitors**: Up to 100 concurrent visitor conversations per organization handled asynchronously without cross-talk or blocking.
- **Rotated Widget Key in Grace Period**: A request using a `previous_widget_key` whose `grace_expires_at` is in the future continues to function seamlessly.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a public unauthenticated endpoint `POST /api/v1/widget/chat` accepting a `widget_key`, optional `conversation_id`, and `message` content.
- **FR-002**: System MUST validate the `widget_key` against active `widget_configurations`, resolving the associated `organization_id` (including valid grace period keys).
- **FR-003**: System MUST create a new `Conversation` record if `conversation_id` is omitted or not found for the organization.
- **FR-004**: System MUST reject messages exceeding 1,000 characters with HTTP 422 Unprocessable Content.
- **FR-005**: System MUST enforce an IP-based rate limit of 30 messages per minute, returning HTTP 429 Too Many Requests when breached.
- **FR-006**: System MUST convert the visitor's incoming message into a query embedding and execute semantic vector search in Qdrant with a strict `organization_id` filter (retrieving up to 5 chunks).
- **FR-007**: System MUST stream the assistant's generated response progressively using Server-Sent Events (SSE) with `text/event-stream` media type.
- **FR-008**: System MUST strictly ground responses in retrieved document chunks and output a predefined fallback when relevant chunks are absent.
- **FR-009**: System MUST persist every visitor `Message` (role: `visitor`) and completed assistant `Message` (role: `assistant`) to the relational database linked to the `Conversation`.
- **FR-010**: System MUST load up to the last 10 messages of the conversation to provide multi-turn conversation memory to the LLM.
- **FR-011**: System MUST communicate with the LLM via an OpenAI-compatible provider-agnostic interface (supporting OpenAI, Cohere, or local providers via config).
- **FR-012**: System MUST retain conversation sessions for 90 days after last message before automated cleanup.

---

### Key Entities

- **Conversation**: Represents a chat session between an anonymous website visitor and the assistant.
  - Attributes: `id` (UUID), `organization_id` (UUID FK), `created_at` (datetime), `updated_at` (datetime), `is_escalated` (bool, default false).
- **Message**: An individual chat turn within a conversation.
  - Attributes: `id` (UUID), `conversation_id` (UUID FK), `role` (`visitor` | `assistant` | `system`), `content` (text), `created_at` (datetime).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Time-to-first-token streamed to the visitor is under **2 seconds** for 95% of requests.
- **SC-002**: 100% of vector queries are isolated to the visitor's organization (zero cross-tenant chunk leakage).
- **SC-003**: Zero hallucinated policies on off-topic or unindexed queries (100% compliance with fallback behavior).
- **SC-004**: The chat API handles at least **100 concurrent visitor conversations** per organization without dropped streams or degradation.
- **SC-005**: Rate limiting blocks 100% of requests exceeding 30 messages/minute per IP address.

---

## Assumptions

- **Visitor Identity**: Website visitors are completely anonymous; no account creation, cookie tracking, or login is required to chat.
- **Client Protocol**: The chat widget frontend communicates via standard HTTP POST with Server-Sent Events (SSE), which is widely supported across all modern browsers.
- **Provider Availability**: An OpenAI-compatible LLM endpoint (or Cohere / OpenAI key) is configured in environment variables.
- **Conversation Scope**: A conversation persists within a single browser session tab (preserving the `conversation_id`).
