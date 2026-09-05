import * as React from "react";
import type { Metadata } from "next";
import { Sliders, Code2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Widget Customizer - ResolvDesk",
  description: "Customize and embed your autonomous support widget.",
};

export default function WidgetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Widget Customizer
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure bot appearance, welcome greeting, placement, and retrieve your live embed code.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              Appearance & Greetings
            </CardTitle>
            <CardDescription>
              Adjust your widget display name, theme accent color, and initial message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <span className="font-medium text-foreground">Bot Name:</span> Support Assistant
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <span className="font-medium text-foreground">Welcome Message:</span> Hi! How can I help you today?
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <span className="font-medium text-foreground">Placement:</span> Bottom Right
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Code2 className="size-4 text-primary" />
              Embed Snippet
            </CardTitle>
            <CardDescription>
              Paste this script tag inside the &lt;body&gt; of your website.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg border border-border/60 bg-muted/50 p-4 font-mono text-xs overflow-x-auto text-foreground">
              <code>{`<script 
  src="https://resolvdesk.com/widget.js" 
  data-widget-key="rd_live_preview"
  defer>
</script>`}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
