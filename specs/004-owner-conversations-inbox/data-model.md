# Data Model & Schema Contracts: Owner Conversations Inbox

**Feature**: `004-owner-conversations-inbox`  
**Date**: 2026-09-05  

---

## 1. Database Entities (PostgreSQL)

The tables `conversations` and `messages` were introduced in Feature 003 and are leveraged by this feature.

### Conversation (`conversations`)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Unique conversation identifier |
| `organization_id` | `UUID` | `FOREIGN KEY (organizations.id)`, `INDEX`, `NOT NULL` | Tenant isolation key |
| `is_escalated` | `BOOLEAN` | `NOT NULL`, `DEFAULT FALSE` | True if visitor escalated to human |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Session start timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `INDEX`, `DEFAULT now()` | Last active message timestamp |

### Message (`messages`)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Unique message identifier |
| `conversation_id` | `UUID` | `FOREIGN KEY (conversations.id)`, `INDEX`, `NOT NULL` | Parent conversation session |
| `role` | `VARCHAR(20)` | `NOT NULL` | `visitor`, `assistant`, or `system` |
| `content` | `TEXT` | `NOT NULL` | Full textual message body |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `INDEX`, `DEFAULT now()` | Message timestamp |

---

## 2. Pydantic Schemas (`app/schemas/conversation.py`)

### `ConversationListItem`
Item in paginated conversation list.
```python
class ConversationListItem(BaseModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_escalated: bool
    message_count: int
    last_message_preview: Optional[str] = None
    last_message_role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
```

### `ConversationListResponse`
Paginated response envelope.
```python
class ConversationListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[ConversationListItem]
```

### `ConversationDetailResponse`
Full conversation with ordered message transcript.
```python
class ConversationDetailResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_escalated: bool
    messages: List[ChatMessageRead]

    model_config = ConfigDict(from_attributes=True)
```

### `ConversationStatsResponse`
Aggregate analytics for the organization.
```python
class ConversationStatsResponse(BaseModel):
    total_conversations: int
    total_messages: int
    escalated_conversations: int
    active_last_24h: int
```
