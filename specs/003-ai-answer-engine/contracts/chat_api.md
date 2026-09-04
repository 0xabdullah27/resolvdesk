# API Contract: Public Visitor Chat API

**Feature**: `003-ai-answer-engine`  
**Endpoint Base**: `/api/v1/widget`  
**Authentication**: Unauthenticated (Authorized via public `widget_key`)

---

## 1. Stream Visitor Message

### `POST /api/v1/widget/chat`

Receives an anonymous visitor question, validates the widget key and rate limit, retrieves relevant knowledge base chunks, and streams the answer token-by-token using Server-Sent Events (SSE).

### Request Headers
| Header | Value | Required | Description |
| :--- | :--- | :--- | :--- |
| `Content-Type` | `application/json` | Yes | Request payload format |
| `Accept` | `text/event-stream` | Yes | Requested response streaming format |

### Request Body
```json
{
  "widget_key": "rd_live_9f8e7d6c5b4a3a2b",
  "message": "What is your standard return policy?",
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `widget_key` | `string` | Yes | 8–64 characters | The organization's public embed key (or valid grace key) |
| `message` | `string` | Yes | 1–1,000 characters | The visitor's question |
| `conversation_id` | `UUID` | No | Valid UUID v4 | If continuing an ongoing chat session. If omitted, a new conversation is created |

---

### Responses

#### 🟢 `200 OK` (Server-Sent Events Stream)
**Headers**:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**Event Stream Format**:
```text
event: start
data: {"conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"}

event: token
data: {"token": "Our "}

event: token
data: {"token": "standard "}

event: token
data: {"token": "return "}

event: token
data: {"token": "policy "}

event: done
data: {"conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "message_id": "e4a2c1d8-001e-4842-91ad-1a73ae6df785"}
```

---

#### 🔴 `403 Forbidden`
Returned if the organization's owner account is suspended.
```json
{
  "detail": "Widget is temporarily unavailable."
}
```

---

#### 🔴 `404 Not Found`
Returned if `widget_key` does not exist or expired after its rotation grace period.
```json
{
  "detail": "Invalid or expired widget key."
}
```

---

#### 🔴 `422 Unprocessable Content`
Returned when `message` is empty, whitespace-only, or exceeds 1,000 characters.
```json
{
  "detail": "Message exceeds the maximum allowed length of 1,000 characters."
}
```

---

#### 🔴 `429 Too Many Requests`
Returned when the client IP exceeds the limit of 30 messages in a 60-second window.
**Headers**:
- `Retry-After: 60`

```json
{
  "detail": "Rate limit exceeded. Please slow down and try again in a moment."
}
```

---

## 2. Get Conversation History

### `GET /api/v1/widget/conversations/{conversation_id}?widget_key=rd_live_...`

Allows the client widget to re-hydrate messages when switching tabs or refreshing the browser within the active session.

### Response `200 OK`
```json
{
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "created_at": "2026-09-04T12:00:00Z",
  "messages": [
    {
      "id": "e4a2c1d8-...",
      "role": "visitor",
      "content": "What is your return policy?",
      "created_at": "2026-09-04T12:00:01Z"
    },
    {
      "id": "f5b3d2e9-...",
      "role": "assistant",
      "content": "Our return policy allows returns within 30 days of purchase.",
      "created_at": "2026-09-04T12:00:03Z"
    }
  ]
}
```
