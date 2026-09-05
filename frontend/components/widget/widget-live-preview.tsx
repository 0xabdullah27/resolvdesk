"use client";

import * as React from "react";
import { Eye, Monitor, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WidgetPreviewBubble } from "./widget-preview-bubble";
import { WidgetPreviewWindow } from "./widget-preview-window";
import type { WidgetPlacement } from "@/types/widget";
import { cn } from "@/lib/utils";

interface WidgetLivePreviewProps {
  botName: string;
  greeting: string;
  primaryColor: string;
  placement: WidgetPlacement;
}

export function WidgetLivePreview({
  botName,
  greeting,
  primaryColor,
  placement,
}: WidgetLivePreviewProps) {
  // Start with preview window open so owner immediately sees header & greeting
  const [isOpen, setIsOpen] = React.useState(true);

  const isBottomLeft = placement === "bottom-left";

  return (
    <Card className="border-border/70 bg-card overflow-hidden shadow-sm">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Monitor className="size-4 text-primary" />
            Live Preview Simulation
          </CardTitle>
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            <Eye className="size-3" />
            Real-time (&lt;50ms)
          </span>
        </div>
        <CardDescription className="text-xs">
          Interactive preview demonstrating how the widget appears to visitors on your storefront.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {/* Simulated Browser Viewport */}
        <div className="relative flex flex-col h-[520px] lg:h-[540px] bg-background/95 overflow-hidden">
          {/* Simulated Browser Address Bar */}
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2 text-xs select-none">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-amber-400/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex-1 mx-2 flex items-center justify-center rounded-md bg-background/80 border border-border/50 py-0.5 px-3 font-mono text-[11px] text-muted-foreground truncate">
              https://your-online-store.com
            </div>
          </div>

          {/* Simulated Storefront Content in Background */}
          <div className="flex-1 p-6 space-y-6 opacity-40 select-none pointer-events-none">
            <div className="space-y-2 max-w-sm">
              <div className="h-6 w-3/4 rounded-md bg-muted-foreground/30 animate-pulse" />
              <div className="h-4 w-full rounded-md bg-muted-foreground/20" />
              <div className="h-4 w-2/3 rounded-md bg-muted-foreground/20" />
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md pt-2">
              <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
                <div className="h-20 rounded-lg bg-muted-foreground/15" />
                <div className="h-3 w-3/4 rounded bg-muted-foreground/25" />
                <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
              </div>
              <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
                <div className="h-20 rounded-lg bg-muted-foreground/15" />
                <div className="h-3 w-3/4 rounded bg-muted-foreground/25" />
                <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
              </div>
            </div>
          </div>

          {/* Interactive Widget Overlay Anchor */}
          <div
            className={cn(
              "absolute bottom-4 flex flex-col gap-3 z-10",
              isBottomLeft ? "left-4 items-start" : "right-4 items-end"
            )}
          >
            {/* Expanded Chat Window */}
            {isOpen && (
              <WidgetPreviewWindow
                botName={botName}
                greeting={greeting}
                primaryColor={primaryColor}
                onClose={() => setIsOpen(false)}
              />
            )}

            {/* Floating Bubble Launcher */}
            <WidgetPreviewBubble
              isOpen={isOpen}
              onToggle={() => setIsOpen(!isOpen)}
              primaryColor={primaryColor}
            />
          </div>
        </div>

        {/* Footer Hint */}
        <div className="border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Click the floating bubble or close button to test toggling states.</span>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-primary hover:underline font-medium flex items-center gap-1"
          >
            <RotateCcw className="size-3" />
            Reopen
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
