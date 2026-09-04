# API Contracts: Authentication & Registration

**Base URL**: `POST /api/auth/...` (Next.js Better Auth) and `GET|POST|PATCH /api/v1/...` (FastAPI Resource Server)

---

## Authentication Endpoints (Next.js — Better Auth)

These endpoints are handled entirely by Better Auth on the Next.js server. FastAPI does NOT implement these.

### POST `/api/auth/sign-up/email`

Register a new owner with email and password. Better Auth creates the `user` record internally.

**Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@shoestore.com",
  "password": "securepass123"
}
```

**Success Response** (`200 OK`):
```json
{
  "user": {
    "id": "usr_a1b2c3d4-...",
    "name": "Jane Doe",
    "email": "jane@shoestore.com",
    "emailVerified": false,
    "createdAt": "2026-09-04T10:30:00Z",
    "updatedAt": "2026-09-04T10:30:00Z"
  },
  "session": {
    "id": "sess_...",
    "userId": "usr_a1b2c3d4-...",
    "expiresAt": "2026-09-11T10:30:00Z"
  }
}
```

**Error Responses**:
- `422 Unprocessable Entity` — Validation failure (email format, password length)
- `409 Conflict` — Email already registered

**Post-Hook**: After Better Auth creates the user, a server-side hook (or the Next.js registration handler) calls the FastAPI `/api/v1/registration/complete` endpoint to create Organization and Widget records atomically.

---

### POST `/api/auth/sign-in/email`

Authenticate an existing owner.

**Request Body**:
```json
{
  "email": "jane@shoestore.com",
  "password": "securepass123"
}
```

**Success Response** (`200 OK`):
```json
{
  "user": { "id": "usr_...", "name": "Jane Doe", "email": "jane@shoestore.com" },
  "session": { "id": "sess_...", "expiresAt": "2026-09-11T10:30:00Z" }
}
```

**Error Responses**:
- `401 Unauthorized` — Generic "Invalid credentials" (does not reveal if email exists)
- `429 Too Many Requests` — Rate limited (5 failed attempts / 15 min per IP+email)

---

### POST `/api/auth/sign-out`

Terminate the current session.

**Request**: Session cookie or Authorization header.

**Success Response** (`200 OK`):
```json
{ "success": true }
```

---

### POST `/api/auth/forget-password`

Initiate password reset.

**Request Body**:
```json
{
  "email": "jane@shoestore.com",
  "redirectTo": "/reset-password"
}
```

**Success Response** (`200 OK`): Always returns success (does not reveal email existence).

---

### POST `/api/auth/reset-password`

Complete password reset.

**Request Body**:
```json
{
  "token": "reset_token_from_email_link",
  "newPassword": "newsecurepass456"
}
```

**Success Response** (`200 OK`):
```json
{ "success": true }
```

**Error Responses**:
- `401 Unauthorized` — Token expired (> 15 minutes) or invalid
- `422 Unprocessable Entity` — New password fails validation

---

### GET `/api/auth/token`

Fetch a signed JWT for the current session (used by the Axios interceptor to get Bearer tokens for FastAPI calls).

**Success Response** (`200 OK`):
```json
{
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

The response also sets the `set-auth-jwt` header for client-side storage.

---

### GET `/api/auth/.well-known/jwks.json`

Public JWKS endpoint exposing RSA public keys for JWT verification.

**Response** (`200 OK`):
```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-id-1",
      "n": "...",
      "e": "AQAB",
      "alg": "RS256",
      "use": "sig"
    }
  ]
}
```

---

## Resource Server Endpoints (FastAPI)

All FastAPI endpoints require a valid JWT Bearer token (except the dev bypass). The `organization_id` is resolved from the authenticated user's `Owner` record.

### Common Headers

```
Authorization: Bearer <jwt_token>
```

### Common Error Responses

| Status | Body | When |
|---|---|---|
| `401 Unauthorized` | `{"detail": "Authentication token has expired."}` | JWT expired |
| `401 Unauthorized` | `{"detail": "Invalid authentication token: ..."}` | JWT signature invalid |
| `401 Unauthorized` | `{"detail": "Token missing user subject claim (sub)."}` | Malformed JWT |
| `403 Forbidden` | `{"detail": "Access denied to this resource."}` | Cross-tenant access attempt |
| `422 Unprocessable Entity` | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` | Request body validation failure |

---

### POST `/api/v1/registration/complete`

Called by the Next.js registration handler after Better Auth creates the user. Creates the Organization, Owner (FastAPI-side), and Widget Configuration atomically.

**Request Body**:
```json
{
  "user_id": "usr_a1b2c3d4-...",
  "email": "jane@shoestore.com",
  "full_name": "Jane Doe",
  "organization_name": "ShoeStore"
}
```

**Success Response** (`201 Created`):
```json
{
  "owner": {
    "id": "usr_a1b2c3d4-...",
    "email": "jane@shoestore.com",
    "full_name": "Jane Doe",
    "status": "active",
    "organization_id": "org_e5f6g7h8-..."
  },
  "organization": {
    "id": "org_e5f6g7h8-...",
    "display_name": "ShoeStore",
    "created_at": "2026-09-04T10:30:00Z"
  },
  "widget": {
    "id": "wgt_i9j0k1l2-...",
    "organization_id": "org_e5f6g7h8-...",
    "widget_key": "rd_live_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345678901234",
    "primary_color": "#4F46E5",
    "bot_display_name": "Support Assistant",
    "welcome_message": "Hi! How can I help you today?",
    "widget_placement": "bottom-right"
  }
}
```

**Error Responses**:
- `409 Conflict` — Owner with this `user_id` already exists (duplicate registration)
- `500 Internal Server Error` — Transaction rolled back due to provisioning failure

---

### GET `/api/v1/organization/profile`

Retrieve the authenticated owner's organization profile and widget configuration.

**Success Response** (`200 OK`):
```json
{
  "organization": {
    "id": "org_e5f6g7h8-...",
    "display_name": "ShoeStore",
    "created_at": "2026-09-04T10:30:00Z"
  },
  "widget": {
    "widget_key": "rd_live_aBcDeFgH...",
    "primary_color": "#4F46E5",
    "bot_display_name": "Support Assistant",
    "welcome_message": "Hi! How can I help you today?",
    "widget_placement": "bottom-right",
    "has_grace_key": false
  },
  "embed_snippet": "<script src=\"https://resolvdesk.com/widget.js\" data-widget-key=\"rd_live_aBcDeFgH...\"></script>"
}
```

---

### POST `/api/v1/organization/widget/rotate-key`

Rotate the public widget key. Creates a new primary key and moves the current key to the 24-hour grace period.

**Request Body**: None (empty POST).

**Success Response** (`200 OK`):
```json
{
  "new_widget_key": "rd_live_xYz987654321...",
  "previous_widget_key": "rd_live_aBcDeFgH...",
  "grace_expires_at": "2026-09-05T10:30:00Z",
  "embed_snippet": "<script src=\"https://resolvdesk.com/widget.js\" data-widget-key=\"rd_live_xYz987654321...\"></script>"
}
```

---

### GET `/api/v1/me`

Get the authenticated owner's profile.

**Success Response** (`200 OK`):
```json
{
  "id": "usr_a1b2c3d4-...",
  "email": "jane@shoestore.com",
  "full_name": "Jane Doe",
  "status": "active",
  "organization_id": "org_e5f6g7h8-..."
}
```

---

### GET `/api/v1/widget/config`

Fetch public widget branding and configuration for an embed snippet. Operates **without visitor authentication** using the public widget key. Supports active primary keys and keys in the 24-hour grace period.

**Query Parameters**:
- `key` (string, required) — The public widget key (`rd_live_...`)

**Success Response** (`200 OK`):
```json
{
  "widget_key": "rd_live_aBcDeFgH...",
  "bot_display_name": "Support Assistant",
  "welcome_message": "Hi! How can I help you today?",
  "primary_color": "#4F46E5",
  "widget_placement": "bottom-right",
  "is_active": true
}
```

**Error Responses**:
- `400 Bad Request` — Missing or malformed `key` query parameter
- `404 Not Found` — `{"detail": "Widget configuration not found or inactive"}` (unknown key or expired grace key)

