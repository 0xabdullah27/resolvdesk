"use client";

import * as React from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { WidgetCustomizerView } from "@/components/widget/widget-customizer-view";
import type { WidgetConfig } from "@/types/widget";

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

export function WidgetCustomizerContainer() {
  const { widgetConfig, loadWidgetConfig, updateWidgetConfigCache } = useDashboard();

  React.useEffect(() => {
    if (widgetConfig.status === "idle") {
      loadWidgetConfig();
    }
  }, [widgetConfig.status, loadWidgetConfig]);

  const config = widgetConfig.data || fallbackConfig;

  return (
    <WidgetCustomizerView
      initialConfig={config}
      onConfigUpdated={updateWidgetConfigCache}
    />
  );
}
