# ResolvDesk Backend Resource Server

Asynchronous FastAPI service providing multi-tenant organization workspaces, widget key management, and stateless JWT verification.

## Tech Stack
- **FastAPI 0.115+**
- **SQLModel 0.0.42+** with async sessions
- **asyncpg 0.31+** for PostgreSQL connection pooling
- **Alembic** for tracked database migrations
- **PyJWT & PyJWKClient** for stateless JWKS verification
- **pytest & pytest-asyncio** with isolated test fixtures

## Running Locally
```bash
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

## Running Tests
```bash
uv run pytest -v
```
