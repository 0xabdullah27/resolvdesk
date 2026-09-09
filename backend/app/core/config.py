from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ResolvDesk API"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "DEBUG"
    DEBUG: bool = True
    SQL_ECHO: bool = False

    # Platform Administration
    PLATFORM_OWNER_EMAIL: str = "mabdullahqureshi583@gmail.com"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/resolvdesk"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)

        # Sanitize query parameters for asyncpg
        if "sslmode=require" in url:
            url = url.replace("sslmode=require", "ssl=require")
        import re
        url = re.sub(r"[&?]channel_binding=[^&]*", "", url)
        return url

    # Better Auth & JWKS
    BETTER_AUTH_URL: str = "http://localhost:3000"
    AUTH_JWKS_URL: str = "http://localhost:3000/api/auth/.well-known/jwks.json"
    AUTH_ISSUER: str = "http://localhost:3000"
    AUTH_AUDIENCE: str = "resolvdesk-api"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://resolvdesk.online",
        "https://www.resolvdesk.online",
        "https://resolvdesk.vercel.app",
        "https://homesprint.store",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "https://resolvdesk.online",
            "https://www.resolvdesk.online",
            "https://resolvdesk.vercel.app",
            "https://homesprint.store",
        ]

    # Widget & Multi-tenant defaults
    WIDGET_KEY_PREFIX: str = "rd_live_"
    WIDGET_GRACE_PERIOD_HOURS: int = 24
    DEV_AUTH_BYPASS: bool = True

    # Vector Database (Qdrant)
    QDRANT_URL: str = ":memory:"
    QDRANT_API_KEY: Union[str, None] = None
    QDRANT_COLLECTION_NAME: str = "resolvdesk_documents"

    # Provider-Agnostic Embeddings (OpenAI-compatible)
    OPENAI_API_KEY: Union[str, None] = None
    EMBEDDING_API_BASE: str = "https://api.openai.com/v1"
    EMBEDDING_API_KEY: str = "mock-key"
    EMBEDDING_MODEL_NAME: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536
    RAG_SIMILARITY_THRESHOLD: float = 0.28
    RAG_TOP_K: int = 5

    # LLM Provider-Agnostic Settings (OpenAI-compatible)
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_API_KEY: Union[str, None] = None
    LLM_MODEL: str = "gpt-4o-mini"

    # Ingestion Constraints & Limits (Configured in code, no need to set in .env)
    MAX_DOCUMENT_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MAX_DOCUMENTS_PER_ORG: int = 50
    MAX_RAW_TEXT_CHARS: int = 100_000
    CHUNK_SIZE_TOKENS: int = 500
    CHUNK_OVERLAP_TOKENS: int = 50

    # Rate Limiting
    RATE_LIMIT_CHAT_PER_MINUTE: int = 30
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    @model_validator(mode="after")
    def populate_derived_settings(self):
        # 1. Derive JWKS URL and Issuer from BETTER_AUTH_URL if changed from localhost
        base_auth = self.BETTER_AUTH_URL.rstrip("/")
        if base_auth != "http://localhost:3000":
            if self.AUTH_JWKS_URL == "http://localhost:3000/api/auth/.well-known/jwks.json":
                self.AUTH_JWKS_URL = f"{base_auth}/api/auth/.well-known/jwks.json"
            if self.AUTH_ISSUER == "http://localhost:3000":
                self.AUTH_ISSUER = base_auth

        # 2. Derive Embedding and LLM keys from OPENAI_API_KEY if provided
        if self.OPENAI_API_KEY:
            if not self.EMBEDDING_API_KEY or self.EMBEDDING_API_KEY == "mock-key":
                self.EMBEDDING_API_KEY = self.OPENAI_API_KEY
            if not self.LLM_API_KEY:
                self.LLM_API_KEY = self.OPENAI_API_KEY

        # 3. Automatically disable dev auth bypass in production or Vercel
        import os
        if self.ENVIRONMENT.lower() in ("production", "prod") or os.getenv("VERCEL") == "1":
            self.DEV_AUTH_BYPASS = False

        return self

    model_config = SettingsConfigDict(
        env_file=["backend/.env", ".env"],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
