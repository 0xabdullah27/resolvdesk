---
name: fastapi-python-backend
description: Best practices, patterns, and conventions for building scalable, production-grade Python backends with FastAPI, SQLModel (async), PostgreSQL (asyncpg), Alembic, middleware, and SSE streaming. Use this skill whenever creating or modifying FastAPI endpoints, routers, database models, async sessions, database migrations, middleware (CORS, rate limiting, error handlers, logging), Server-Sent Events (SSE) streaming responses, and backend testing with pytest and TestClient.
---

# FastAPI Python Backend

Comprehensive guide for developing production-grade, asynchronous backend applications using FastAPI, SQLModel, PostgreSQL (`asyncpg`), Alembic, and `uv`.

---

## 🧭 Scope & Anti-Conflict Boundaries

| Area | Ownership |
|---|---|
| **FastAPI App & Routers** | ✅ **Covered in this skill** (lifecycle, APIRouter, dependencies) |
| **Database & ORM** | ✅ **Covered in this skill** (SQLModel async engine, async sessions, Alembic) |
| **Middleware & SSE** | ✅ **Covered in this skill** (CORS, logging, error handling, SSE response streaming) |
| **Backend Testing** | ✅ **Covered in this skill** (`pytest`, async fixtures, FastAPI `TestClient`) |
| **Authentication / JWT** | ❌ **NOT covered here**. For Better Auth JWKS verification use `better-auth-fullstack`. For custom JWT issuance & refresh cookies use `production-jwt-auth`. |
| **AI Agent Orchestration** | ❌ **NOT covered here**. For OpenAI Agents SDK and LLM workflows use `openai-agents-sdk`. |

---

## 🏗️ Core Architecture & Project Structure

```
backend/
├── src/
│   ├── main.py              # FastAPI entrypoint, lifespan, middleware, router mounts
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (BaseSettings)
│   │   └── database.py      # Async engine, sessionmaker, get_db dependency
│   ├── models/              # SQLModel table definitions (DB entities)
│   ├── schemas/             # Pure Pydantic models (Request/Response DTOs)
│   ├── routers/             # APIRouters modularized by domain
│   ├── middleware/          # CORS, rate limit, logging, exception handlers
│   └── services/            # Business logic decoupled from HTTP handlers
├── migrations/              # Alembic environment and version scripts
├── tests/                   # pytest unit and integration tests
├── pyproject.toml           # uv project configuration & dependencies
└── alembic.ini              # Alembic migration configuration
```

---

## ⚙️ Configuration & Environment (`pydantic-settings`)

```python
# src/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    app_name: str = "Backend API"
    debug: bool = False
    database_url: str
    cors_origins: List[str] = ["http://localhost:3000"]
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
```

---

## 🗄️ Asynchronous Database Setup (SQLModel + PostgreSQL)

Always use asynchronous database drivers (`asyncpg`) and async sessions to prevent blocking the event loop.

```python
# src/core/database.py
from typing import AsyncGenerator
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from src.core.config import settings

# Format: postgresql+asyncpg://user:pass@host/dbname
DATABASE_URL = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields a request-scoped AsyncSession."""
    async with async_session_factory() as session:
        yield session
```

### Models & Schema Separation
Keep DB entities (`SQLModel(table=True)`) separate from API schemas (`SQLModel` or `BaseModel` without `table=True`) to prevent leaking internal database columns.

```python
# src/models/task.py
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

class TaskBase(SQLModel):
    title: str = Field(min_length=1, max_length=200, index=True)
    description: Optional[str] = Field(default=None, max_length=2000)
    completed: bool = Field(default=False, index=True)

class Task(TaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# src/schemas/task.py
class TaskCreate(TaskBase):
    pass

class TaskRead(TaskBase):
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime
```

---

## 🚦 Database Migrations (Alembic)

In production, **never** call `create_all()`. Use versioned Alembic migrations.

```bash
# Initialize alembic (async template)
uv run alembic init -t async migrations

# Generate new migration script from models
uv run alembic revision --autogenerate -m "create task table"

# Apply pending migrations
uv run alembic upgrade head
```

In `migrations/env.py`, ensure `target_metadata = SQLModel.metadata` is set.

---

## 🛣️ Path Operations & Dependency Injection

Always use `Annotated` for dependency injection and path/query validations.

```python
# src/routers/tasks.py
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from src.core.database import get_db
from src.models.task import Task
from src.schemas.task import TaskCreate, TaskRead

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

@router.get("/", response_model=List[TaskRead])
async def list_tasks(
    db: DbSession,
    user_id: str, # Injected from Auth skill dependency
    completed: Annotated[bool | None, Query(description="Filter by completion status")] = None,
):
    query = select(Task).where(Task.user_id == user_id)
    if completed is not None:
        query = query.where(Task.completed == completed)
    result = await db.exec(query)
    return result.all()

@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(task_in: TaskCreate, db: DbSession, user_id: str):
    task = Task.model_validate(task_in, update={"user_id": user_id})
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task
```

---

## 📡 Server-Sent Events (SSE) Streaming

For streaming real-time LLM outputs or live events, use `StreamingResponse` with `text/event-stream`.

```python
# src/routers/stream.py
import json
from typing import AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/stream", tags=["Streaming"])

async def event_generator(prompt: str) -> AsyncGenerator[str, None]:
    """Generates SSE chunks formatted as data: {json}\n\n"""
    # Sample chunk generator (integrate with OpenAI Agents SDK or LLM runner)
    tokens = ["Hello", " ", "this", " ", "is", " ", "streaming!"]
    for token in tokens:
        payload = json.dumps({"token": token})
        yield f"data: {payload}\n\n"
    yield "data: [DONE]\n\n"

@router.get("/")
async def stream_events(prompt: str):
    return StreamingResponse(
        event_generator(prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", # Disable proxy buffering (Nginx)
        },
    )
```

---

## 🛡️ Middleware & Error Handling

```python
# src/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.core.config import settings
from src.routers import tasks, stream

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks (connection pools, warmup)
    yield
    # Shutdown tasks (close pool, cleanup)

app = FastAPI(title=settings.app_name, lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred.", "type": type(exc).__name__},
    )

app.include_router(tasks.router)
app.include_router(stream.router)
```

---

## 🧪 Testing with `pytest` & `TestClient`

Use `pytest-asyncio` with SQLite in-memory for unit tests or Neon test branch for integration.

```python
# tests/conftest.py
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import SQLModel
from src.main import app
from src.core.database import get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL)
test_async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

@pytest.fixture(scope="session")
async def prepare_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)

@pytest.fixture
async def db_session(prepare_db) -> AsyncGenerator[AsyncSession, None]:
    async with test_async_session() as session:
        yield session

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

Run tests via `uv`:
```bash
uv run pytest -v --cov=src
```
