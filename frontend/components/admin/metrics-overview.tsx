"use client";

import * as React from "react";
import {
  Users,
  Building2,
  FileText,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { PlatformMetrics } from "@/types/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricsOverviewProps {
  metrics: PlatformMetrics;
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const cards = [
    {
      title: "Total Registered Users",
      value: metrics.total_users.toLocaleString(),
      description: (
        <span className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="size-3.5" />
            {metrics.active_users} active
          </span>
          {metrics.suspended_users > 0 && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="inline-flex items-center gap-1 text-destructive font-medium">
                <ShieldAlert className="size-3.5" />
                {metrics.suspended_users} suspended
              </span>
            </>
          )}
        </span>
      ),
      icon: Users,
      badgeText: "Accounts",
    },
    {
      title: "Tenant Organizations",
      value: metrics.total_organizations.toLocaleString(),
      description: "Active business merchant workspaces",
      icon: Building2,
      badgeText: "Tenants",
    },
    {
      title: "Ingested Documents",
      value: metrics.total_documents.toLocaleString(),
      description: "Knowledge base source documents",
      icon: FileText,
      badgeText: "Knowledge",
    },
    {
      title: "Customer Conversations",
      value: metrics.total_conversations.toLocaleString(),
      description: "Total visitor AI support sessions",
      icon: MessageSquare,
      badgeText: "Engagement",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className="relative overflow-hidden border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-200"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="text-2xl font-bold font-heading text-foreground tracking-tight">
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground">
                {card.description}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
