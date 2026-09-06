import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_registration_complete_success(client: AsyncClient):
    """Verify POST /api/v1/registration/complete creates all three entities and returns 201."""
    user_id = str(uuid.uuid4())
    payload = {
        "user_id": user_id,
        "email": "jane@shoestore.com",
        "full_name": "Jane Doe",
        "organization_name": "ShoeStore",
        "website_url": "https://shoestore.com",
    }

    response = await client.post("/api/v1/registration/complete", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    # Verify Owner
    assert "owner" in data
    assert data["owner"]["id"] == user_id
    assert data["owner"]["email"] == "jane@shoestore.com"
    assert data["owner"]["full_name"] == "Jane Doe"
    assert data["owner"]["status"] == "active"
    assert "organization_id" in data["owner"]

    # Verify Organization
    assert "organization" in data
    assert data["organization"]["id"] == data["owner"]["organization_id"]
    assert data["organization"]["display_name"] == "ShoeStore"
    assert data["organization"]["website_url"] == "https://shoestore.com"
    assert "created_at" in data["organization"]

    # Verify Widget Configuration
    assert "widget" in data
    assert data["widget"]["organization_id"] == data["organization"]["id"]
    assert data["widget"]["widget_key"].startswith("rd_live_")
    assert data["widget"]["primary_color"] == "#4F46E5"
    assert data["widget"]["bot_display_name"] == "Support Assistant"
    assert data["widget"]["welcome_message"] == "Hi! How can I help you today?"
    assert data["widget"]["widget_placement"] == "bottom-right"
    assert data["widget"]["allowed_origins"] == "shoestore.com, localhost"


@pytest.mark.asyncio
async def test_registration_duplicate_user_id(client: AsyncClient):
    """Verify duplicate user_id triggers 409 Conflict."""
    user_id = str(uuid.uuid4())
    payload = {
        "user_id": user_id,
        "email": "owner1@example.com",
        "full_name": "Owner One",
        "organization_name": "Org One",
        "website_url": "https://orgone.com",
    }

    response1 = await client.post("/api/v1/registration/complete", json=payload)
    assert response1.status_code == 201

    payload2 = {
        "user_id": user_id,
        "email": "owner2@example.com",
        "full_name": "Owner Two",
        "organization_name": "Org Two",
        "website_url": "https://orgtwo.com",
    }
    response2 = await client.post("/api/v1/registration/complete", json=payload2)
    assert response2.status_code == 409
    assert "already exists" in response2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_registration_invalid_payload(client: AsyncClient):
    """Verify missing required fields returns 422 Unprocessable Entity."""
    payload = {
        "user_id": "not-a-uuid",
        "email": "invalid-email",
    }
    response = await client.post("/api/v1/registration/complete", json=payload)
    assert response.status_code == 422
