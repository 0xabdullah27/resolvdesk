import * as React from "react";
import Link from "next/link";
import { Bot, ArrowRight, ShieldCheck, Zap, Users2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Bot className="size-5" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight">
              ResolvDesk
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className={buttonVariants({ size: "sm" })}
            >
              Get Started
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 md:py-32">
          {/* Ambient lighting */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 px-3.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md mb-6">
              <span className="flex size-2 rounded-full bg-primary" />
              Autonomous Support Agent Platform
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
              AI Support for Your Store.{" "}
              <span className="text-muted-foreground">
                Grounded in your actual knowledge.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Equip your website with an intelligent assistant that resolves
              visitor questions directly from your documentation, catalogs, and
              FAQs — with seamless human handoff when needed.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className={buttonVariants({
                  size: "lg",
                  className: "h-12 px-8 text-base",
                })}
              >
                Start Free Trial
                <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-12 px-8 text-base",
                })}
              >
                Existing Owner Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Pillars */}
        <section className="border-t border-border/60 py-20 bg-muted/20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-card-foreground">
                  Grounded & Hallucination-Free
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Answers strictly cite your uploaded documents. If the knowledge
                  base doesn’t contain the answer, the assistant never guesses.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <Zap className="size-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-card-foreground">
                  Instant Embeddable Widget
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Drop a single script tag into any web store or SaaS landing page
                  and start resolving visitor inquiries immediately.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <Users2 className="size-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-card-foreground">
                  Human Safety Net
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Conversations requiring human review escalate straight to your
                  inbox with full conversation history and context preserved.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 bg-background">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ResolvDesk Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Create Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
