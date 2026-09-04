# Research: AI Answer Engine & Streaming Chat API

**Feature**: `003-ai-answer-engine`  
**Date**: 2026-09-04  
**Status**: Completed  

---

## 1. Streaming Protocol: Server-Sent Events (SSE) vs WebSockets

### Decision
Use **Server-Sent Events (SSE)** via FastAPI's `StreamingResponse(..., media_type="text/event-stream")`.

### Rationale
- **Unidirectional Match**: The chat widget sends a message (HTTP POST), and the server streams back tokens. There is no requirement for full-duplex communication while a single answer is generating.
- **Simplicity & Standard Compliance**: SSE works natively over HTTP/1.1 and HTTP/2 without specialized connection upgrades, proxy workarounds, or WebSocket state management.
- **Connection Resilience**: Automatically handles reconnections and cleans up connections as soon as the generator completes.
- **Constitution Compliance**: Aligns with Constitution Section *Security & Data Privacy Constraints* ("Streaming by Default: Visitor chat responses SHOULD be streamed progressively...").

### Alternatives Considered
- **WebSockets**: Overkill for a request-response chat widget. Requires stateful connection management across horizontally scaled backend pods, ping-pong heartbeats, and firewall traversal headaches.
- **Plain Polling / Long Polling**: High latency, inefficient resource utilization, fails the < 2s time-to-first-token goal.

---

## 2. Provider-Agnostic LLM Streaming Architecture

### Decision
Use **`httpx.AsyncClient`** with `client.stream("POST", f"{settings.LLM_BASE_URL}/chat/completions")` or standard OpenAI-compatible asynchronous stream parser.

### Rationale
- **User Environment Alignment**: The user configured:
  ```env
  LLM_API_KEY=...
  LLM_BASE_URL=https://api.mistral.ai/v1
  LLM_MODEL=mistral-small-latest
  ```
- **Unified Standard**: Mistral, OpenAI, Groq, Together, and Ollama all follow the exact same `/v1/chat/completions` SSE streaming payload:
  `data: {"choices": [{"delta": {"content": "..."}}]}`
- **Constitution Principle VI**: Zero provider SDK lock-in. A simple configuration change in `.env` swaps between Mistral, OpenAI (`gpt-4o-mini`), Cohere, or local models with zero downtime and zero code changes.

### Alternatives Considered
- **OpenAI Python SDK (`openai.AsyncOpenAI`)**: Works well with custom `base_url`, but introduces third-party SDK dependencies and tight coupling. A dedicated service layer using pure `httpx` or thin async client ensures 100% control over streaming timeouts and error handling.

---

## 3. RAG Retrieval & Prompt Engineering for Anti-Hallucination

### Decision
Combine **Qdrant cosine similarity search** (top 5 chunks) with a rigid **Two-Phase Grounding System Prompt**:
1. **Context Formulation**:
   ```text
   You are an AI customer support assistant for {organization_name}.
   Answer the customer's question STRICTLY and ONLY using the following document excerpts.
   
   --- DOCUMENT EXCERPTS ---
   {retrieved_chunks}
   -------------------------
   
   RULES:
   1. If the answer cannot be found in the document excerpts above, respond with EXACTLY:
      "I don't have information about that in my knowledge base. Would you like me to connect you with a human who can help?"
   2. Do NOT guess, assume, or extrapolate facts not explicitly stated.
   3. Maintain a friendly, concise, and professional tone.
   4. Never provide medical, legal, or financial advice.
   ```
2. **Confidence Gate**:
   - If Qdrant returns 0 chunks, or the top similarity score is below `0.55`, immediately stream the standard fallback without invoking the LLM, saving inference costs and eliminating hallucination risk.

### Rationale
- **Zero Hallucination Guarantee (Principle II)**: Ensures business owners are not exposed to liability from fabricated store policies.
- **Cost & Latency Optimization**: Skipping the LLM when no relevant chunks exist returns an immediate fallback response in < 300ms.

---

## 4. Multi-Turn Conversation History Management

### Decision
Maintain conversation session state in PostgreSQL (`conversations` and `messages` tables). For each request:
1. Verify or create `Conversation` associated with the resolved `organization_id`.
2. Load the **last 10 messages** (`ORDER BY created_at ASC`) belonging to that `conversation_id`.
3. Format the chat prompt:
   - System Prompt (instructions + retrieved document chunks)
   - Past 10 messages (`role: "user"` / `role: "assistant"`)
   - Current visitor message
4. Save the visitor message and the completed assistant message upon stream completion.

### Rationale
- **Pronoun Resolution**: Allows natural follow-ups ("How much is it?", "Does that include tax?").
- **Context Window Bounding**: Limiting to 10 messages avoids prompt bloat and maintains low latency.
- **Tenant Isolation**: Conversations and messages are strictly linked to `organization_id`.

---

## 5. Public Abuse Prevention & Rate Limiting

### Decision
Implement an in-memory **Sliding-Window Rate Limiter** keyed by visitor client IP:
- Limit: **30 requests per 60 seconds** per IP address.
- Message character limit: **1,000 characters** max (enforced at Pydantic schema validation).
- Breaches return HTTP 429 Too Many Requests with header `Retry-After: 60`.

### Rationale
- Protects the public unauthenticated widget endpoint from denial-of-service, automated scraping, or runaway LLM API consumption.
