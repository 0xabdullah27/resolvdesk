"use client";

import * as React from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: "Is ResolvDesk really 100% free to use?",
      answer:
        "Yes! ResolvDesk is free to use. You can create an organization workspace, upload your knowledge documents, customize your floating widget, and embed it into any production website without paying a penny or entering a credit card.",
    },
    {
      question: "How does ResolvDesk prevent AI hallucinations?",
      answer:
        "ResolvDesk employs strict Retrieval-Augmented Generation (RAG). Every user question searches your vectorized documents for semantically relevant passages. The AI answer engine is instructed to answer strictly using the provided context. If the answer is not present in your files, it admits it doesn't know and offers to escalate to human support.",
    },
    {
      question: "What happens when the AI doesn't know an answer?",
      answer:
        "When an inquiry cannot be answered by your knowledge base, or when a customer explicitly requests a human, the widget presents a clean 'Talk to a Human' escalation prompt. It collects the visitor's email and summary, and sends the full chat transcript directly to your merchant conversations inbox.",
    },
    {
      question: "What document formats can I upload to the knowledge base?",
      answer:
        "You can upload PDF (.pdf), Microsoft Word (.docx), Markdown (.md), and plain text (.txt) files up to 10MB each. ResolvDesk automatically extracts, cleans, chunks, and creates dense vector embeddings for fast semantic retrieval.",
    },
    {
      question: "Can I customize the widget colors, branding, and placement?",
      answer:
        "Yes! Through your ResolvDesk dashboard, you can pick any primary brand color (with real-time contrast checking), specify your bot's name and avatar title, write a customized welcome greeting, and position the floating widget on the bottom-right or bottom-left corner of the screen.",
    },
    {
      question: "Can I restrict the widget to only run on my website domains?",
      answer:
        "Yes. In your widget settings, you can configure Allowed Origins (e.g. https://yourstore.com). Requests originating from unapproved domains are rejected with CORS protection, preventing unauthorized usage of your widget key.",
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-background border-t border-border/60">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3.5 py-1 text-xs font-semibold text-muted-foreground">
            <HelpCircle className="size-3.5 text-primary" />
            Common Questions
          </div>
          <h2 className="font-heading mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Everything you need to know about ResolvDesk, privacy, and website integration.
          </p>
        </div>

        {/* Accordion List */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-border/80 bg-card transition-all duration-200 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-5 sm:p-6 text-left font-heading text-base sm:text-lg font-semibold text-foreground transition-colors hover:text-primary cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-border/60 px-5 pb-5 sm:px-6 sm:pb-6 pt-3 text-sm text-muted-foreground leading-relaxed animate-in fade-in-50 duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
