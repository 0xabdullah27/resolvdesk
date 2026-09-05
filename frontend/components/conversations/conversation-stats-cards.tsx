"use client";

import * as React from "react";
import { MessageSquare, AlertTriangle, Clock, MessagesSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversationStats } from "@/types/conversation";

interface ConversationStatsCardsProps {
  stats: ConversationStats;
  isLoading?: boolean;
}

export function ConversationStatsCards({
  stats,
  isLoading = false,
}: ConversationStatsCardsProps) {
  const cards = [
    {
      title: "Total Conversations",
      value: stats.total_conversations,
      description: "All customer chat sessions",
      icon: MessageSquare,
      color: "text-primary",
    },
    {
      title: "Total Messages",
      value: stats.total_messages,
      description: "Visitor & assistant turns",
      icon: MessagesSquare,
      color: "text-blue-500",
    },
    {
      title: "Escalated Tickets",
      value: stats.escalated_conversations,
      description: "Human escalation requests",
      icon: AlertTriangle,
      color: "text-amber-500",
    },
    {
      title: "Active (24h)",
      value: stats.active_last_24h,
      description: "Conversations in last day",
      icon: Clock,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="bg-card border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <div className={`p-1.5 rounded-md bg-muted/60 ${item.color}`}>
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? "—" : item.value.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {item.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
