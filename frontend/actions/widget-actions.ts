"use server";

import { revalidatePath } from "next/cache";
import { backendFetch, BackendApiError } from "@/lib/backend-api";
import type {
  WidgetConfig,
  WidgetUpdatePayload,
  WidgetKeyRotationResult,
} from "@/types/widget";

interface OrganizationProfileApiResponse {
  organization: {
    id: string;
    display_name: string;
    created_at: string;
  };
  widget: {
    widget_key: string;
    primary_color: string;
    bot_display_name: string;
    welcome_message: string;
    widget_placement: "bottom-right" | "bottom-left";
    allowed_origins: string;
    has_grace_key: boolean;
    grace_expires_at?: string | null;
    embed_snippet?: string;
  };
  embed_snippet: string;
}

interface WidgetProfileApiResponse {
  widget_key: string;
  primary_color: string;
  bot_display_name: string;
  welcome_message: string;
  widget_placement: "bottom-right" | "bottom-left";
  allowed_origins: string;
  has_grace_key: boolean;
  grace_expires_at?: string | null;
  embed_snippet?: string;
}

function parseErrorMessage(err: unknown, fallbackMessage: string): string {
  if (err instanceof BackendApiError) {
    if (typeof err.data === "object" && err.data !== null && "detail" in err.data) {
      const detail = (err.data as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
        return detail[0].msg;
      }
    }
    switch (err.status) {
      case 400:
        return "Invalid widget configuration details.";
      case 401:
        return "Your session has expired. Please log in again.";
      case 403:
        return "You do not have permission to configure this widget.";
      case 404:
        return "Widget configuration not found for your organization.";
      case 422:
        return "Validation failed: please check your color hex code and character limits.";
      case 500:
        return "Internal server error while saving widget configuration. Please try again.";
      default:
        return err.message || fallbackMessage;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallbackMessage;
}

/**
 * Retrieves the current organization's widget configuration.
 */
export async function getWidgetConfigAction(): Promise<{
  success: boolean;
  data?: WidgetConfig;
  error?: string;
}> {
  try {
    const profile = await backendFetch<OrganizationProfileApiResponse>(
      "api/v1/organization/profile",
      {
        requireAuth: true,
        cache: "no-store",
      }
    );

    const config: WidgetConfig = {
      widget_key: profile.widget.widget_key,
      grace_expires_at: profile.widget.grace_expires_at || null,
      has_grace_key: profile.widget.has_grace_key || false,
      bot_display_name: profile.widget.bot_display_name,
      welcome_message: profile.widget.welcome_message,
      primary_color: profile.widget.primary_color,
      widget_placement: profile.widget.widget_placement,
      allowed_origins: profile.widget.allowed_origins || "*",
      embed_snippet: profile.widget.embed_snippet || profile.embed_snippet,
    };

    return { success: true, data: config };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load widget configuration."),
    };
  }
}

/**
 * Updates the organization's widget appearance and allowed domains.
 */
export async function updateWidgetConfigAction(
  payload: WidgetUpdatePayload
): Promise<{
  success: boolean;
  data?: WidgetConfig;
  error?: string;
}> {
  try {
    const res = await backendFetch<WidgetProfileApiResponse>(
      "api/v1/organization/widget",
      {
        method: "PATCH",
        requireAuth: true,
        body: JSON.stringify(payload),
      }
    );

    revalidatePath("/dashboard/widget");

    const updatedConfig: WidgetConfig = {
      widget_key: res.widget_key,
      grace_expires_at: res.grace_expires_at || null,
      has_grace_key: res.has_grace_key || false,
      bot_display_name: res.bot_display_name,
      welcome_message: res.welcome_message,
      primary_color: res.primary_color,
      widget_placement: res.widget_placement,
      allowed_origins: res.allowed_origins || "*",
      embed_snippet:
        res.embed_snippet ||
        `<script src="https://resolvdesk.com/widget.js" data-widget-key="${res.widget_key}"></script>`,
    };

    return { success: true, data: updatedConfig };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to save widget configuration."),
    };
  }
}

/**
 * Rotates the widget key and begins the 24-hour dual-key grace window.
 */
export async function rotateWidgetKeyAction(): Promise<{
  success: boolean;
  data?: WidgetKeyRotationResult;
  error?: string;
}> {
  try {
    const res = await backendFetch<WidgetKeyRotationResult>(
      "api/v1/organization/widget/rotate-key",
      {
        method: "POST",
        requireAuth: true,
      }
    );

    revalidatePath("/dashboard/widget");
    return { success: true, data: res };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to rotate widget key."),
    };
  }
}
