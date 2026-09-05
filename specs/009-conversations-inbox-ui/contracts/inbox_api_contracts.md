# API Contracts: Conversations Inbox & Ticket Management

**Feature Branch**: `009-conversations-inbox-ui`  
**Date**: 2026-09-06  
**Status**: Complete

---

## 1. Authentication & Tenant Context
All endpoints defined here are privileged administrative endpoints for the business owner.
- **Protocol**: HTTPS / REST
- **Authentication**: Bearer JWT (RS256) extracted from the session cookie via Next.js Server Actions or API gateway.
- **Tenant Isolation**: Every database query scopes strictly by `current_owner.organization_id`. Any query attempting to view another organization's conversation returns a `404 Not Found`.

---

## 2. Endpoints

### 2.1 List Conversations
Retrieves a paginated list of conversations for the owner's organization.

- **Method**: `GET`
- **Route**: `/api/v1/conversations`
- **Query Parameters**:
  - `limit` (optional, integer, default: 20, min: 1, max: 100): Number of items per page.
  - `offset` (optional, integer, default: 0, min: 0): Pagination offset.
  - `is_escalated` (optional, boolean, default: null): If `true`, returns only escalated conversations; if `false`, returns unescalated; if omitted, returns all.
- **Response**: `200 OK`
  ```json
  {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "items": [
      {
        "id": "7b0981e4-f3c5-430b-9c7f-94d5ff1a0523",
        "created_at": "2026-09-06T01:15:00.000Z",
        "updated_at": "2026-09-06T01:20:45.000Z",
        "is_escalated": true,
        "ticket_status": "open",
        "visitor_email": "customer@acme.com",
        "message_count": 6,
        "last_message_preview": "Can someone help me with international shipping rates to Canada?",
        "last_message_role": "visitor"
      }
    ]
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Session missing or expired.
  - `422 Unprocessable Entity`: Validation failure on parameters.

---

### 2.2 Get Conversation Transcript
Retrieves an individual conversation and its complete chronological message transcript with document citations.

- **Method**: `GET`
- **Route**: `/api/v1/conversations/{conversation_id}`
- **Path Parameters**:
  - `conversation_id` (UUID, required): The conversation ID.
- **Response**: `200 OK`
  ```json
  {
    "id": "7b0981e4-f3c5-430b-9c7f-94d5ff1a0523",
    "organization_id": "993f1d2e-3367-4a1b-9f7a-89bc345d1209",
    "created_at": "2026-09-06T01:15:00.000Z",
    "updated_at": "2026-09-06T01:20:45.000Z",
    "is_escalated": true,
    "ticket_status": "open",
    "visitor_email": "customer@acme.com",
    "messages": [
      {
        "id": "c1a40998-11b0-466a-b210-ecb88a4c1762",
        "role": "visitor",
        "content": "What is your return policy for open-box electronics?",
        "created_at": "2026-09-06T01:15:05.000Z",
        "citations": null
      },
      {
        "id": "f8a920b1-4d32-472e-8367-5d519b78e204",
        "role": "assistant",
        "content": "Open-box items can be returned within 14 days of delivery in original condition.",
        "created_at": "2026-09-06T01:15:08.000Z",
        "citations": [
          {
            "document_id": "3f4581aa-0987-4321-beef-1234567890ab",
            "title": "Return & Refund Policy 2026"
          }
        ]
      },
      {
        "id": "a988b022-7711-4a33-8bc1-1209ccdd44ee",
        "role": "system",
        "content": "Human escalation requested by visitor (customer@acme.com). Note: Need manager approval for restocking fee waiver.",
        "created_at": "2026-09-06T01:20:45.000Z",
        "citations": null
      }
    ]
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Session missing or expired.
  - `404 Not Found`: Conversation does not exist or belongs to another organization (strict isolation).

---

### 2.3 Update Ticket Status
Updates the resolution status of an escalated ticket (`open` → `in_progress` → `resolved`).

- **Method**: `PATCH`
- **Route**: `/api/v1/conversations/{conversation_id}/ticket`
- **Path Parameters**:
  - `conversation_id` (UUID, required): Target conversation identifier.
- **Request Body**:
  ```json
  {
    "status": "in_progress"
  }
  ```
- **Constraints**:
  - `status` must be one of: `"open"`, `"in_progress"`, `"resolved"`.
  - Conversation must belong to the caller's organization.
  - If conversation was not escalated, transitioning status automatically marks `is_escalated = true`.
- **Response**: `200 OK`
  ```json
  {
    "id": "7b0981e4-f3c5-430b-9c7f-94d5ff1a0523",
    "ticket_status": "in_progress",
    "updated_at": "2026-09-06T01:25:00.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid status value.
  - `401 Unauthorized`: Not authenticated.
  - `404 Not Found`: Conversation not found or tenant mismatch.

---

### 2.4 Get Conversation Statistics
Calculates high-level conversation metrics for the organization.

- **Method**: `GET`
- **Route**: `/api/v1/conversations/stats`
- **Response**: `200 OK`
  ```json
  {
    "total_conversations": 158,
    "total_messages": 842,
    "escalated_conversations": 14,
    "active_last_24h": 26
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Session missing or expired.
