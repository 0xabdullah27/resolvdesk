import datetime
import json
import uuid
from typing import AsyncGenerator
import jwt
import pytest
import pytest_asyncio
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient
from jwt.algorithms import RSAAlgorithm
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

# Generate ephemeral RSA keypair for testing
_TEST_PRIVATE_KEY = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)
_TEST_PUBLIC_KEY = _TEST_PRIVATE_KEY.public_key()
_TEST_KID = "test-key-id-001"

TEST_PRIVATE_PEM = _TEST_PRIVATE_KEY.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
).decode("utf-8")

TEST_PUBLIC_PEM = _TEST_PUBLIC_KEY.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
).decode("utf-8")

TEST_JWK_DICT = json.loads(RSAAlgorithm.to_jwk(_TEST_PUBLIC_KEY))
TEST_JWK_DICT.update({
    "kid": _TEST_KID,
    "use": "sig",
    "alg": "RS256",
})


def issue_test_jwt(
    sub: str,
    email: str = "owner@example.com",
    organization_id: str | None = None,
    is_expired: bool = False,
    kid: str = _TEST_KID,
    custom_claims: dict | None = None,
) -> str:
    """Utility to issue cryptographically signed RS256 test JWT tokens."""
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now - datetime.timedelta(hours=1) if is_expired else now + datetime.timedelta(days=7)
    
    payload = {
        "sub": sub,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "iss": "http://localhost:3000",
        "aud": "resolvdesk-api",
    }
    if organization_id:
        payload["organization_id"] = organization_id
    if custom_claims:
        payload.update(custom_claims)

    headers = {"kid": kid}
    return jwt.encode(payload, TEST_PRIVATE_PEM, algorithm="RS256", headers=headers)


# In-memory test database using SQLite with aiosqlite and StaticPool
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

test_session_factory = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


import app.models  # noqa: F401 - registers all SQLModel entities in metadata
import app.core.database

# Patch app.core.database to use test engine and session factory
app.core.database.engine = test_engine
app.core.database.async_session_factory = test_session_factory


@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    """Create all tables before each test and drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture(autouse=True)
async def isolate_vector_store(monkeypatch):
    """Ensures each test runs against an isolated in-memory Qdrant instance to avoid polluting live cloud cluster."""
    from qdrant_client import AsyncQdrantClient
    from app.repos.vector_repo import vector_repo

    in_memory_client = AsyncQdrantClient(location=":memory:")
    monkeypatch.setattr(vector_repo, "_client", in_memory_client)
    monkeypatch.setattr(vector_repo, "_initialized", False)
    yield
    await in_memory_client.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yields a test database AsyncSession."""
    async with test_session_factory() as session:
        yield session


class MockSigningKey:
    """Mock PyJWK signing key object matching pyjwt's interface."""
    def __init__(self, key: str):
        self.key = key


@pytest.fixture
def mock_jwks_signing_key(monkeypatch):
    """Mocks PyJWKClient.get_signing_key_from_jwt to return test public key."""
    from app.core import auth

    def _mock_get_signing_key_from_jwt(*args, **kwargs):
        return MockSigningKey(TEST_PUBLIC_PEM)

    monkeypatch.setattr(
        auth.jwks_client,
        "get_signing_key_from_jwt",
        _mock_get_signing_key_from_jwt,
    )
    return TEST_PUBLIC_PEM


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, mock_jwks_signing_key) -> AsyncGenerator[AsyncClient, None]:
    """Provides an AsyncClient bound to the FastAPI application with mocked auth & DB."""
    from app.main import app
    from app.core.database import get_db

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
