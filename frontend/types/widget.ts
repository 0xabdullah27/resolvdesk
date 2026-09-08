export type WidgetPlacementCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type WidgetPlacement = WidgetPlacementCorner | string;

export interface WidgetConfig {
  widget_key: string;
  previous_widget_key?: string | null;
  grace_expires_at?: string | null;
  has_grace_key: boolean;
  bot_display_name: string;
  welcome_message: string;
  primary_color: string;
  widget_placement: WidgetPlacement;
  allowed_origins: string;
  embed_snippet: string;
}

export interface WidgetUpdatePayload {
  bot_display_name?: string;
  welcome_message?: string;
  primary_color?: string;
  widget_placement?: WidgetPlacement;
  allowed_origins?: string;
}

export interface WidgetKeyRotationResult {
  new_widget_key: string;
  previous_widget_key: string;
  grace_expires_at: string;
  embed_snippet: string;
}
