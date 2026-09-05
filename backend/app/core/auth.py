import datetime
import uuid
from typing import Annotated, Any, Dict, Optional
import jwt
from jwt import PyJWKClient
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.owner import Owner, OwnerStatus

# Setup PyJWKClient with caching for stateless JWT verification
jwks_client = PyJWKClient(
    settings.AUTH_JWKS_URL,
    cache_keys=True,
    max_cached_keys=10,
)

security_scheme = HTTPBearer(auto_error=False)


def verify_jwt(token: str) -> Dict[str, Any]:
    """Decodes and validates RSA- or EdDSA-signed JWT using Better Auth JWKS public keys."""
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "EdDSA"],
            options={"verify_aud": False, "verify_iss": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_id(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> str:
    """Dependency that extracts and returns verified user_id (sub or id claim).

    Supports development bypass headers when DEV_AUTH_BYPASS is active.
    """
    # FR-012 Development Authentication Bypass
    if settings.DEV_AUTH_BYPASS and settings.DEBUG:
        dev_user_id = request.headers.get("x-dev-user-id")
        if dev_user_id:
            return dev_user_id

    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_jwt(token)
    user_id: Optional[str] = payload.get("sub") or payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user subject claim (sub).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


CurrentUser = Annotated[str, Depends(get_current_user_id)]


async def get_current_owner(
    user_id: CurrentUser,
    session: AsyncSession = Depends(get_db),
) -> Owner:
    """Dependency resolving authenticated Owner entity from database.

    Enforces account status active requirement (FR-010/T035).
    """
    try:
        owner_uuid = uuid.UUID(user_id)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token.",
        )

    statement = select(Owner).where(Owner.id == owner_uuid)
    result = await session.exec(statement)
    owner = result.first()

    if not owner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Owner profile not found.",
        )

    if owner.status != OwnerStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or inactive.",
        )

    return owner


CurrentOwner = Annotated[Owner, Depends(get_current_owner)]


def create_dev_test_token(
    user_id: str,
    email: str = "dev@resolvdesk.com",
    organization_id: Optional[str] = None,
    expires_in_hours: int = 24,
) -> str:
    """Utility generator for development/testing auth tokens (FR-012)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now + datetime.timedelta(hours=expires_in_hours)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "iss": settings.AUTH_ISSUER,
        "aud": settings.AUTH_AUDIENCE,
    }
    if organization_id:
        payload["organization_id"] = organization_id

    # For dev token simulation where no RSA private key is configured,
    # encode with HS256 using APP secret or dummy secret for offline testing
    return jwt.encode(payload, "dev-secret-key-only", algorithm="HS256")
