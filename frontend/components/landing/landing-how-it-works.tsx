import * as React from "react";
import { UploadCloud, Sliders, Code2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function LandingHowItWorks() {
  const steps = [
    {
      number: "01",
      icon: UploadCloud,
      title: "Upload Your Knowledge Base",
      description:
        "Upload your FAQs, product catalogs, and policies in PDF, DOCX, Markdown, or plain text. ResolvDesk automatically chunks, embeds, and indexes them.",
    },
    {
      number: "02",
      icon: Sliders,
      title: "Customize to Fit Your Brand",
      description:
        "Choose your brand colors, customize your chatbot's display name, define your welcome greeting, and set placement (bottom-right or bottom-left).",
    },
    {
      number: "03",
      icon: Code2,
      title: "Embed with 1 Line of Code",
      description:
        "Paste a single `<script>` tag into your HTML or website builder (Shopify, WordPress, Webflow, Next.js). Your AI support agent goes live immediately.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-background border-t border-border/60">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Simple 3-Step Setup
          </span>
          <h2 className="font-heading mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Live on Your Website in Under 2 Minutes
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            No complex coding, no AI prompt engineering. Just upload your existing docs and start
            supporting customers around the clock.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-3 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative flex flex-col rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Step Number */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-3xl font-black text-muted-foreground/40">
                    {step.number}
                  </span>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5.5" />
                  </div>
                </div>

                <h3 className="font-heading mt-6 text-lg font-bold text-foreground">
                  {step.title}
                </h3>

                <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom Callout */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <Link
            href="/register"
            className={buttonVariants({
              size: "lg",
              className: "gap-2 font-semibold h-11 px-6",
            })}
          >
            Start Free Now
            <ArrowRight className="size-4" />
          </Link>
          <span className="text-xs text-muted-foreground">
            No credit card required • Works on all website builders
          </span>
        </div>
      </div>
    </section>
  );
}
