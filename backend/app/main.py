from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import CorrelationIdMiddleware, logger
from app.routers.organizations import router as organizations_router
from app.routers.registration import router as registration_router
from app.routers.widget import router as widget_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting ResolvDesk API resource server in %s mode", settings.ENVIRONMENT)
    yield
    logger.info("Shutting down ResolvDesk API resource server")


tags_metadata = [
    {
        "name": "Registration",
        "description": "Atomic owner and organization self-service onboarding",
    },
    {
        "name": "Organizations",
        "description": "Authenticated organization profile management and widget key rotation",
    },
    {
        "name": "Widget",
        "description": "Public unauthenticated visitor widget configuration",
    },
    {
        "name": "Health",
        "description": "API health and liveness checks",
    },
]

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Multi-tenant AI Customer Support Assistant Resource Server",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)

# Correlation ID Middleware
app.add_middleware(CorrelationIdMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=settings.APP_NAME,
        version="1.0.0",
        description="Multi-tenant AI Customer Support Assistant Resource Server",
        routes=app.routes,
        tags=tags_metadata,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter the RS256 JWT issued by Better Auth or test token generator.",
        }
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


# Mount Routers
app.include_router(registration_router, prefix="/api/v1/registration", tags=["Registration"])
app.include_router(organizations_router, prefix="/api/v1", tags=["Organizations"])
app.include_router(widget_router, prefix="/api/v1/widget", tags=["Widget"])
