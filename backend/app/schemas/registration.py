import datetime
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegistrationCompleteRequest(BaseModel):
    user_id: str = Field(..., description="Better Auth user UUID or ID")
    email: EmailStr = Field(..., description="Owner email address")
    full_name: str = Field(..., min_length=1, max_length=200, description="Owner full name")
    organization_name: str = Field(..., min_length=1, max_length=200, description="Organization workspace name")

    model_config = ConfigDict(str_strip_whitespace=True)


class OwnerResponse(BaseModel):
    id: str
    email: str
    full_name: str
    status: str
    organization_id: str

    model_config = ConfigDict(from_attributes=True)


class OrganizationResponse(BaseModel):
    id: str
    display_name: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class WidgetResponse(BaseModel):
    id: str
    organization_id: str
    widget_key: str
    primary_color: str
    bot_display_name: str
    welcome_message: str
    widget_placement: str

    model_config = ConfigDict(from_attributes=True)


class RegistrationCompleteResponse(BaseModel):
    owner: OwnerResponse
    organization: OrganizationResponse
    widget: WidgetResponse

    model_config = ConfigDict(from_attributes=True)
