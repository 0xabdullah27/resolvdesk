# Chatbot Query Pipeline & Routing Rules

This document outlines the standard query processing pipeline, routing rules, and cost/latency optimization strategy for ResolvDesk's customer-facing embeddable chat widget.

---

## 1. Core Philosophy & Guarantees

* **Zero or One LLM Call Guarantee:** Every incoming user message must trigger **at most one** LLM API call (or **zero** calls for standard greetings/chit-chat). Never use multiple sequential LLM calls (e.g., an LLM classifier followed by an LLM generator) for a single query turn.
* **Low Latency (< 500ms target):** Heavy agent loops and multi-step reasoning are prohibited for anonymous widget queries.
* **Strict Multi-Tenant Isolation:** Vector searches and knowledge lookups must always be scoped to the authenticated widget's `tenant_id`.
* **Lead / Human Escalation First:** When knowledge is missing or users express frustration, prioritize capturing contact details (email/name) to convert the conversation into an actionable support ticket or lead.

---

## 2. The 3-Step Hybrid Pipeline Architecture

```
                       User Message from Widget
                                  │
                                  ▼
             [Step 1: Zero-Cost Regex & Keyword Filter]
                 ("hi", "hello", "hey", "thanks", "bye")
                                  │
             ┌────────────────────┴────────────────────┐
             ▼ (Match)                                 ▼ (No Match)
     Instant Reply                              [Step 2: Vector DB Search]
    • 0 tokens, < 10ms                          • Filter: `WHERE tenant_id = ?`
    • Return canned greeting                    • Similarity Score evaluated
                                                       │
                                                       ▼
                                           Score Check (Threshold = 0.70)
                                                       │
                   ┌───────────────────────────────────┴───────────────────────────────────┐
                   ▼ (Score ≥ 0.70: Relevant Doc)                                           ▼ (Score < 0.70: No Relevant Doc)
           [Step 3A: Direct RAG Answer]                                            [Step 3B: Smart Fallback LLM Call]
        • 1 LLM Call                                                            • 1 LLM Call with Fallback System Prompt:
        • Prompt: User Query + Retrieved Chunks                                   - Conversational: Friendly response
        • Returns factual document answer                                         - Frustration / Out of Scope: Apologize &
                                                                                    prompt for email / human escalation
```

---

## 3. Detailed Step Specifications

### Step 1: Zero-Cost Regex & Local Chit-Chat Filter
* **Execution Location:** Application layer (`chat_service` / regex utility).
* **Cost:** $0.00 | **Latency:** < 10ms.
* **Pattern Targets:**
  * Common greetings: `hi`, `hello`, `hey`, `good morning`, `good afternoon`, `good evening`.
  * Courtesies & Closures: `thanks`, `thank you`, `bye`, `goodbye`.
* **Behavior:** If normalized query matches an exact pattern, immediately return a friendly pre-defined canned response. Do not query the vector database or invoke any LLM.

### Step 2: Tenant-Scoped Vector Search & Score Evaluation
* **Execution Location:** Vector DB (pgvector / vector store).
* **Cost:** Negligible | **Latency:** ~20–40ms.
* **Strict Rule:** Always supply `tenant_id` in the search filter:
  ```python
  filter = {"tenant_id": current_tenant_id}
  ```
* **Threshold Evaluation:** Compare the top document match score against `SIMILARITY_THRESHOLD = 0.70`.

### Step 3A: Direct RAG Generation (Score $\ge$ 0.70)
* **Condition:** Knowledge base contains relevant context answering the user's inquiry.
* **Execution:** Single LLM call with a grounded RAG prompt containing the retrieved context.
* **Constraint:** Model must only answer using the provided context. If context does not completely answer the question, instruct the model to state the known facts and offer team assistance.

### Step 3B: Smart Fallback & Escalation (Score < 0.70)
* **Condition:** Knowledge base lacks matching documentation, or query is misspelled, ambiguous, or conversational.
* **Execution:** Single LLM call using a unified fallback system prompt:
  * **Chit-chat / Misspelled greetings:** Reply cordially and invite questions about the company/service.
  * **Frustrated user sentiment:** De-escalate with empathy and ask for the visitor's email and message so human support can intervene.
  * **Unknown inquiries:** State that the specific info isn't available in the current documentation and offer to notify the team if they provide contact info.

---

## 4. Lead & Support Escalation Handling

When an out-of-scope query or frustrated visitor provides their contact details:
1. Extract email / message payload.
2. Persist the lead/ticket in the database (`tickets` / `leads` table with `tenant_id`).
3. Notify the tenant owner (email alert, dashboard notification, or webhook).

---

## 5. When to Introduce Agentic Loops (e.g., OpenAI Agents SDK)

Agentic loops (tool-calling loops with multiple LLM iterations) are **deferred to Phase 2/3** and should only be triggered under specific authenticated conditions:
* **Authenticated Store / App Integrations:** The tenant has connected an external provider (e.g., Shopify, WooCommerce, Zendesk, Calendly) via OAuth.
* **Authorized Intent Execution:** The visitor explicitly asks to perform an action (e.g., `"Track order #12345"`, `"Book a demo slot"`, `"Cancel subscription"`), and an authenticated API tool is available to perform the mutation or lookup.

For general document search and anonymous website visitors, the **3-Step Hybrid Pipeline** remains the default architecture.
