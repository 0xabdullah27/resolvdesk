# ResolvDesk — System Specification

> Pure functional specification. No technology decisions — only what the system must do, who uses it, and how it must behave.

---

## 1. Actors

| Actor | Description |
|---|---|
| **Owner** | The business owner who registers, uploads documents, configures their widget, and manages support tickets. Each Owner has exactly one **Organization**. |
| **Visitor** | An anonymous end-user browsing the Owner's website who interacts with the embedded chat widget. Visitors are never authenticated. |
| **System** | The backend services: document processing pipeline, AI answer engine, escalation engine, and notification dispatcher. |

---

## 2. Core Concepts & Glossary

| Concept | Definition |
|---|---|
| **Organization** | A tenant container. All data (documents, conversations, tickets, widget config) is scoped to exactly one Organization. An Owner belongs to one Organization. |
| **Document** | A file uploaded by the Owner (PDF, DOCX, TXT, or plain-text entry) that becomes part of the Organization's knowledge base. |
| **Knowledge Base** | The collection of all processed Documents for an Organization. This is what the AI draws answers from. |
| **Widget** | The embeddable chat interface placed on the Owner's website. Each Organization has exactly one Widget configuration. |
| **Conversation** | A full chat session between a Visitor and the AI, from first message to session end. Contains an ordered list of Messages. |
| **Message** | A single entry in a Conversation. Has a role (`visitor`, `assistant`, or `owner`), content, and timestamp. |
| **Ticket** | A support request created when a Conversation is escalated. Contains a reference to its source Conversation, the Visitor's contact email, a summary, a status, and an optional Owner reply. |

---

## 3. Module Specifications

---

### 3.1 Authentication & Account Management

#### 3.1.1 Owner Registration
- The Owner provides: full name, email address, password, and business/organization name.
- Email must be unique across all accounts.
- Password must be at least 8 characters.
- On successful registration the system creates:
  1. An Owner account.
  2. An Organization linked to that Owner.
  3. A default Widget configuration for that Organization (default colors, default greeting).
- The Owner is immediately logged in after registration.

#### 3.1.2 Owner Login
- The Owner authenticates with email + password.
- On success the system issues an authenticated session.
- On failure (wrong email or password) the system returns a generic "Invalid credentials" error — never revealing whether the email exists.

#### 3.1.3 Owner Logout
- Terminates the current session. All subsequent requests require re-authentication.

#### 3.1.4 Password Reset
- Owner requests reset by providing their email.
- System sends a time-limited (15-minute) reset link to that email.
- Following the link allows setting a new password (minimum 8 characters).
- After reset the Owner must log in again.

---

### 3.2 Knowledge Base (Document Management)

#### 3.2.1 Supported Formats
- **PDF** (text-extractable; scanned image PDFs are out of scope for v1).
- **DOCX** (Microsoft Word).
- **TXT** (plain text).
- **Manual entry** (Owner types or pastes raw text directly in the dashboard).

#### 3.2.2 Upload Rules
- Maximum file size: **10 MB** per document.
- Maximum documents per Organization: **50** (v1 limit).
- Duplicate filenames within the same Organization are allowed — each upload creates a distinct Document record.

#### 3.2.3 Document Processing Pipeline
When a Document is uploaded:
1. **Text Extraction** — Raw text is extracted from the file.
2. **Chunking** — The extracted text is split into overlapping chunks (target ~500 tokens per chunk, ~50-token overlap) to preserve context at boundaries.
3. **Embedding** — Each chunk is converted into a vector embedding.
4. **Indexing** — Embeddings are stored in the vector index, tagged with the Document ID and Organization ID.
5. **Status Tracking** — The Document transitions through states: `uploading` → `processing` → `ready` | `failed`.

The Owner can see the current processing status of every Document in the dashboard.

#### 3.2.4 Document CRUD
| Operation | Behavior |
|---|---|
| **List** | Returns all Documents for the Owner's Organization with: filename, upload date, status, and file size. |
| **View** | Shows the Document's metadata and extracted text preview (first 500 characters). |
| **Delete** | Removes the Document record AND its associated vector embeddings from the index. Deletion is permanent and immediate. |
| **Re-upload** | There is no "edit" — the Owner deletes the old document and uploads a new version. |

