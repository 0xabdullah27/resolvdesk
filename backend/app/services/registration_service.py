import secrets
import uuid
from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.repos.organization_repo import OrganizationRepo
from app.repos.widget_repo import WidgetRepo
from app.schemas.registration import (
    OrganizationResponse,
    OwnerResponse,
    RegistrationCompleteRequest,
    RegistrationCompleteResponse,
    WidgetResponse,
)


from urllib.parse import urlparse


def extract_domain(raw_url: str) -> str:
    """Extracts and normalizes the lowercase hostname/domain from a URL or bare domain string."""
    cleaned = raw_url.strip()
    if not cleaned:
        return ""
    if not cleaned.startswith(("http://", "https://")):
        cleaned = "https://" + cleaned
    try:
        parsed = urlparse(cleaned)
        return (parsed.hostname or "").lower()
    except Exception:
        return ""


def generate_widget_key() -> str:
    """Generates a cryptographically random public widget key with rd_live_ prefix."""
    random_part = secrets.token_urlsafe(32)
    return f"{settings.WIDGET_KEY_PREFIX}{random_part}"


class RegistrationService:
    """Business service handling atomic multi-table registration and provisioning."""

    @staticmethod
    async def complete_registration(
        session: AsyncSession,
        payload: RegistrationCompleteRequest,
    ) -> RegistrationCompleteResponse:
        try:
            owner_uuid = uuid.UUID(payload.user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="user_id must be a valid UUID",
            )

        # Pre-validate website domain format
        domain = extract_domain(payload.website_url)
        if not domain or ("." not in domain and domain != "localhost"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid website or store URL format.",
            )

        # 1. Pre-validation checks against existing owner records
        existing_owner_by_id = await OrganizationRepo.get_owner_by_id(session, owner_uuid)
        if existing_owner_by_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Owner with this user_id already exists.",
            )

        existing_owner_by_email = await OrganizationRepo.get_owner_by_email(
            session, payload.email
        )
        if existing_owner_by_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Owner with this email already exists.",
            )

        # 2. Atomic multi-table transaction execution
        try:
            # Step 2a: Create Organization with website_url
            org = await OrganizationRepo.create_organization(
                session=session,
                display_name=payload.organization_name,
                website_url=payload.website_url.strip(),
            )

            # Step 2b: Create Owner linked to Organization
            owner = await OrganizationRepo.create_owner(
                session=session,
                owner_id=owner_uuid,
                email=payload.email,
                full_name=payload.full_name,
                organization_id=org.id,
            )

            # Step 2c: Create Default Widget Configuration locked to merchant domain + localhost
            widget_key = generate_widget_key()
            allowed_origins = f"{domain}, localhost"
            widget = await WidgetRepo.create_widget_config(
                session=session,
                organization_id=org.id,
                widget_key=widget_key,
                allowed_origins=allowed_origins,
            )

            # Commit the atomic transaction
            await session.commit()
            await session.refresh(org)
            await session.refresh(owner)
            await session.refresh(widget)

            logger.info(
                "Successfully registered owner %s, organization %s (%s), allowed_origins=%s",
                owner.id,
                org.id,
                org.display_name,
                widget.allowed_origins,
            )

            return RegistrationCompleteResponse(
                owner=OwnerResponse(
                    id=str(owner.id),
                    email=owner.email,
                    full_name=owner.full_name,
                    status=owner.status,
                    organization_id=str(owner.organization_id),
                ),
                organization=OrganizationResponse(
                    id=str(org.id),
                    display_name=org.display_name,
                    website_url=org.website_url,
                    created_at=org.created_at,
                ),
                widget=WidgetResponse(
                    id=str(widget.id),
                    organization_id=str(widget.organization_id),
                    widget_key=widget.widget_key,
                    primary_color=widget.primary_color,
                    bot_display_name=widget.bot_display_name,
                    welcome_message=widget.welcome_message,
                    widget_placement=widget.widget_placement,
                    allowed_origins=widget.allowed_origins,
                ),
            )

        except HTTPException:
            await session.rollback()
            raise
        except Exception as err:
            await session.rollback()
            logger.error("Failed to complete atomic registration: %s", str(err), exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration provisioning transaction failed: {str(err)}",
            )
