from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.exceptions import ResolvDeskException
from app.core.logging import CorrelationIdMiddleware, logger
from app.repos.admin_repo import AdminRepo
from app.routers.admin import router as admin_router
from app.routers.analytics import router as analytics_router
from app.routers.conversations import router as conversations_router
from app.routers.documents import router as documents_router
from app.routers.organizations import router as organizations_router
from app.routers.registration import router as registration_router
from app.routers.widget import router as widget_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting ResolvDesk API resource server in %s mode", settings.ENVIRONMENT)
    if settings.PLATFORM_OWNER_EMAIL:
        try:
            async with async_session_factory() as session:
                bootstrapped = await AdminRepo.bootstrap_superadmin(session, settings.PLATFORM_OWNER_EMAIL)
                if bootstrapped:
                    logger.info("Bootstrapped superadmin role for %s", settings.PLATFORM_OWNER_EMAIL)
        except Exception as e:
            logger.warning("Superadmin bootstrap failed during startup: %s", e)
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
        "name": "Knowledge Base",
        "description": "Document ingestion, parsing, chunking, and tenant-isolated vector indexing",
    },
    {
        "name": "Widget",
        "description": "Public unauthenticated visitor widget configuration",
    },
    {
        "name": "Conversations",
        "description": "Authenticated owner conversation inbox, transcript inspection, and analytics",
    },
    {
        "name": "Health",
        "description": "API health and liveness checks",
    },
    {
        "name": "Platform Admin",
        "description": "Platform creator KPI observability, user directory, and account access governance",
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

# CORS Middleware: Enable cross-origin requests for embeddable widgets on external
# e-commerce storefronts (Shopify, WooCommerce, Webflow, custom domains).
# Specific merchant domain authorization is enforced at the service layer via widget.allowed_origins.
cors_origin_regex = r"^https?://.*$"
allowed_origins_list = list(settings.CORS_ORIGINS)
if "null" not in allowed_origins_list:
    allowed_origins_list.append("null")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)


# Exception Handlers
@app.exception_handler(ResolvDeskException)
async def resolvdesk_exception_handler(request: Request, exc: ResolvDeskException):
    logger.warning("Domain exception on %s [%d]: %s", request.url.path, exc.status_code, exc.message)
    headers = getattr(exc, "headers", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
        headers=headers,
    )


from fastapi.encoders import jsonable_encoder


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": jsonable_encoder(exc.errors())},
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
app.include_router(documents_router, prefix="/api/v1/documents", tags=["Knowledge Base"])
app.include_router(widget_router, prefix="/api/v1/widget", tags=["Widget"])
app.include_router(conversations_router, prefix="/api/v1/conversations", tags=["Conversations"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Platform Admin"])
