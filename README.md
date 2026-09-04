# ResolvDesk

ResolvDesk is a multi-tenant AI-powered customer support platform. It features an embeddable customer chat widget, automated knowledge base retrieval (RAG), seamless human ticket escalation, and strict tenant isolation.

---

## Architecture Overview

ResolvDesk follows a decoupled, stateless Resource Server architecture:
- **Frontend / Auth Authority (`frontend/`)**: Next.js 16 App Router with [Better Auth](https://better-auth.com) managing user registration, sessions, and exposing the public JWKS endpoint (`/.well-known/jwks.json`).
- **Backend / Resource Server (`backend/`)**: Asynchronous FastAPI service with SQLModel, PostgreSQL (`asyncpg`), and Alembic. Validates RSA-signed JWTs statelessly via `PyJWKClient` and enforces strict database query-level tenant filtering (`WHERE organization_id = ...`).

---

## Getting Started

### Prerequisites
- **Python**: 3.12+ with [uv](https://github.com/astral-sh/uv)
- **Node.js**: 20+ with `npm`
- **PostgreSQL**: Local instance or Neon Serverless PostgreSQL

---

### Backend Setup & Execution

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Configure environment variables (create `backend/.env`):
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/resolvdesk
   AUTH_JWKS_URL=http://localhost:3000/api/auth/.well-known/jwks.json
   AUTH_ISSUER=http://localhost:3000
   AUTH_AUDIENCE=resolvdesk-api
   CORS_ORIGINS=http://localhost:3000
   ENVIRONMENT=development
   LOG_LEVEL=DEBUG
   ```

3. Run database migrations:
   ```bash
   uv run alembic upgrade head
   ```

4. Start the FastAPI development server:
   ```bash
   uv run uvicorn app.main:app --reload --port 8000
   ```
   Interactive Swagger API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Frontend Setup & Execution

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Configure environment variables (create `frontend/.env.local`):
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/resolvdesk
   BETTER_AUTH_SECRET=your-secure-random-32-char-secret-here
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The JWKS endpoint is accessible at [http://localhost:3000/api/auth/.well-known/jwks.json](http://localhost:3000/api/auth/.well-known/jwks.json).

---

## Testing & Verification

Run the automated backend test suite (unit, contract, and multi-tenant integration tests):
```bash
cd backend
uv run pytest -v
```

All 15 automated tests run against an isolated in-memory SQLite database using ephemeral RSA test keypairs, verifying:
- Atomic registration provisioning and multi-table rollback on failure
- JWT signature decoding, expiration, and tampering rejection
- Multi-tenant query isolation (`WHERE organization_id = ...`)
- Widget key rotation with 24-hour grace periods
- Public unauthenticated widget configuration retrieval
- Inactive/suspended session rejection
