import * as React from "react";
import {
  ShieldCheck,
  Zap,
  Users2,
  BarChart3,
  Code2,
  Palette,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  highlights: string[];
  gradient?: string;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
  highlights,
}: FeatureCardProps) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md sm:p-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
            <Icon className="size-6" />
          </div>
          {badge && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3" />
              {badge}
            </span>
          )}
        </div>

        <h3 className="font-heading mt-6 text-xl font-bold tracking-tight text-foreground">
          {title}
        </h3>

        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <ul className="mt-6 space-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        {highlights.map((highlight, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-primary shrink-0" />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFeatures() {
  const features: FeatureCardProps[] = [
    {
      icon: ShieldCheck,
      title: "Zero-Hallucination Grounded AI",
      badge: "Strict RAG",
      description:
        "Answers strictly cite your uploaded documents. If the answer is not in your knowledge base, the assistant never invents facts or makes assumptions.",
      highlights: [
        "PDF, DOCX, Markdown, and plain text support",
        "Semantic vector search with automatic chunking",
        "Source document grounding on every response",
      ],
    },
    {
      icon: Zap,
      title: "Sub-Second Streaming Responses",
      badge: "Real-Time SSE",
      description:
        "Fluid, real-time typing responses streamed via Server-Sent Events (SSE) with minimal latency for a natural conversation feel.",
      highlights: [
        "Sub-500ms time-to-first-token generation",
        "Automatic connection retry on network interruptions",
        "Powered by Gemini 2.5 and OpenAI Agents SDK",
      ],
    },
    {
      icon: Users2,
      title: "Smart Human Handoff & Inbox",
      badge: "Seamless Escalation",
      description:
        "When visitors need specialized attention or AI falls back, ResolvDesk automatically collects their details and delivers the thread to your inbox.",
      highlights: [
        "Captures customer email and inquiry summary",
        "Full conversation history preserved for context",
        "Direct escalation actions right in the widget",
      ],
    },
    {
      icon: BarChart3,
      title: "Deflection & Knowledge Gap Analytics",
      badge: "Live Insights",
      description:
        "Track customer volume trends, automated deflection rates, and uncover unanswered questions so you can continuously refine your store docs.",
      highlights: [
        "Real-time 7, 14, and 30-day deflection charts",
        "Automated knowledge base gap clustering",
        "Top customer inquiry frequency tracking",
      ],
    },
    {
      icon: Code2,
      title: "1-Line Universal Embed Script",
      badge: "Zero Friction",
      description:
        "Add an AI chatbot to any platform with a single snippet tag. Works out of the box with Shopify, WordPress, Webflow, Next.js, and static sites.",
      highlights: [
        "Lightweight vanilla JavaScript (under 25KB)",
        "Zero third-party library bloat or dependencies",
        "CORS origin restrictions for strict domain security",
      ],
    },
    {
      icon: Palette,
      title: "Full Brand & Styling Customization",
      badge: "Custom Persona",
      description:
        "Tailor every aspect of the widget to match your brand identity: custom bot name, brand colors, welcome greetings, and screen placement.",
      highlights: [
        "Custom primary color picker with live preview",
        "Bottom-right or bottom-left placement options",
        "Personalized greeting messages and quick suggestions",
      ],
    },
  ];

  return (
    <section id="features" className="relative py-20 sm:py-28 bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Built for Modern Web Businesses
          </div>

          <h2 className="font-heading mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Everything You Need to Automate Customer Support
          </h2>

          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Eliminate repetitive support tickets, keep visitors engaged 24/7, and
            provide accurate, grounded answers directly from your business knowledge.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