#### 3.2.5 Tenant Isolation
- A Document and its embeddings are **never** retrievable by queries from a different Organization.
- All vector searches must filter by Organization ID at the query level.

---

### 3.3 Chat Widget

#### 3.3.1 Embedding Method
- The dashboard provides the Owner with a **single-line JavaScript snippet** containing their Organization's unique public widget key.
- When pasted into any HTML page, the snippet loads the widget script and renders the chat bubble.
- The widget key is a read-only public identifier — it grants no write access or dashboard access.

#### 3.3.2 Widget Appearance (Customizable by Owner)
| Setting | Default | Constraints |
|---|---|---|
| **Primary color** | `#4F46E5` (indigo) | Any valid hex color |
| **Bot display name** | `"Support Assistant"` | 1–30 characters |
| **Welcome message** | `"Hi! How can I help you today?"` | 1–200 characters |
| **Widget position** | Bottom-right | Bottom-right or bottom-left |

Changes to widget settings take effect immediately on the Owner's website (no re-embed required).

#### 3.3.3 Visitor Chat Flow
1. Visitor sees a floating chat bubble on the Owner's website.
2. Visitor clicks the bubble → chat panel opens showing the welcome message.
3. Visitor types a question and sends it.
4. System receives the question, searches the Organization's Knowledge Base, and returns an answer.
5. Conversation continues in this request-response pattern.
6. If the Visitor closes the browser tab or explicitly closes the widget, the Conversation ends.

#### 3.3.4 Session Persistence
- A Conversation persists within a single browser session (tab). If the Visitor navigates between pages on the same site, the conversation is preserved.
- If the Visitor closes the tab and returns later, a **new** Conversation begins (v1 — no cross-session memory).

---

### 3.4 AI Answer Engine

#### 3.4.1 Answer Generation Rules
When a Visitor sends a message:
1. The system performs a semantic search against the Organization's Knowledge Base.
2. The top relevant chunks (up to 5) are retrieved.
3. These chunks, plus the last 10 messages of the current Conversation (for context), are sent to the language model with a system prompt that enforces:
   - **Grounding**: Only use information present in the retrieved chunks.
   - **No hallucination**: If no relevant chunk is found, reply with: *"I don't have information about that in my knowledge base. Would you like me to connect you with a human who can help?"*
   - **Tone**: Friendly, professional, concise. Match the language/tone of the Owner's documents when possible.
   - **Scope**: Never provide medical, legal, or financial advice. If asked, redirect to a professional.

#### 3.4.2 Confidence & Fallback Behavior
| Scenario | System Behavior |
|---|---|
| High-confidence match found | Respond with the grounded answer. |
| Low-confidence or no match | Respond with the "I don't have information" fallback and offer human escalation. |
| Question is completely off-topic (e.g., "What's the weather?") | Politely redirect: *"I'm here to help with questions about [Business Name]. Is there anything about our products or services I can help with?"* |

#### 3.4.3 Streaming
- Answers are streamed token-by-token to the widget in real time (not sent as a single block after full generation). The Visitor sees the answer being typed out progressively.

---

### 3.5 Escalation & Ticketing

#### 3.5.1 Escalation Triggers
A Conversation is escalated to a Ticket when **any** of the following occurs:

1. **Explicit request**: The Visitor says something like "I want to talk to a human", "let me speak to someone", "connect me to support", etc.
2. **Negative sentiment**: The Visitor expresses frustration, anger, or dissatisfaction (e.g., "this is useless", "I'm not getting help", "I want a refund NOW").
3. **Repeated fallbacks**: The AI has responded with the "I don't have information" fallback **3 or more times** within the same Conversation.
4. **Sensitive topics**: The Visitor's message involves a complaint, refund request, broken/damaged product, billing dispute, or account-specific issue the AI cannot resolve from documents alone.

#### 3.5.2 Escalation Flow
When escalation is triggered:
1. The assistant sends: *"I'd like to connect you with our team for more help. Could you share your email address so we can follow up?"*
2. The Visitor provides their email address.
3. The system validates the email format.
4. A **Ticket** is created with:
   - Status: `open`
   - Visitor email
   - AI-generated summary of the issue (2–3 sentences)
   - Reference to the full Conversation
