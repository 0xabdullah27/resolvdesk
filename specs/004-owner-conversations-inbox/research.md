# Research & Architecture Decisions: Owner Conversations Inbox & Analytics

**Feature**: `004-owner-conversations-inbox`  
**Date**: 2026-09-05  

---

## 1. Inbox Pagination Query Strategy: Avoiding N+1

### Context & Problem
Displaying an inbox list requires each conversation's metadata (`id`, `created_at`, `updated_at`, `is_escalated`), alongside:
1. Total number of messages in that conversation (`message_count`).
2. A preview snippet of the most recent message (`last_message_preview`).
3. The role of the most recent message (`last_message_role`).

Performing a separate query for each conversation's messages in a loop would cause an **N+1 query problem**, slowing down inbox responses when rendering pages of 20–50 conversations.

### Evaluation of Options

| Approach | Performance | Complexity | Decision |
| :--- | :--- | :--- | :--- |
| **Option A: Python Loop (N+1)** | Poor (1 + N queries) | Very low | **Rejected** |
| **Option B: SQLAlchemy Correlated Subqueries** | Excellent (Single query, index-backed) | Low | **Selected** |
| **Option C: SQL Window Functions (`ROW_NUMBER()`)** | Good | Moderate | Alternative |

### Implementation Decision
Use SQLAlchemy scalar subqueries correlated to `Conversation.id`. Since `messages.conversation_id` and `messages.created_at` are indexed in PostgreSQL, Postgres executes correlated index scans in microseconds:

```python
msg_count_sub = (
    select(func.count(Message.id))
    .where(Message.conversation_id == Conversation.id)
    .correlate(Conversation)
    .scalar_subquery()
)
latest_content_sub = (
    select(Message.content)
    .where(Message.conversation_id == Conversation.id)
    .order_by(Message.created_at.desc())
    .limit(1)
    .correlate(Conversation)
    .scalar_subquery()
)
latest_role_sub = (
    select(Message.role)
    .where(Message.conversation_id == Conversation.id)
    .order_by(Message.created_at.desc())
    .limit(1)
    .correlate(Conversation)
    .scalar_subquery()
)

statement = (
    select(Conversation, msg_count_sub, latest_content_sub, latest_role_sub)
    .where(Conversation.organization_id == organization_id)
    .order_by(Conversation.updated_at.desc())
    .offset(offset)
    .limit(limit)
)
```

---

## 2. Analytics Aggregation Performance

### Context & Goal
The owner overview dashboard requests real-time statistics (`GET /api/v1/conversations/stats`):
- `total_conversations`
- `total_messages`
- `escalated_conversations`
- `active_last_24h` (conversations active within the last 24 hours)

### Implementation Decision
Execute aggregated SQL queries filtered strictly by `organization_id`:
1. `total_conversations`: `SELECT COUNT(id) FROM conversations WHERE organization_id = :org_id`
2. `escalated_conversations`: `SELECT COUNT(id) FROM conversations WHERE organization_id = :org_id AND is_escalated = true`
3. `active_last_24h`: `SELECT COUNT(id) FROM conversations WHERE organization_id = :org_id AND updated_at >= :twenty_four_hours_ago`
4. `total_messages`: `SELECT COUNT(m.id) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.organization_id = :org_id`

All four counts leverage primary key and foreign key indexes, completing in < 15ms.

---

## 3. Security: Tenant Isolation & Enumeration Defense

### Decision: Strict 404 on Cross-Tenant Access
If an owner from Organization A attempts to access `GET /api/v1/conversations/{id}` where `{id}` belongs to Organization B, the system MUST return:
```json
{
  "detail": "Conversation not found."
}
```
with **HTTP 404 Not Found**, rather than HTTP 403 Forbidden. This ensures an attacker cannot enumerate or probe whether a specific UUID exists in other organizations.

---

## 4. Layer Separation & Responsibilities

1. **Router Layer (`routers/conversations.py`)**:
   - Injects `CurrentOwner` dependency (verifies RS256 JWT and active owner status).
   - Validates query params (`limit`, `offset`, `is_escalated`).
   - Delegates business calls to `owner_conversation_service`.
   - Returns Pydantic response models (`ConversationListResponse`, `ConversationDetailResponse`, `ConversationStatsResponse`).

2. **Service Layer (`services/owner_conversation_service.py`)**:
   - Validates pagination bounds (`limit <= 100`, `offset >= 0`).
   - Calls repository methods.
   - Formats preview snippets (truncates to 120 characters for clean list view).

3. **Repository Layer (`repos/conversation_repo.py`)**:
   - Executes raw SQLAlchemy / SQLModel queries with mandatory `WHERE organization_id = :org_id`.
   - Returns tuples/objects to the service layer.
