import * as React from "react";
import type { Metadata } from "next";
import { MessageSquare, Inbox } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Conversations - ResolvDesk",
  description: "View visitor chats and manage escalated tickets.",
};

export default function ConversationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Conversations Inbox
        </h2>
        <p className="text-sm text-muted-foreground">
          Real-time visitor chat monitoring and human escalation management.
        </p>
      </div>

      <Card className="border-dashed border-2 border-border/80 bg-card/40">
        <CardHeader className="text-center py-12">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Inbox className="size-6" />
          </div>
          <CardTitle className="text-lg font-semibold">
            No Active Conversations
          </CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Once you embed the widget on your website, visitor chat logs and live SSE conversations will stream here in real time.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
