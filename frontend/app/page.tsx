import * as React from "react";
import Link from "next/link";
import { Bot, ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getOwnerContextAction } from "@/actions/auth-actions";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingInteractivePreview } from "@/components/landing/landing-interactive-preview";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingCodeSnippet } from "@/components/landing/landing-code-snippet";
import { LandingFAQ } from "@/components/landing/landing-faq";
import { LandingCTA } from "@/components/landing/landing-cta";

export default async function HomePage() {
  const owner = await getOwnerContextAction();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground scroll-smooth">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Bot className="size-5" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight">
              ResolvDesk
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {owner ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
                  {owner.organizationName}
                </span>
                <Link
                  href="/dashboard"
                  className={buttonVariants({ size: "sm" })}
                >
                  <LayoutDashboard className="mr-1.5 size-4" />
                  Dashboard
                </Link>
              </>
            ) : (
              <>
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
                  Get Started Free
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32">
          {/* Ambient lighting glow */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-primary/8 blur-3xl" />
          </div>

          <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur-md mb-6 shadow-xs">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Free AI Support Agent • Live in 2 Minutes
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
              Turn Your Knowledge Base into a{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                24/7 AI Support Agent
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Equip your online store or web application with an intelligent customer support
              assistant that delivers instant, grounded answers from your product guides and FAQs —
              with zero hallucinations and seamless human escalation.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {owner ? (
                <Link
                  href="/dashboard"
                  className={buttonVariants({
                    size: "lg",
                    className: "h-12 px-8 text-base font-semibold",
                  })}
                >
                  <LayoutDashboard className="mr-2 size-5" />
                  Open Your Workspace
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className={buttonVariants({
                      size: "lg",
                      className: "h-12 px-8 text-base font-semibold",
                    })}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                  <a
                    href="#features"
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                      className: "h-12 px-8 text-base font-semibold",
                    })}
                  >
                    Explore Features
                  </a>
                </>
              )}
            </div>

            {/* Micro stats banner */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span>Zero Hallucinations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-border" />
                <span>Sub-500ms Streaming SSE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-border" />
                <span>1-Line Script Tag</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-border" />
                <span>No Credit Card Needed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Live Preview */}
        <LandingInteractivePreview />

        {/* Feature Grid */}
        <LandingFeatures />

        {/* How It Works (3-Step Setup) */}
        <LandingHowItWorks />

        {/* 1-Line Code Integration */}
        <LandingCodeSnippet />

        {/* FAQ Section */}
        <LandingFAQ />

        {/* Call to Action Banner */}
        <LandingCTA isLoggedIn={!!owner} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-12 bg-background">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <span className="font-heading text-base font-bold tracking-tight">
                ResolvDesk
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                • Open Source AI Customer Service
              </span>
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#faq" className="hover:text-foreground transition-colors">
                FAQ
              </a>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} ResolvDesk Inc. All rights reserved.</p>

            <p>
              Designed &amp; Built with ❤️ by{" "}
              <a
                href="https://abdullah-qureshi.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                Abdullah Qureshi
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
