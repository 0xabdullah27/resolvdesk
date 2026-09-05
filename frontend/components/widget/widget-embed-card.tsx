"use client";

import * as React from "react";
import { Code2, Copy, Check, KeyRound, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WidgetEmbedCardProps {
  widgetKey: string;
  embedSnippet: string;
  hasGraceKey: boolean;
  graceExpiresAt?: string | null;
  onRequestRotate: () => void;
}

export function WidgetEmbedCard({
  widgetKey,
  embedSnippet,
  hasGraceKey,
  graceExpiresAt,
  onRequestRotate,
}: WidgetEmbedCardProps) {
  const [copiedSnippet, setCopiedSnippet] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);

  const cleanSnippet =
    embedSnippet ||
    `<script src="https://resolvdesk.com/widget.js" data-widget-key="${widgetKey}" defer></script>`;

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(cleanSnippet);
      setCopiedSnippet(true);
      toast.success("Embed script copied to clipboard!");
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      toast.error("Failed to copy embed script.");
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(widgetKey);
      setCopiedKey(true);
      toast.success("Widget public key copied!");
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      toast.error("Failed to copy widget key.");
    }
  };

  // Format grace expiration if present
  const formattedGraceDate = React.useMemo(() => {
    if (!graceExpiresAt) return null;
    try {
      const d = new Date(graceExpiresAt);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return graceExpiresAt;
    }
  }, [graceExpiresAt]);

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Code2 className="size-4 text-primary" />
            Embed Script &amp; API Key
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRequestRotate}
            className="text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <KeyRound className="mr-1.5 size-3.5" />
            Rotate Key
          </Button>
        </div>
        <CardDescription className="text-xs">
          Paste this snippet into the HTML &lt;head&gt; or &lt;body&gt; of your website or Shopify theme.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Grace window active notice */}
        {hasGraceKey && formattedGraceDate && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <Clock className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">
                Dual-Key Grace Period Active
              </span>
              <p className="text-[11px] leading-normal opacity-90">
                Your previous widget key remains active until <strong>{formattedGraceDate}</strong>. Ensure you deploy the updated script tag before this expiration.
              </p>
            </div>
          </div>
        )}

        {/* Script Code Block */}
        <div className="relative group">
          <pre className="rounded-xl border border-border/80 bg-muted/50 p-3.5 font-mono text-xs overflow-x-auto text-foreground leading-relaxed pr-24">
            <code>{cleanSnippet}</code>
          </pre>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleCopySnippet}
            className="absolute top-2.5 right-2.5 h-7 px-2.5 text-xs font-medium shadow-xs"
          >
            {copiedSnippet ? (
              <>
                <Check className="mr-1 size-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1 size-3.5" />
                Copy Code
              </>
            )}
          </Button>
        </div>

        {/* Active Public Key row */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-foreground shrink-0">Active Key:</span>
            <span className="font-mono text-muted-foreground truncate">{widgetKey}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyKey}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground shrink-0 ml-2"
          >
            {copiedKey ? (
              <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
