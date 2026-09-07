"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { WidgetCustomizerView } from "@/components/widget/widget-customizer-view";
import { WidgetCustomizerSkeleton } from "@/components/widget/widget-skeleton";
import { Button } from "@/components/ui/button";
import type { WidgetConfig } from "@/types/widget";

const fallbackConfig: WidgetConfig = {
  widget_key: "rd_live_default",
  has_grace_key: false,
  bot_display_name: "Support Assistant",
  welcome_message: "Hi! How can I help you today?",
  primary_color: "#4F46E5",
  widget_placement: "bottom-right",
  allowed_origins: "*",
  embed_snippet: '<script src="https://resolvdesk.online/widget.js" data-widget-key="rd_live_default" defer></script>',
};

export function WidgetCustomizerContainer() {
  const { widgetConfig, loadWidgetConfig, updateWidgetConfigCache } = useDashboard();

  React.useEffect(() => {
    if (widgetConfig.status === "idle") {
      loadWidgetConfig();
    }
  }, [widgetConfig.status, loadWidgetConfig]);

  // If initial load is in progress and we do not have cached data yet, show skeleton
  if (!widgetConfig.data && (widgetConfig.status === "idle" || widgetConfig.status === "loading")) {
    return <WidgetCustomizerSkeleton />;
  }

  // Error state with retry
  if (widgetConfig.status === "error" && !widgetConfig.data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-destructive/30 rounded-xl bg-card text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Failed to Load Widget Configuration</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {widgetConfig.error || "An error occurred while fetching your widget branding settings."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadWidgetConfig(true)}
          className="cursor-pointer"
        >
          <RefreshCw className="mr-2 size-4" />
          Retry
        </Button>
      </div>
    );
  }

  const config = widgetConfig.data || fallbackConfig;

  return (
    <WidgetCustomizerView
      key={config.widget_key}
      initialConfig={config}
      onConfigUpdated={updateWidgetConfigCache}
    />
  );
}
