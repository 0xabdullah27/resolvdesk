# Quickstart Validation Guide: Multi-Tenant Organization & Owner Authentication Foundation

**Branch**: `001-tenant-auth-foundation` | **Date**: 2026-09-04  
**Feature Spec**: [spec.md](./spec.md) | **Contracts**: [contracts/api.md](./contracts/api.md) | **Data Model**: [data-model.md](./data-model.md)

---

## Overview

This guide provides end-to-end validation procedures for verifying the owner registration, organization provisioning, JWT/JWKS authentication, and tenant isolation flows implemented in the `001-tenant-auth-foundation` feature.

---

## 1. Prerequisites & Environment Setup

### 1.1 Requirements
- **Node.js**: v20.x or higher
- **Python**: 3.12 or higher with `uv` installed
- **PostgreSQL**: Accessible Neon PostgreSQL instance (or local PostgreSQL 16+)
- **Tools**: `curl`, `jq`

### 1.2 Environment Variables

**Backend (`backend/.env`)**:
```bash
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/resolvdesk
AUTH_JWKS_URL=http://localhost:3000/api/auth/jwks
AUTH_ISSUER=http://localhost:3000
AUTH_AUDIENCE=resolvdesk-api
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

**Frontend (`frontend/.env.local`)**:
```bash
BETTER_AUTH_SECRET=replace-with-a-secure-random-32-character-secret
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/resolvdesk
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 1.3 Service Initialization

```bash
# Terminal 1: Run Backend Migrations and Start FastAPI
cd backend
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# Terminal 2: Start Next.js Frontend
cd frontend
npm run dev
```

---

## 2. Automated Test Verification

Before running manual validation scenarios, execute the automated test suites:

```bash
# Run backend contract, unit, and tenant-isolation tests
cd backend
uv run pytest -v tests/

# Run frontend tests
cd frontend
npm test
```

Expected output: All test cases pass with zero failures.

---

## 3. End-to-End Validation Scenarios

### Scenario 1: Owner & Organization Self-Service Registration

**Goal**: Verify an e-commerce store owner registers their account and their organization + public widget key is atomically provisioned.

1. **Submit Sign-Up via Better Auth**:
   ```bash
   curl -s -X POST http://localhost:3000/api/auth/sign-up/email \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Jane Doe",
       "email": "jane@shoestore.com",
       "password": "SecurePassword123!"
     }' | jq .
   ```
   *Expected Outcome*: HTTP 200 with `user.id` (e.g. `usr_123`) and session cookie set.

2. **Complete Atomic Organization Provisioning**:
   ```bash
   # Completed via Next.js registration handler calling backend with initial auth token
   curl -s -X POST http://localhost:8000/api/v1/registration/complete \
     -H "Authorization: Bearer <AUTH_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "<USER_ID>",
       "email": "jane@shoestore.com",
       "full_name": "Jane Doe",
       "organization_name": "Jane'\''s Shoe Store"
     }' | jq .
   ```
   *Expected Outcome*: HTTP 201 Created with JSON matching [Registration Complete Contract](./contracts/api.md#post-apiv1registrationcomplete):
   - `owner.id` equals `<USER_ID>`
   - `organization.id` generated (UUID)
   - `organization.display_name` equals `"Jane's Shoe Store"`
   - `widget.widget_key` starts with `rd_live_`

---

### Scenario 2: Better Auth JWKS Public Key Retrieval & JWT Verification

**Goal**: Verify FastAPI verifies Better Auth JWTs statelessly without calling the frontend for each request.

1. **Fetch JWKS Keys from Next.js**:
   ```bash
   curl -s http://localhost:3000/api/auth/jwks | jq .
   ```
   *Expected Outcome*: HTTP 200 with a `keys` array containing RSA or EdDSA public key components (`kty`, `kid`, `alg`, `n`, `e`).

2. **Inspect JWT Token from Better Auth Client**:
   Extract token from session endpoint:
   ```bash
   curl -s http://localhost:3000/api/auth/token \
     -H "Cookie: better-auth.session_token=<SESSION_TOKEN>" | jq .
   ```
   *Expected Outcome*: Returns `{ "token": "<JWT>" }`. Decode header to verify matching `kid` in JWKS.

---

### Scenario 3: Organization Profile Access & Multi-Tenant Isolation

**Goal**: Verify that an owner can fetch their organization details and that tenant isolation prevents cross-organization access.

1. **Owner 1 queries their organization profile**:
   ```bash
   curl -s -X GET http://localhost:8000/api/v1/organizations/me \
     -H "Authorization: Bearer <OWNER_1_JWT>" | jq .
   ```
   *Expected Outcome*: HTTP 200 with Owner 1's organization data.

2. **Register a second organization (Owner 2)**:
   Register Owner 2 (`bob@sportswear.com`) with organization `Bob's Sportswear`.

3. **Verify Cross-Tenant Isolation**:
   Attempt to query Owner 1's organization using Owner 2's credentials:
   ```bash
   curl -s -X GET http://localhost:8000/api/v1/organizations/<OWNER_1_ORG_ID> \
     -H "Authorization: Bearer <OWNER_2_JWT>" | jq .
   ```
   *Expected Outcome*: HTTP 403 Forbidden or 404 Not Found. Database query enforces `WHERE organization_id = :owner2_org_id` at the repository layer.

---

### Scenario 4: Negative Security & Token Expiration Checks

**Goal**: Verify API rejects invalid, expired, or tampered tokens.

1. **Tampered JWT**:
   ```bash
   curl -s -i -X GET http://localhost:8000/api/v1/organizations/me \
     -H "Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.INVALID_PAYLOAD.signature"
   ```
   *Expected Outcome*: HTTP 401 Unauthorized (`{"detail": "Invalid authentication credentials"}`).

2. **Expired JWT**:
   Using an artificially expired JWT (exp in past):
   *Expected Outcome*: HTTP 401 Unauthorized (`{"detail": "Token has expired"}`).

---

### Scenario 5: Public Widget Key Verification (Unauthenticated E-Commerce Visitor)

**Goal**: Verify that visitor-facing endpoints resolve the organization public key without authentication or leaking internal IDs.

1. **Fetch Widget Configuration by Public Key**:
   ```bash
   curl -s -X GET http://localhost:8000/api/v1/widget/config?key=rd_live_<WIDGET_KEY> | jq .
   ```
   *Expected Outcome*: HTTP 200 matching [Widget Config Contract](./contracts/api.md#get-apiv1widgetconfig):
   - Returns public configuration (greeting message, bot name, theme color)
   - Does NOT expose owner personal info, hashed passwords, or private tenant metrics
   - Accessible without `Authorization` header

2. **Query with Invalid Public Key**:
   ```bash
   curl -s -i -X GET http://localhost:8000/api/v1/widget/config?key=rd_live_nonexistent
   ```
   *Expected Outcome*: HTTP 404 Not Found (`{"detail": "Widget configuration not found or inactive"}`).
