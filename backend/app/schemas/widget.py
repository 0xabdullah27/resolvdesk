from pydantic import BaseModel, ConfigDict, Field


class PublicWidgetConfigResponse(BaseModel):
    widget_key: str = Field(..., description="Public widget key used by visitor embed snippet")
    bot_display_name: str = Field(..., description="Chat assistant display name")
    welcome_message: str = Field(..., description="Initial greeting message")
    primary_color: str = Field(..., description="Widget branding color (hex code)")
    widget_placement: str = Field(..., description="Placement on host page (e.g. bottom-right, bottom-left, top-right, top-left with optional :offsetX:offsetY)")
    allowed_origins: str = Field(default="*", description="Allowed domains/origins for widget embed")
    is_active: bool = Field(default=True, description="Whether the widget configuration is active")
    support_email: str | None = Field(default=None, description="Contact support email when widget is offline")

    model_config = ConfigDict(from_attributes=True)
