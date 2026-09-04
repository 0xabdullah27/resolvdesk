from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ResolvDesk API"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "DEBUG"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/resolvdesk"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    # Better Auth & JWKS
    BETTER_AUTH_URL: str = "http://localhost:3000"
    AUTH_JWKS_URL: str = "http://localhost:3000/api/auth/.well-known/jwks.json"
    AUTH_ISSUER: str = "http://localhost:3000"
    AUTH_AUDIENCE: str = "resolvdesk-api"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000"]

    # Widget & Multi-tenant defaults
    WIDGET_KEY_PREFIX: str = "rd_live_"
    WIDGET_GRACE_PERIOD_HOURS: int = 24
    DEV_AUTH_BYPASS: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
