"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ConversationSummary, InboxFilterTab } from "@/types/conversation";

function stripMarkdown(text?: string | null): string {
  if (!text) return "No message content recorded";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_~`#>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  activeFilter: InboxFilterTab;
  onFilterChange: (filter: InboxFilterTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelectConversation,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  isLoading,
  onRefresh,
  isRefreshing = false,
}: ConversationListProps) {
  // Client-side search filtering across preview text, visitor email, or ID
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const matchPreview = c.last_message_preview?.toLowerCase().includes(query);
      const matchEmail = c.visitor_email?.toLowerCase().includes(query);
      const matchId = c.id.toLowerCase().includes(query);
      return matchPreview || matchEmail || matchId;
    });
  }, [conversations, searchQuery]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col h-full min-h-[640px] max-h-[85vh] border border-border rounded-xl bg-card overflow-hidden">
      {/* Top Search and Refresh Toolbar */}
      <div className="p-3.5 border-b border-border space-y-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-9 text-xs bg-background border-border"
              aria-label="Search conversation logs"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            className="size-9 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            title="Refresh conversations list"
            aria-label="Refresh conversations list"
          >
            <RotateCcw className={`size-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>

        {/* Filter Tabs ("All" vs "Escalated") */}
        <div className="grid grid-cols-2 p-1 rounded-lg bg-muted/50 border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={`py-1.5 px-3 rounded-md font-medium text-center transition-colors cursor-pointer ${
              activeFilter === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Chats
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("escalated")}
            className={`py-1.5 px-3 rounded-md font-medium text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeFilter === "escalated"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="size-3.5 text-amber-500" />
            <span>Escalated</span>
          </button>
        </div>
      </div>

      {/* Scrollable Conversation Items List */}
      <div
        className="flex-1 overflow-y-auto p-2.5 space-y-1.5"
        tabIndex={0}
        aria-label="Conversation list"
      >
        {filteredConversations.length === 0 ? (
          <div className="py-16 text-center px-4 space-y-2">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Inbox className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {searchQuery.trim()
                ? "No matching conversations"
                : activeFilter === "escalated"
                ? "No escalated tickets"
                : "No conversations recorded"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {searchQuery.trim()
                ? "Try clearing your search query."
                : "Visitor chats and live support inquiries will appear here."}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedId === conv.id;
            const timeAgo = conv.updated_at
              ? formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })
              : "";

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer relative space-y-1.5 ${
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground shadow-xs ring-1 ring-primary/20"
                    : "border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                {/* Header row: ID, relative time, and new badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      #{conv.id.slice(0, 8)}
                    </span>
                    {conv.is_new && (
                      <Badge
                        variant="default"
                        className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground animate-pulse"
                      >
                        New
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo}</span>
                </div>

                {/* Message preview snippet */}
                <p className="text-xs line-clamp-2 text-foreground/85 leading-snug break-words">
                  {stripMarkdown(conv.last_message_preview)}
                </p>

                {/* Footer metadata: message count & escalation indicator */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground text-[10px]">
                      <MessageSquare className="size-2.5" />
                      {conv.message_count}
                    </span>

                    {conv.is_escalated && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-500 border-amber-500/30"
                      >
                        {conv.ticket_status ? conv.ticket_status.replace("_", " ") : "escalated"}
                      </Badge>
                    )}
                  </div>

                  {conv.visitor_email && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                      {conv.visitor_email}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalCount > pageSize && (
        <div className="px-3 py-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20 shrink-0">
          <span>
            {startIndex}–{endIndex} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange(currentPage - 1)}
              className="size-7 cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-1 font-mono">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange(currentPage + 1)}
              className="size-7 cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
