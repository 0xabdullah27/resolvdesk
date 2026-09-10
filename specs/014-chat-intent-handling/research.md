# Research: Conversational Intent & Chit-Chat Handling Architecture

**Feature**: `014-chat-intent-handling`  
**Date**: 2026-09-10  
**Status**: Completed

## 1. Intent Classification Architecture: Two-Tier Pattern

### Decision
Implement a **Two-Tier Intent Routing Engine**:
- **Tier 1 (Deterministic Fast-Path)**: In-process regex and pattern heuristics to detect standalone greetings, courtesies, gratitude, farewells, identity inquiries, and explicit escalation keywords. Runs in `< 5ms` with zero external API calls and zero LLM token consumption.
- **Tier 2 (Semantic Context Path)**: Executes for complex inquiries, compound (hybrid) queries, and domain-specific questions. Leverages Qdrant semantic search and system prompt guidance to seamlessly address hybrid queries and handle out-of-scope deflections.

### Rationale
- Common user greetings (*"Hi"*, *"Hello"*, *"Good morning"*, *"Thanks"*) represent a significant percentage of first interactions on customer support widgets.
- Triggering an embedding generation call (`text-embedding-3-small`) and an LLM generation call for a simple *"Hello"* introduces 800ms–1800ms of latency and unnecessary token costs.
- Evaluating greetings locally delivers instant (<50ms) time-to-first-token, producing an ultra-responsive visitor experience while completely eliminating false "document not found" notices.

### Alternatives Evaluated
1. **Pre-LLM Classifier Model (e.g., small fast LLM call for every turn)**: Rejected because adding a separate LLM classification round-trip adds 300-600ms latency to every single message before knowledge search can even begin.
2. **Pure Prompt Engineering (Sending all greetings to RAG)**: Rejected because when Qdrant returns 0 chunks or low-confidence chunks for "Hi", the rigid anti-hallucination threshold forces the system into the fallback path: *"I don't have information about that in my knowledge base. Would you like to connect with a human?"*

---

## 2. Intent Metadata Persistence on Message Model

### Decision
Add a `metadata_json: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column("metadata", sa.JSON, nullable=True))` column mapping to the `Message` table in SQLModel.

### Rationale
- Each message turn can carry structured properties, such as:
  ```json
  {
    "intent": "GREETING",
    "tier": 1,
    "confidence": 1.0,
    "escalated": false
  }
  ```
- Storing this in an open JSON column (`metadata`) allows future extensions (sentiment scores, language detection, omnichannel message IDs) without needing continuous database schema migrations.
- The Owner Conversations Inbox (`009-conversations-inbox-ui`) can immediately query and display visual intent badges (e.g., `[Greeting]`, `[Escalation]`, `[Out of Scope]`).

### Alternatives Evaluated
- **Ephemeral (in-memory only)**: Rejected because business owners and admins would have no visibility in the dashboard into why a conversation triggered or did not trigger escalation.
- **Dedicated Enum column (`intent VARCHAR(30)`)**: Rejected because enum schemas require manual SQL migration alter scripts when new intent categories are added.

---

## 3. Out-of-Scope Deflection & Knowledge-Derived Topic Suggestions

### Decision
When a visitor's query yields no grounded chunks in Qdrant (top similarity score < threshold) and is identified as out-of-scope, the assistant deflects politely and suggests 2–3 sample topics dynamically fetched from the organization's existing `Document` titles in PostgreSQL.

### Rationale
- Organizations in ResolvDesk already have documents stored in the database (`Document.title`, `Document.category` e.g., *"Return Policy"*, *"Pricing FAQ"*, *"API Reference"*).
- Presenting actual document topic names grounds the deflection in reality and guides the visitor to ask questions the bot can actually answer.
- If the organization has no documents uploaded yet, it falls back to clean general support wording referencing `Organization.business_name`.

---

## 4. In-Chat Escalation & Frustration Handling

### Decision
When an explicit human escalation intent is detected (e.g., *"I need a human"*, *"manager"*, *"real person"*), the service immediately yields an SSE `escalate_suggestion` event with `{"suggest_escalation": True, "reason": "explicit_request"}` alongside an empathetic reassurance message, prompting the widget's existing contact capture form.

### Rationale
- Reuses the existing client-side contact capture card already implemented in the widget and conversation service.
- Visitors don't have to repeat their frustration; they can immediately submit their name and email to file a ticket.
