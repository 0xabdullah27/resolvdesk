"use client";

import * as React from "react";
import {
  Code2,
  Copy,
  Check,
  KeyRound,
  Clock,
  HelpCircle,
  Send,
  ShoppingBag,
  Globe,
  Layers,
  Sparkles,
  ChevronRight,
} from "lucide-react";
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

interface PlatformGuide {
  id: string;
  name: string;
  icon: React.ElementType;
  badge: string;
  steps: { title: string; desc: string }[];
}

const PLATFORMS: PlatformGuide[] = [
  {
    id: "shopify",
    name: "Shopify",
    icon: ShoppingBag,
    badge: "E-Commerce",
    steps: [
      {
        title: "Go to Themes",
        desc: "In your Shopify Admin sidebar, click Online Store → Themes.",
      },
      {
        title: "Open Code Editor",
        desc: "Next to your active theme, click the three dots (···) and select Edit code.",
      },
      {
        title: "Find theme.liquid",
        desc: "In the left file list under Layout, click theme.liquid.",
      },
      {
        title: "Paste & Save",
        desc: "Scroll down to the bottom, paste your code on the line right above </body>, then click Save.",
      },
    ],
  },
  {
    id: "wordpress",
    name: "WordPress / WooCommerce",
    icon: Globe,
    badge: "CMS / Store",
    steps: [
      {
        title: "Install WPCode Plugin",
        desc: "In your WordPress sidebar, click Plugins → Add New. Search for 'WPCode' and click Install Now → Activate.",
      },
      {
        title: "Open Header & Footer",
        desc: "In your WordPress sidebar, go to Code Snippets → Header & Footer.",
      },
      {
        title: "Paste in Footer",
        desc: "Scroll to the Footer box and paste your code snippet.",
      },
      {
        title: "Save Changes",
        desc: "Click the Save Changes button at the top right. Your chatbot is now live!",
      },
    ],
  },
  {
    id: "wix",
    name: "Wix",
    icon: Sparkles,
    badge: "Website Builder",
    steps: [
      {
        title: "Open Settings",
        desc: "In your Wix dashboard sidebar, go to Settings → Custom Code (under Advanced).",
      },
      {
        title: "Add Code",
        desc: "Click the + Add Custom Code button at the top right.",
      },
      {
        title: "Paste Snippet",
        desc: "Paste your code snippet into the Code Snippet text box.",
      },
      {
        title: "Set Placement",
        desc: "Choose 'All Pages' and select 'Body - end', then click Apply.",
      },
    ],
  },
  {
    id: "squarespace",
    name: "Squarespace",
    icon: Layers,
    badge: "Website Builder",
    steps: [
      {
        title: "Open Developer Tools",
        desc: "In your Squarespace menu, click Settings → Developer Tools → Code Injection.",
      },
      {
        title: "Find Footer Box",
        desc: "Scroll down to the Footer text area.",
      },
      {
        title: "Paste Snippet",
        desc: "Paste your embed code snippet into the Footer box.",
      },
      {
        title: "Save",
        desc: "Click the Save button in the top-left corner.",
      },
    ],
  },
  {
    id: "general",
    name: "Other / Custom HTML",
    icon: Code2,
    badge: "Any Website",
    steps: [
      {
        title: "Open Layout File",
        desc: "Open your website's main index.html or global footer template.",
      },
      {
        title: "Locate Closing Tag",
        desc: "Scroll to the bottom of the file until you see the closing </body> tag.",
      },
      {
        title: "Paste Script",
        desc: "Paste the snippet directly above the </body> tag.",
      },
      {
        title: "Publish",
        desc: "Save and redeploy your website changes.",
      },
    ],
  },
];

export function WidgetEmbedCard({
  widgetKey,
  embedSnippet,
  hasGraceKey,
  graceExpiresAt,
  onRequestRotate,
}: WidgetEmbedCardProps) {
  const [copiedSnippet, setCopiedSnippet] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedDevNote, setCopiedDevNote] = React.useState(false);
  const [selectedPlatform, setSelectedPlatform] = React.useState("shopify");

  const cleanSnippet =
    embedSnippet ||
    `<script src="${typeof window !== "undefined" ? window.location.origin : "https://resolvdesk.online"}/widget.js" data-widget-key="${widgetKey}" defer></script>`;

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

  const handleCopyDevNote = async () => {
    const note = `Hi!\n\nCould you please add our ResolvDesk AI customer support widget to our website? Here is the single line of code to include right before the closing </body> tag on all pages:\n\n${cleanSnippet}\n\nThank you!`;
    try {
      await navigator.clipboard.writeText(note);
      setCopiedDevNote(true);
      toast.success("Instructions copied! You can paste this directly into an email or message to your developer.");
      setTimeout(() => setCopiedDevNote(false), 2500);
    } catch {
      toast.error("Failed to copy instructions.");
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

  const activeGuide = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Code2 className="size-4 text-primary" />
            Embed Code &amp; Easy Installation
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
          Copy this 1-line script and paste it into your website builder to launch your live AI support assistant.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
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

        {/* ------------------------------------------------------------- */}
        {/* Non-Technical Step-by-Step Installation Guide                 */}
        {/* ------------------------------------------------------------- */}
        <div className="rounded-xl border border-border/80 bg-muted/10 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                How to Add to Your Website (Step-by-Step)
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">No coding required</span>
          </div>

          {/* Platform Selector Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isSelected = platform.id === selectedPlatform;
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {platform.name}
                </button>
              );
            })}
          </div>

          {/* Active Platform Instructions */}
          <div className="rounded-lg border border-border/60 bg-background/80 p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <activeGuide.icon className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {activeGuide.name} Instructions
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {activeGuide.badge}
              </span>
            </div>

            <ol className="space-y-2.5">
              {activeGuide.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground block">
                      {step.title}
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Freelancer / Web Developer Delegation Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-foreground block">
                Have a web designer or freelancer?
              </span>
              <p className="text-[11px] text-muted-foreground">
                Copy ready-to-send instructions with your snippet to email or WhatsApp to your developer.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyDevNote}
              className="h-7 px-3 text-xs shrink-0 cursor-pointer"
            >
              {copiedDevNote ? (
                <>
                  <Check className="mr-1.5 size-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  Copied Note!
                </>
              ) : (
                <>
                  <Send className="mr-1.5 size-3.5 text-primary" />
                  Copy Developer Note
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
