import * as React from "react";
import {
  MessageSquare,
  MessagesSquare,
  ShieldCheck,
  LifeBuoy,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { AnalyticsOverview } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsKpiCardsProps {
  overview: AnalyticsOverview;
}

export function AnalyticsKpiCards({ overview }: AnalyticsKpiCardsProps) {
  const automatedCount = Math.max(
    0,
    overview.total_conversations - overview.escalated_conversations
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Conversations */}
      <Card className="border-border/70 bg-card hover:border-primary/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Conversations
          </CardTitle>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <MessageSquare className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {overview.total_conversations.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <TrendingUp className="size-3.5 text-primary" />
            <span>
              <strong className="text-foreground font-semibold">
                {overview.total_conversations_30d}
              </strong>{" "}
              in last 30 days
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Messages */}
      <Card className="border-border/70 bg-card hover:border-primary/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Messages
          </CardTitle>
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
            <MessagesSquare className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {overview.total_messages.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across visitor & automated responses
          </p>
        </CardContent>
      </Card>

      {/* 3. AI Deflection Rate */}
      <Card className="border-border/70 bg-card hover:border-emerald-500/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            AI Deflection Rate
          </CardTitle>
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
            <ShieldCheck className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {overview.deflection_rate.toFixed(1)}%
            </div>
            {overview.total_conversations > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {overview.deflection_rate >= 80
                  ? "Excellent"
                  : overview.deflection_rate >= 50
                  ? "Healthy"
                  : "Needs Attention"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <strong className="text-foreground font-semibold">
              {automatedCount}
            </strong>{" "}
            chats resolved without human intervention
          </p>
        </CardContent>
      </Card>

      {/* 4. Active Support Tickets */}
      <Card className="border-border/70 bg-card hover:border-amber-500/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Tickets
          </CardTitle>
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
            <LifeBuoy className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {overview.open_tickets_count}
            </div>
            {overview.open_tickets_count === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> All clear
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="size-3" /> Action needed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {overview.resolved_tickets_count} ticket
            {overview.resolved_tickets_count === 1 ? "" : "s"} resolved to date
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
