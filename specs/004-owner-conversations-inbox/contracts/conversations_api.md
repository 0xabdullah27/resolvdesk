# API Contract: Owner Conversations & Analytics

**Base Path**: `/api/v1/conversations`  
**Authentication**: `Authorization: Bearer <better_auth_jwt_token>` (Required for all routes)

---

## 1. List Organization Conversations

### `GET /api/v1/conversations`
Retrieves a paginated list of conversations belonging to the authenticated organization.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | integer | No | 20 | Number of conversations to return (max: 100) |
| `offset` | integer | No | 0 | Pagination offset |
| `is_escalated` | boolean | No | None | Optional filter for escalation status |

#### Response `200 OK`
```json
{
  "total": 42,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": "7fa85f64-5717-4562-b3fc-2c963f66afa6",
      "created_at": "2026-09-04T18:30:00Z",
      "updated_at": "2026-09-04T18:32:15Z",
      "is_escalated": false,
      "message_count": 4,
      "last_message_preview": "Our return window is 30 days from purchase.",
      "last_message_role": "assistant"
    }
  ]
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Account is suspended.

---

## 2. Get Conversation Overview Analytics

### `GET /api/v1/conversations/stats`
Calculates aggregated conversation metrics for the authenticated organization.

#### Response `200 OK`
```json
{
  "total_conversations": 150,
  "total_messages": 620,
  "escalated_conversations": 12,
  "active_last_24h": 28
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Account is suspended.

---

## 3. Get Conversation Transcript

### `GET /api/v1/conversations/{conversation_id}`
Retrieves the full message history of an individual conversation session.

#### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `conversation_id` | UUID | Yes | Unique conversation ID |

#### Response `200 OK`
```json
{
  "id": "7fa85f64-5717-4562-b3fc-2c963f66afa6",
  "organization_id": "0d6118d5-d85c-4394-bb9e-131758f19293",
  "created_at": "2026-09-04T18:30:00Z",
  "updated_at": "2026-09-04T18:32:15Z",
  "is_escalated": false,
  "messages": [
    {
      "id": "2e06cb3e-96ba-4a25-827a-85d064cf6350",
      "role": "visitor",
      "content": "What is your refund policy?",
      "created_at": "2026-09-04T18:30:00Z"
    },
    {
      "id": "cb15f7a2-94ea-4589-a292-690a5eb57c5e",
      "role": "assistant",
      "content": "Our return window is 30 days from purchase.",
      "created_at": "2026-09-04T18:30:03Z"
    }
  ]
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid Bearer token.
- `404 Not Found`: Conversation does not exist OR belongs to another tenant.
- `422 Unprocessable Content`: `conversation_id` is not a valid UUID format.
