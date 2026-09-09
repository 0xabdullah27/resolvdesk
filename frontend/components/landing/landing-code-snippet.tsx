"use client";

import * as React from "react";
import { Check, Copy, Terminal, Sparkles } from "lucide-react";

export function LandingCodeSnippet() {
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"html" | "shopify" | "react">("html");

  const snippets = {
    html: `<!-- 1. Paste this into your website right before </body> -->
<script
  src="https://resolvdesk.com/widget.js"
  data-resolvdesk-key="rd_live_9a74b1e2c8f0d3a5"
  defer
></script>`,
    shopify: `<!-- In Shopify Admin: Online Store > Themes > Edit Code > theme.liquid -->
<!-- Paste before the closing </body> tag: -->
<script
  src="https://resolvdesk.com/widget.js"
  data-resolvdesk-key="rd_live_9a74b1e2c8f0d3a5"
  defer
></script>`,
    react: `// In your root layout.tsx or _app.tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://resolvdesk.com/widget.js"
          data-resolvdesk-key="rd_live_9a74b1e2c8f0d3a5"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}`,
  };

  const currentCode = snippets[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-16 sm:py-24 bg-muted/20 border-t border-border/60">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Developer-Friendly Integration
          </div>
          <h2 className="font-heading mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Drop In One Line of Code
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Compatible with every major platform, framework, and CMS. No npm packages or build steps
            required.
          </p>
        </div>

        {/* Code Box Container */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-border/80 bg-zinc-950 text-zinc-100 shadow-2xl">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
            {/* Platform Selector Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("html")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "html"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                HTML / Webflow
              </button>
              <button
                onClick={() => setActiveTab("shopify")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "shopify"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Shopify / WordPress
              </button>
              <button
                onClick={() => setActiveTab("react")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "react"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Next.js / React
              </button>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>

          {/* Code Body */}
          <div className="p-4 sm:p-6 overflow-x-auto font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <pre>
              <code>{currentCode}</code>
            </pre>
          </div>
        </div>

        {/* Integration Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-muted-foreground">
          <span>Supported Platforms:</span>
          <span className="rounded-md border border-border/80 bg-card px-2.5 py-1">Shopify</span>
          <span className="rounded-md border border-border/80 bg-card px-2.5 py-1">WordPress / WooCommerce</span>
          <span className="rounded-md border border-border/80 bg-card px-2.5 py-1">Webflow</span>
          <span className="rounded-md border border-border/80 bg-card px-2.5 py-1">Next.js & React</span>
          <span className="rounded-md border border-border/80 bg-card px-2.5 py-1">Squarespace</span>
          <span className="rounded-md border border-border/80 bg-card px-2.5 py-1">Wix & Static Sites</span>
        </div>
      </div>
    </section>
  );
}
