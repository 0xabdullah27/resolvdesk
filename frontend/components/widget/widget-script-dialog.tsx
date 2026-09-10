"use client";

import * as React from "react";
import { Code2, Copy, Check, Send, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WidgetScriptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  widgetKey: string;
  embedSnippet: string;
}

export function WidgetScriptDialog({
  isOpen,
  onClose,
  widgetKey,
  embedSnippet,
}: WidgetScriptDialogProps) {
  const [copiedScript, setCopiedScript] = React.useState(false);
  const [copiedDevNote, setCopiedDevNote] = React.useState(false);

  const cleanSnippet =
    embedSnippet ||
    `<script src="${typeof window !== "undefined" ? window.location.origin : "https://resolvdesk.online"}/widget.js" data-widget-key="${widgetKey}" defer></script>`;

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(cleanSnippet);
      setCopiedScript(true);
      toast.success("Embed script copied to clipboard!");
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      toast.error("Failed to copy embed script.");
    }
  };

  const handleCopyDevNote = async () => {
    const note = `Hi!\n\nCould you please add our ResolvDesk AI customer support widget to our website? Here is the single line of code to include right before the closing </body> tag on all pages:\n\n${cleanSnippet}\n\nThank you!`;
    try {
      await navigator.clipboard.writeText(note);
      setCopiedDevNote(true);
      toast.success("Developer instructions copied to clipboard!");
      setTimeout(() => setCopiedDevNote(false), 2500);
    } catch {
      toast.error("Failed to copy instructions.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border/80">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1 shadow-xs">
            <Code2 className="size-5" />
          </div>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Widget Embed Script &amp; Installation Notes
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Copy your live website integration script and review important notes on embedding the autonomous AI assistant.
          </DialogDescription>
        </DialogHeader>

        {/* 1-Line Embed Script Box */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              1-Line Embed Script
            </span>
            <span className="text-[11px] text-muted-foreground">Universal HTML tag</span>
          </div>

          <div className="relative rounded-lg border border-border/80 bg-muted/60 p-3 font-mono text-xs overflow-x-auto text-foreground select-all">
            <code>{cleanSnippet}</code>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              onClick={handleCopyScript}
              className="cursor-pointer gap-1.5 text-xs font-medium h-8 shadow-xs flex-1 sm:flex-initial"
            >
              {copiedScript ? (
                <>
                  <Check className="size-3.5" />
                  <span>Copied Script</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy Embed Script</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDevNote}
              className="cursor-pointer gap-1.5 text-xs font-medium h-8 flex-1 sm:flex-initial"
            >
              {copiedDevNote ? (
                <>
                  <Check className="size-3.5 text-green-500" />
                  <span>Instructions Copied</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5 text-muted-foreground" />
                  <span>Copy Developer Note</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Important Notes About This Script */}
        <div className="space-y-2 pt-3 border-t border-border/60">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
            Notes About This Script
          </h4>

          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="size-5 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5 text-foreground">
                📌
              </div>
              <div>
                <strong className="text-foreground">Placement: </strong>
                Paste this script tag right before the closing <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">&lt;/body&gt;</code> tag of your website or theme template.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <div className="size-5 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5 text-foreground">
                <Zap className="size-3 text-amber-500" />
              </div>
              <div>
                <strong className="text-foreground">Instant Live Updates: </strong>
                Any changes you make to brand colors, bot name, greetings, or uploaded knowledge documents update automatically on your storefront—no need to re-embed.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <div className="size-5 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5 text-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
              </div>
              <div>
                <strong className="text-foreground">Safe &amp; Public: </strong>
                The <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">data-widget-key</code> is a read-only public token that cannot access your dashboard, billing, or private documents.
              </div>
            </li>
          </ul>
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer text-xs h-8">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
