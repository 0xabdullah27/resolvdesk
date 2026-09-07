import * as React from "react";
import type { Metadata } from "next";
import { ConversationsInbox } from "@/components/conversations/conversations-inbox";

export const metadata: Metadata = {
  title: "Conversations Inbox - ResolvDesk",
  description: "Real-time visitor chat monitoring and human escalation management.",
};

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ConversationsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const initialSelectedId = resolvedParams.id || null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Conversations Inbox
        </h2>
        <p className="text-sm text-muted-foreground">
          Real-time visitor chat monitoring, transcript inspection, and human ticket resolution.
        </p>
      </div>

      <ConversationsInbox initialSelectedId={initialSelectedId} />
    </div>
  );
}
