import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bot, Sparkles, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface LandingCTAProps {
  isLoggedIn?: boolean;
}

export function LandingCTA({ isLoggedIn }: LandingCTAProps) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 bg-muted/40 border-t border-border/60">
      {/* Background glow accents */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-6">
          <Sparkles className="size-3.5" />
          Start Free Today
        </div>

        <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
          Ready to Automate Your Customer Support in Minutes?
        </h2>

        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Upload your store policies, customize your floating chatbot, and drop one line of code
          into your website. Resolve customer inquiries 24/7 with zero hallucinations.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className={buttonVariants({
                size: "lg",
                className: "h-12 px-8 text-base gap-2 font-semibold",
              })}
            >
              <Bot className="size-5" />
              Open Your Dashboard
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className={buttonVariants({
                  size: "lg",
                  className: "h-12 px-8 text-base gap-2 font-semibold",
                })}
              >
                Create Your Free Chatbot
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-12 px-8 text-base font-semibold",
                })}
              >
                Existing Owner Sign In
              </Link>
            </>
          )}
        </div>

        {/* Reassurance points */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-primary" />
            <span>100% Free Forever</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-primary" />
            <span>No Credit Card Required</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-primary" />
            <span>Live in 2 Minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
}
