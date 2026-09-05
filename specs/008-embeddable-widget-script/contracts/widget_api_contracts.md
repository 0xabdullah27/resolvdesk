# API Contracts: Embeddable Customer Chat Widget

**Feature**: Embeddable Customer Chat Widget Script (`public/widget.js`)  
**Base URL**: `/api/v1/widget`  
**Authentication**: Anonymous public access authenticated via `key` query parameter or `widget_key` in request body.

---

## 1. Get Public Widget Configuration

Retrieves public branding settings for the widget launcher and chat window.

- **Method**: `GET`
- **Path**: `/api/v1/widget/config`
- **Headers**:
  - `Origin`: `<host-store-origin>` (or `Referer`)
- **Query Parameters**:
  - `key` (string, required): The public widget key (`rd_live_...`).

### Success Response (200 OK)

```json
{
  "widget_key": "rd_live_9876543210fedcba9876543210fedcba",
  "bot_display_name": "Velvet Concierge",
  "welcome_message": "Hello! How can I assist your shopping today?",
  "primary_color": "#059669",
  "widget_placement": "bottom-right",
  "allowed_origins": "mystore.com, *.mystore.com"
}
```

### Error Responses

- **403 Forbidden** (Domain not authorized or merchant suspended):
  ```json
  {
    "detail": "Domain not authorized for this widget."
  }
  ```
- **404 Not Found** (Invalid or expired widget key):
  ```json
  {
    "detail": "Invalid or expired widget key."
  }
  ```

---

## 2. Stream Visitor Chat Message

Sends a visitor message, initiates or continues a conversation, and streams the AI answer via Server-Sent Events (SSE).

- **Method**: `POST`
- **Path**: `/api/v1/widget/chat`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Origin`: `<host-store-origin>`
- **Rate Limit**: Max 30 requests / minute per IP.

### Request Body

```json
{
  "widget_key": "rd_live_9876543210fedcba9876543210fedcba",
  "message": "What is your refund policy?",
  "conversation_id": "c56a4180-65aa-42ec-a945-5fd21dec0538"
}
```

### Response (200 OK - `text/event-stream`)

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no

event: start
data: {"conversation_id": "c56a4180-65aa-42ec-a945-5fd21dec0538"}

event: token
data: {"token": "We "}

event: token
data: {"token": "offer "}

event: token
data: {"token": "a 30-day "}

event: token
data: {"token": "money-back guarantee. "}

event: citation
data: {"citations": [{"document_id": "d1234567-89ab-cdef-0123-456789abcdef", "title": "Return & Refund Policy"}]}

event: done
data: {"conversation_id": "c56a4180-65aa-42ec-a945-5fd21dec0538", "message_id": "m9876543-210f-edcb-a987-6543210fedcb"}
```

#### Low-Confidence / Fallback Response Example

When the knowledge base lacks sufficient context:

```http
event: start
data: {"conversation_id": "c56a4180-65aa-42ec-a945-5fd21dec0538"}

event: token
data: {"token": "I don't have information about that in my knowledge base. Would you like me to connect you with a human who can help?"}

event: escalate_suggestion
data: {"suggest_escalation": true}

event: done
data: {"conversation_id": "c56a4180-65aa-42ec-a945-5fd21dec0538", "message_id": "m9876543-210f-edcb-a987-6543210fedcb"}
```

---

## 3. Escalate to Human Support Ticket

Enables anonymous visitors to submit contact information when AI answers are insufficient.

- **Method**: `POST`
- **Path**: `/api/v1/widget/chat/escalate`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Origin`: `<host-store-origin>`

### Request Body

```json
{
  "widget_key": "rd_live_9876543210fedcba9876543210fedcba",
  "conversation_id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "visitor_email": "shopper@example.com",
  "reason": "Need manager approval for custom bulk order"
}
```

### Success Response (200 OK)

```json
{
  "ticket_id": "TK-C56A41",
  "conversation_id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "visitor_email": "shopper@example.com",
  "status": "submitted",
  "created_at": "2026-09-05T20:30:00Z"
}
```

### Error Responses

- **400 Bad Request**: Invalid email or conversation not associated with widget key.
- **404 Not Found**: Conversation or widget not found.
- **429 Too Many Requests**: Escalation spam prevention (max 5 escalations / hour per conversation).

---

## 4. Get Conversation History (Rehydration)

Re-hydrates past message turns when a visitor navigates to a new page or returns within the 24-hour window.

- **Method**: `GET`
- **Path**: `/api/v1/widget/conversations/{conversation_id}`
- **Query Parameters**:
  - `widget_key` (string, required): Public widget key.

### Success Response (200 OK)

```json
{
  "conversation_id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "created_at": "2026-09-05T19:45:00Z",
  "messages": [
    {
      "id": "m1111111-1111-1111-1111-111111111111",
      "role": "visitor",
      "content": "What is your refund policy?",
      "created_at": "2026-09-05T19:45:10Z"
    },
    {
      "id": "m2222222-2222-2222-2222-222222222222",
      "role": "assistant",
      "content": "We offer a 30-day money-back guarantee.",
      "created_at": "2026-09-05T19:45:12Z"
    }
  ]
}
```
