import * as React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getWidgetConfigAction } from "@/actions/widget-actions";
import { WidgetCustomizerView } from "@/components/widget/widget-customizer-view";
import type { WidgetConfig } from "@/types/widget";

export const metadata: Metadata = {
  title: "Widget Customizer - ResolvDesk",
  description: "Customize appearance, greeting, allowed domains, and embed your autonomous support widget.",
};

// Fallback configuration if initial fetch fails or is freshly provisioned
const fallbackConfig: WidgetConfig = {
  widget_key: "rd_live_default",
  has_grace_key: false,
  bot_display_name: "Support Assistant",
  welcome_message: "Hi! How can I help you today?",
  primary_color: "#4F46E5",
  widget_placement: "bottom-right",
  allowed_origins: "*",
  embed_snippet: '<script src="https://resolvdesk.com/widget.js" data-widget-key="rd_live_default" defer></script>',
};

/**
 * Server Component: Fetches initial widget configuration on the server
 * and passes the populated state to the interactive Client Component.
 */
export default async function WidgetPage() {
  const res = await getWidgetConfigAction();

  if (!res.success) {
    if (res.error?.includes("session") || res.error?.includes("log in")) {
      redirect("/login?callbackUrl=/dashboard/widget");
    }
    console.warn("Using fallback widget configuration:", res.error);
  }

  const config = res.data || fallbackConfig;

  return <WidgetCustomizerView initialConfig={config} />;
}