5. The assistant confirms: *"Thank you! I've created a support request and our team will reach out to you at [email]. Is there anything else I can help with in the meantime?"*
6. The Conversation can continue after escalation (the Visitor is not cut off).

#### 3.5.3 What If the Visitor Refuses to Give Email?
- The assistant responds: *"No problem! You can continue asking questions here, or reach out to us directly at any time."*
- No Ticket is created. The Conversation continues normally.

---

### 3.6 Support Inbox (Owner Dashboard)

#### 3.6.1 Conversation List
- The Owner sees **all** Conversations for their Organization, ordered by most recent activity.
- Each entry shows: first Visitor message (truncated), timestamp, message count, and whether it was escalated.
- The Owner can filter by: `all` | `escalated only`.

#### 3.6.2 Conversation Detail
- Full message history of a Conversation (all Visitor messages, all Assistant responses).
- Read-only — the Owner cannot edit past messages.

#### 3.6.3 Ticket Management
| Field | Details |
|---|---|
| **Status** | `open` → `in_progress` → `resolved`. Only forward transitions. |
| **Visitor email** | Displayed for the Owner to contact the Visitor externally. |
| **AI Summary** | 2–3 sentence summary auto-generated at escalation time. |
| **Conversation link** | Clicking opens the full Conversation detail. |
| **Owner notes** | Free-text field for the Owner to add internal notes (not visible to the Visitor). |

#### 3.6.4 Ticket Filters
- Filter by status: `all` | `open` | `in_progress` | `resolved`.
- Sort by: newest first (default) | oldest first.

---

### 3.7 Analytics & Insights (v1 — Basic)

The dashboard shows the following metrics for the Owner's Organization:

| Metric | Description |
|---|---|
| **Total conversations** | Count of all Conversations (all-time and last 30 days). |
| **Total messages** | Count of all Messages across all Conversations. |
| **Escalation rate** | Percentage of Conversations that resulted in a Ticket. |
| **Top questions** | The 10 most frequently asked questions (grouped by semantic similarity). |
| **Unanswered questions** | Questions where the AI responded with the "I don't have information" fallback — helps the Owner identify knowledge gaps. |

---

## 4. Widget Embed Key & Security

| Concern | Rule |
|---|---|
| **Widget key exposure** | The widget key is a public, read-only identifier. It allows Visitors to start Conversations but grants no access to the dashboard, documents, or tickets. |
| **Rate limiting** | The chat endpoint is rate-limited per IP address: maximum **30 messages per minute** per Visitor IP. Exceeding the limit returns a "Please slow down" message in the widget. |
| **Content filtering** | Visitor messages exceeding **1,000 characters** are rejected with a "Message too long" notice. |
| **Owner API access** | All dashboard/management endpoints require an authenticated Owner session. Every query filters by the Owner's Organization ID at the database level. |

---

## 5. Data Retention & Privacy

- **Conversations** are retained for **90 days** after the last message, then permanently deleted along with their Messages.
- **Tickets** are retained for **1 year** after being marked `resolved`, then permanently deleted.
- **Documents** are retained until explicitly deleted by the Owner.
- The Owner can **export** all their data (Conversations, Tickets, Documents) at any time from the dashboard in CSV/JSON format.
- Deleting an Organization account removes **all** associated data (Documents, Conversations, Tickets, Widget config) within 24 hours.

---

## 6. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Answer latency** | First token streamed to the Visitor within **2 seconds** of sending a message. |
| **Widget load time** | Widget script loads and renders the chat bubble within **1 second** on a standard connection. |
| **Uptime** | 99.5% availability target for the chat endpoint. |
| **Concurrent conversations** | Support at least **100 concurrent active Conversations** per Organization without degradation. |
| **Document processing time** | A 10-page PDF should reach `ready` status within **30 seconds**. |

---

## 7. Out of Scope (v1)

The following are explicitly **not** part of the initial version:

- Multi-language auto-translation
- WhatsApp / Telegram / Instagram / Email channel integrations
- Live system lookups (Shopify order status, calendar booking)
- Team member invitations / multi-user Organizations
- Owner replying to the Visitor directly inside the widget (real-time live chat)
- Voice AI support
- CRM sync / lead capture integrations
- Custom AI personality/tone configuration beyond the bot name and greeting
- Scanned/image-based PDF text extraction (OCR)
