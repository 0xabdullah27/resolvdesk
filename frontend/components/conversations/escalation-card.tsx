"use client";

import * as React from "react";
import { Copy, Check, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/types/conversation";

interface EscalationCardProps {
  visitorEmail?: string | null;
  ticketStatus: TicketStatus;
  isUpdatingStatus: boolean;
  onStatusChange: (newStatus: TicketStatus) => Promise<void>;
  createdAt?: string;
}

export function EscalationCard({
  visitorEmail,
  ticketStatus,
  isUpdatingStatus,
  onStatusChange,
}: EscalationCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!visitorEmail) return;
    try {
      await navigator.clipboard.writeText(visitorEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard", err);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-medium"
          >
            Open Ticket
          </Badge>
        );
      case "in_progress":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-500 border-blue-500/30 font-medium"
          >
            In Progress
          </Badge>
        );
      case "resolved":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-medium"
          >
            Resolved
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Contact info & status header */}
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Escalated Ticket
          </span>
          {getStatusBadge(ticketStatus)}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Customer:</span>
          {visitorEmail ? (
            <div className="flex items-center gap-1.5 font-medium text-foreground truncate">
              <span className="truncate">{visitorEmail}</span>

              {/* Copy button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="size-7 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                title="Copy customer email"
                aria-label="Copy customer email to clipboard"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>

              {/* Mailto launcher button */}
              <a
                href={`mailto:${visitorEmail}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                title="Send email to customer"
                aria-label="Launch mail client"
              >
                <Mail className="size-3.5" />
              </a>
            </div>
          ) : (
            <span className="text-muted-foreground italic">No contact email provided</span>
          )}
        </div>
      </div>

      {/* Interactive Status Transition Dropdown / Selector */}
      <div className="flex items-center gap-2 shrink-0">
        <label htmlFor="ticket-status-select" className="text-xs text-muted-foreground">
          Status:
        </label>
        <div className="relative inline-flex items-center">
          <select
            id="ticket-status-select"
            value={ticketStatus}
            disabled={isUpdatingStatus}
            onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          {isUpdatingStatus && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground ml-2" />
          )}
        </div>
      </div>
    </div>
  );
}
