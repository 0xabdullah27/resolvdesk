# Contract: Onboarding & Registration API

**Feature**: `011-signup-website-cors` | **Date**: 2026-09-06

---

## Endpoint: Complete Organization Registration

* **Method**: `POST`
* **Path**: `/api/v1/auth/register-complete`
* **Access**: Authenticated owner (via session or Better Auth hook) / Internal API call

### Request Schema (`RegistrationCompleteRequest`)

```json
{
  "user_id": "b3d2b27b-e109-43c2-bf72-463878b27341",
  "email": "owner@brandstore.com",
  "full_name": "Jordan Smith",
  "organization_name": "Brand Store",
  "website_url": "https://brandstore.com"
}
```

#### Field Specifications

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `user_id` | `string` (UUID) | Yes | Valid UUID format | Better Auth user identifier |
| `email` | `string` (Email) | Yes | Valid email format | Owner email address |
| `full_name` | `string` | Yes | Min 1, Max 200 chars | Owner full name |
| `organization_name` | `string` | Yes | Min 1, Max 200 chars | Organization workspace name |
| `website_url` | `string` | Yes | Min 1, Max 500 chars | Storefront or website address (bare domain or full URL) |

---

### Response Schema (`RegistrationCompleteResponse`)

* **Status**: `201 Created` / `200 OK`

```json
{
  "owner": {
    "id": "b3d2b27b-e109-43c2-bf72-463878b27341",
    "email": "owner@brandstore.com",
    "full_name": "Jordan Smith",
    "status": "active",
    "organization_id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
  },
  "organization": {
    "id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "display_name": "Brand Store",
    "website_url": "https://brandstore.com",
    "created_at": "2026-09-06T05:00:00Z"
  },
  "widget": {
    "id": "c9a646d3-9c61-4cc9-bc59-70969daef631",
    "organization_id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "widget_key": "rd_live_a1b2c3d4e5f6...",
    "primary_color": "#4F46E5",
    "bot_display_name": "Support Assistant",
    "welcome_message": "Hi! How can I help you today?",
    "widget_placement": "bottom-right",
    "allowed_origins": "brandstore.com, localhost"
  }
}
```

---

### Error Responses

#### 422 Unprocessable Entity (Missing or Invalid Website URL)
```json
{
  "detail": [
    {
      "loc": ["body", "website_url"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

#### 400 Bad Request (Malformed Domain Format)
```json
{
  "detail": "Invalid website URL format."
}
```
