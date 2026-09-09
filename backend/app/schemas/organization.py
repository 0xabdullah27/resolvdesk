import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class OwnerProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: Optional[str] = "owner"
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
    allowed_origins: str = "localhost"
    has_grace_key: bool = False
    grace_expires_at: Optional[datetime.datetime] = None
    embed_snippet: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WidgetUpdateRequest(BaseModel):
    bot_display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    welcome_message: Optional[str] = Field(None, min_length=1, max_length=500)
    primary_color: Optional[str] = Field(None, pattern=r"^#([A-Fa-f0-9]{6})$")
    widget_placement: Optional[str] = Field(
        None,
        max_length=64,
        pattern=r"^(bottom-right|bottom-left|top-right|top-left)(:\d{1,4}:\d{1,4})?$",
    )
    allowed_origins: Optional[str] = Field(None, max_length=500)

    @field_validator("allowed_origins")
    @classmethod
    def validate_allowed_origins(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            parts = [p.strip() for p in v.split(",") if p.strip()]
            if not parts:
                raise ValueError("At least one authorized domain must be specified.")
            if "*" in parts:
                raise ValueError("Wildcard '*' is not permitted. Please specify verified domain hostnames.")
        return v


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
