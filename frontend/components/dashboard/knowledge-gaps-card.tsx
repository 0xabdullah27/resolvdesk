import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { HelpCircle, Plus, CheckCircle2, ArrowRight } from "lucide-react";

import type { KnowledgeGapItem } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

interface KnowledgeGapsCardProps {
  items: KnowledgeGapItem[];
}

export function KnowledgeGapsCard({ items }: KnowledgeGapsCardProps) {
  return (
    <Card className="border-border/70 bg-card flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
              <HelpCircle className="size-4" />
            </div>
            <CardTitle className="font-heading text-base font-semibold text-foreground">
              Knowledge Base Gaps
            </CardTitle>
          </div>
          {items.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              {items.length} unaddressed
            </span>
          )}
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Visitor questions that triggered the AI fallback due to missing documentation.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-0">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500 mb-2">
              <CheckCircle2 className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Zero Knowledge Gaps</p>
            <p className="text-xs text-muted-foreground max-w-[240px] mt-1">
              Your AI assistant is answering all customer inquiries from your uploaded documents.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((gap, idx) => {
              let relativeTime = "";
              try {
                relativeTime = formatDistanceToNow(parseISO(gap.last_asked_at), {
                  addSuffix: true,
                });
              } catch {
                relativeTime = "recently";
              }

              return (
                <div
                  key={`${gap.question}-${idx}`}
                  className="py-3 first:pt-1 last:pb-1 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      &ldquo;{gap.question}&rdquo;
                    </p>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {gap.frequency}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Asked {relativeTime}</span>
                    <Link
                      href="/dashboard/documents"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      <Plus className="size-3" />
                      Add Knowledge
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="pt-3 border-t border-border/60 mt-3">
            <Link
              href="/dashboard/documents"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "w-full justify-center text-xs",
              })}
            >
              Upload Missing Policies or FAQs
              <ArrowRight className="ml-1.5 size-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
