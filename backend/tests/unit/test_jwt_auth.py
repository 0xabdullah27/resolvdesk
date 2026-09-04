import uuid
import pytest
from fastapi import HTTPException
from app.core import auth
from tests.conftest import issue_test_jwt


def test_verify_jwt_valid(mock_jwks_signing_key):
    """Verify valid RS256 token is decoded correctly."""
    user_id = str(uuid.uuid4())
    token = issue_test_jwt(sub=user_id, email="jane@example.com")
    payload = auth.verify_jwt(token)

    assert payload["sub"] == user_id
    assert payload["email"] == "jane@example.com"
    assert "exp" in payload


def test_verify_jwt_expired(mock_jwks_signing_key):
    """Verify expired token raises 401 with specific expiration detail."""
    user_id = str(uuid.uuid4())
    token = issue_test_jwt(sub=user_id, is_expired=True)

    with pytest.raises(HTTPException) as exc_info:
        auth.verify_jwt(token)

    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_verify_jwt_tampered_signature(mock_jwks_signing_key):
    """Verify tampered token signature raises 401."""
    token = issue_test_jwt(sub=str(uuid.uuid4()))
    tampered_token = token[:-10] + "tampered00"

    with pytest.raises(HTTPException) as exc_info:
        auth.verify_jwt(tampered_token)

    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()
