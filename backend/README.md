# ResolvDesk Backend Resource Server

Asynchronous Python backend service for **ResolvDesk** built with **FastAPI**, **SQLModel**, **PostgreSQL (`asyncpg`)**, **Qdrant Vector Database**, and **Alembic**.

<p align="center">
  <strong>Developed by <a href="https://abdullah-qureshi.vercel.app">Abdullah Qureshi</a></strong>
</p>

---

## 🚀 Key Highlights

- **Stateless 3-Layer Architecture**: Enforces a strict separation of concerns across **Router** (HTTP request handling) → **Service** (business logic & RAG orchestration) → **Repository** (database & vector search operations).
- **Tenant Isolation**: Mandatory database query-level isolation (`WHERE organization_id = :id`) ensures strict multi-tenant data boundaries.
- **RAG Knowledge Retrieval**: Automated ingestion, semantic chunking, and similarity search for `.md`, `.txt`, `.pdf`, and `.docx` documents using Qdrant Cloud.
- **Stateless JWT Verification**: Validates asymmetric RS256/EdDSA JWT tokens via Better Auth's public JWKS endpoint using `PyJWKClient` with in-memory caching.
- **Safe Key Rotation**: Generates widget keys with automated 24-hour dual-key grace periods to prevent dropped chats during key updates.
- **High-Coverage Test Suite**: 86 automated unit, contract, and multi-tenant integration tests with 100% pass rate.

---

## 🛠️ Tech Stack

- **Framework**: FastAPI (Python 3.12+)
- **Package Manager**: [uv](https://docs.astral.sh/uv/)
- **Database & ORM**: SQLModel, SQLAlchemy 2.0 Async, asyncpg
- **Vector Search**: Qdrant Client (Cloud & in-memory)
- **Migrations**: Alembic
- **Testing**: pytest, pytest-asyncio, pytest-mock

---

## 💻 Local Development

1. **Install dependencies via `uv`**:
   ```bash
   cd backend
   uv sync
   ```

2. **Configure environment**:
   Create a `.env` file in `backend/`:
   ```env
   DATABASE_URL=postgresql://<user>:<pass>@<neon-host>/<db>?sslmode=require
   BETTER_AUTH_URL=http://localhost:3000
   QDRANT_URL=https://<cluster-id>.qdrant.io:6333
   QDRANT_API_KEY=your-qdrant-key
   OPENAI_API_KEY=sk-...
   ```

3. **Run database migrations**:
   ```bash
   uv run alembic upgrade head
   ```

4. **Start the API server**:
   ```bash
   uv run uvicorn app.main:app --reload --port 8000
   ```
   Interactive Swagger docs are live at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 🧪 Testing

Run the full automated test suite:
```bash
uv run pytest -v
```

```text
======================= 86 passed, 1 warning in 41.96s =======================
```

---

## 👤 Author

**Abdullah Qureshi**
- 🌐 [Portfolio](https://abdullah-qureshi.vercel.app)
- 💼 [LinkedIn](https://www.linkedin.com/in/abdullahqureshi27)
- 🐙 [GitHub](https://github.com/abdullahqureshi27)
