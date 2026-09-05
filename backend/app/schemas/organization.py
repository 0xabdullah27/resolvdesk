import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class OwnerProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    status: str
    organization_id: str
    organization_name: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OrganizationDetails(BaseModel):
    id: str
    display_name: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class WidgetProfileDetails(BaseModel):
    widget_key: str
    primary_color: str
    bot_display_name: str
    welcome_message: str
    widget_placement: str
    has_grace_key: bool = False

    model_config = ConfigDict(from_attributes=True)


class OrganizationProfileResponse(BaseModel):
    organization: OrganizationDetails
    widget: WidgetProfileDetails
    embed_snippet: str

    model_config = ConfigDict(from_attributes=True)


class WidgetKeyRotationResponse(BaseModel):
    new_widget_key: str
    previous_widget_key: str
    grace_expires_at: datetime.datetime
    embed_snippet: str

    model_config = ConfigDict(from_attributes=True)
