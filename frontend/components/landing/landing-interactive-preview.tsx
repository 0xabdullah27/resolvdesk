"use client";

import * as React from "react";
import { Bot, User, Send, Sparkles, CheckCircle2, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function LandingInteractivePreview() {
  const [selectedPrompt, setSelectedPrompt] = React.useState<number>(0);

  const demoScenarios = [
    {
      question: "What is your return policy for damaged items?",
      answer:
        "We offer free 30-day returns on all damaged or defective items. Once reported, our team generates a prepaid return label, and your refund is processed within 3 business days.",
      source: "Returns_and_Refunds_Policy_2026.pdf",
    },
    {
      question: "Do you offer international shipping to Europe?",
      answer:
        "Yes! We ship to over 45 countries across Europe. Standard international delivery typically takes 5–8 business days with full customs clearance included.",
      source: "Global_Shipping_Guide_v2.md",
    },
    {
      question: "How do I connect my Shopify store to ResolvDesk?",
      answer:
        "Simply copy the 1-line script tag from your ResolvDesk dashboard and paste it into your Shopify theme.liquid file right before the closing </body> tag.",
      source: "Platform_Installation_Handbook.docx",
    },
  ];

  const activeScenario = demoScenarios[selectedPrompt];

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 bg-background border-t border-border/60">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3.5 py-1 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Live Visitor Experience
          </div>
          <h2 className="font-heading mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            See ResolvDesk in Action
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Experience how customers interact with your grounded AI assistant in real-time.
          </p>
        </div>

        {/* Prompt Switcher Chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {demoScenarios.map((scenario, index) => (
            <button
              key={index}
              onClick={() => setSelectedPrompt(index)}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                selectedPrompt === index
                  ? "bg-primary text-primary-foreground shadow-sm scale-102"
                  : "border border-border/80 bg-card text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {scenario.question}
            </button>
          ))}
        </div>

        {/* Mockup Container */}
        <div className="mt-10 mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
          {/* Simulated Browser Header */}
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-400/80" />
              <span className="size-3 rounded-full bg-yellow-400/80" />
              <span className="size-3 rounded-full bg-green-400/80" />
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
              <Shield className="size-3.5 text-emerald-500" />
              <span>https://yourstore.com/preview</span>
            </div>
            <div className="w-10" />
          </div>

          {/* Browser Body with Widget Overlay */}
          <div className="relative grid min-h-[440px] md:grid-cols-5 bg-gradient-to-br from-background via-muted/10 to-muted/30 p-4 sm:p-8">
            {/* Left Mock Store Content */}
            <div className="md:col-span-2 hidden md:flex flex-col justify-between pr-6 border-r border-border/40">
              <div>
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  R
                </div>
                <h4 className="mt-4 text-xl font-bold tracking-tight text-foreground">
                  Your Web Store
                </h4>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Your products, services, and storefront stay front and center while ResolvDesk
                  works silently in the corner to assist visitors.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/70 p-3.5 text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <CheckCircle2 className="size-4 text-primary" />
                  Instant Document Citations
                </div>
                <p>Every response is verified against your knowledge base files.</p>
              </div>
            </div>

            {/* Right Chat Widget Preview */}
            <div className="md:col-span-3 flex flex-col justify-between rounded-xl border border-border/80 bg-card shadow-lg overflow-hidden">
              {/* Widget Header */}
              <div className="flex items-center justify-between bg-primary p-3.5 text-primary-foreground">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
                    <Bot className="size-4.5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold leading-tight">ResolvDesk Support</h5>
                    <p className="text-[11px] text-primary-foreground/80 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      Online • Grounded Assistant
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 space-y-4 p-4 overflow-y-auto max-h-[300px] text-xs sm:text-sm">
                {/* Bot Greeting */}
                <div className="flex items-start gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="size-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted/60 p-3 text-foreground max-w-[85%]">
                    Hello! How can I assist you with your order or questions today?
                  </div>
                </div>

                {/* User Message */}
                <div className="flex items-start justify-end gap-2.5">
                  <div className="rounded-2xl rounded-tr-sm bg-primary p-3 text-primary-foreground max-w-[85%]">
                    {activeScenario.question}
                  </div>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                    <User className="size-4" />
                  </div>
                </div>

                {/* Bot Response */}
                <div className="flex items-start gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="size-4" />
                  </div>
                  <div className="space-y-2 max-w-[90%]">
                    <div className="rounded-2xl rounded-tl-sm bg-muted/60 p-3 text-foreground leading-relaxed">
                      {activeScenario.answer}
                    </div>

                    {/* Citation Box */}
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                      <Shield className="size-3 shrink-0" />
                      <span>Source: {activeScenario.source}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input Placeholder */}
              <div className="border-t border-border/60 bg-muted/20 p-2.5 flex items-center gap-2">
                <input
                  disabled
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground outline-none"
                />
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Send className="size-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA below preview */}
        <div className="mt-8 text-center">
          <Link
            href="/register"
            className={buttonVariants({
              size: "sm",
              className: "gap-2 font-medium",
            })}
          >
            Create Your Free Chatbot
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
