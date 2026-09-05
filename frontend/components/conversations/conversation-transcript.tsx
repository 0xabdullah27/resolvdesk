"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Bot,
  User,
  ShieldAlert,
  FileText,
  RotateCcw,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationDetail, TicketStatus } from "@/types/conversation";
import { EscalationCard } from "@/components/conversations/escalation-card";

interface ConversationTranscriptProps {
  conversationId: string | null;
  transcript: ConversationDetail | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onStatusChange: (status: TicketStatus) => Promise<void>;
  onBackToList?: () => void;
}

export function ConversationTranscript({
  conversationId,
  transcript,
  isLoading,
  isError,
  onRetry,
  onStatusChange,
  onBackToList,
}: ConversationTranscriptProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Auto-scroll to bottom whenever transcript finishes loading or changes
  React.useEffect(() => {
    if (scrollRef.current && !isLoading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript?.id, transcript?.messages?.length, isLoading]);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      setIsUpdatingStatus(true);
      await onStatusChange(newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 1. No conversation selected empty state
  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-8 border border-border rounded-xl bg-card">
        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Bot className="size-6" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          No Conversation Selected
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Select a chat session from the list on the left to read its full message transcript and inspect citations.
        </p>
      </div>
    );
  }

  // 2. Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-[500px] border border-border rounded-xl bg-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="flex-1 space-y-4 py-4">
          <div className="flex justify-start">
            <Skeleton className="h-16 w-3/4 max-w-md rounded-2xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-2/3 max-w-sm rounded-2xl" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-20 w-4/5 max-w-lg rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // 3. Error state
  if (isError || !transcript) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-8 border border-destructive/30 rounded-xl bg-card space-y-3">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <ShieldAlert className="size-6" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Failed to Load Transcript
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          An error occurred while loading this conversation. It may have been deleted or belong to another organization.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} className="cursor-pointer">
          <RotateCcw className="mr-2 size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  const formattedDate = transcript.created_at
    ? formatDistanceToNow(new Date(transcript.created_at), { addSuffix: true })
    : "";

  return (
    <div className="flex flex-col h-full min-h-[640px] max-h-[85vh] border border-border rounded-xl bg-card overflow-hidden">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between gap-3 bg-card/60 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToList && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToList}
              className="md:hidden size-8 -ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Back to conversations list"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-base text-foreground truncate">
                Session #{transcript.id.slice(0, 8)}
              </span>
              {transcript.is_escalated ? (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs px-2 py-0.5"
                >
                  Escalated
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground text-xs px-2 py-0.5"
                >
                  Automated
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="size-3" />
              Started {formattedDate}
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">
          {transcript.messages.length} turns
        </div>
      </div>

      {/* Escalation Banner (if escalated) */}
      {transcript.is_escalated && (
        <div className="px-5 pt-4 pb-1 shrink-0">
          <EscalationCard
            visitorEmail={transcript.visitor_email}
            ticketStatus={transcript.ticket_status || "open"}
            isUpdatingStatus={isUpdatingStatus}
            onStatusChange={handleStatusChange}
            createdAt={transcript.updated_at}
          />
        </div>
      )}

      {/* Transcript Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4"
        tabIndex={0}
        aria-label="Conversation message stream"
      >
        {transcript.messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No messages recorded in this conversation yet.
          </div>
        ) : (
          transcript.messages.map((msg) => {
            const isVisitor = msg.role === "visitor";
            const isSystem = msg.role === "system";
            const isAssistant = msg.role === "assistant";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/30 text-xs text-muted-foreground max-w-lg text-center">
                    <ShieldAlert className="size-3.5 text-amber-500 shrink-0" />
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isVisitor ? "justify-end" : "justify-start"}`}
              >
                {!isVisitor && (
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                    <Bot className="size-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm space-y-2 ${
                    isVisitor
                      ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                      : "bg-muted/40 text-foreground border border-border/80 rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed break-words">
                    {msg.content}
                  </p>

                  {/* Citations list for assistant messages */}
                  {isAssistant && msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-border/40 mt-2 space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Sparkles className="size-3 text-primary" />
                        <span>Retrieved Sources:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-[11px] text-muted-foreground font-normal"
                          >
                            <FileText className="size-3 text-primary shrink-0" />
                            <span className="truncate max-w-[200px]">{cite.title}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[10px] ${
                      isVisitor ? "text-primary-foreground/75 text-right" : "text-muted-foreground"
                    }`}
                  >
                    {msg.created_at
                      ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })
                      : ""}
                  </div>
                </div>

                {isVisitor && (
                  <div className="size-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
