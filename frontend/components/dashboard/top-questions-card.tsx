import * as React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { MessageCircleQuestion, HelpCircle } from "lucide-react";

import type { TopQuestionItem } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface TopQuestionsCardProps {
  items: TopQuestionItem[];
}

export function TopQuestionsCard({ items }: TopQuestionsCardProps) {
  return (
    <Card className="border-border/70 bg-card flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <MessageCircleQuestion className="size-4" />
            </div>
            <CardTitle className="font-heading text-base font-semibold text-foreground">
              Top Customer Inquiries
            </CardTitle>
          </div>
          {items.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Most Popular
            </span>
          )}
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          The most frequent topics and questions asked by your website visitors.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-0">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-muted p-3 text-muted-foreground mb-2">
              <HelpCircle className="size-6 stroke-1" />
            </div>
            <p className="text-sm font-semibold text-foreground">No Inquiries Yet</p>
            <p className="text-xs text-muted-foreground max-w-[240px] mt-1">
              Top questions will dynamically rank here once customers interact with your widget.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item, idx) => {
              let relativeTime = "";
              try {
                relativeTime = formatDistanceToNow(parseISO(item.last_asked_at), {
                  addSuffix: true,
                });
              } catch {
                relativeTime = "recently";
              }

              return (
                <div
                  key={`${item.question}-${idx}`}
                  className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {item.question}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Last asked {relativeTime}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {item.frequency} {item.frequency === 1 ? "time" : "times"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
