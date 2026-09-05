"use client";

import * as React from "react";
import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DocumentStatus } from "@/types/document";
import { cn } from "@/lib/utils";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  errorMessage?: string | null;
}

export function DocumentStatusBadge({
  status,
  errorMessage,
}: DocumentStatusBadgeProps) {
  if (status === "ready") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-primary/30 bg-primary/10 text-primary font-medium px-2 py-0.5"
      >
        <CheckCircle2 className="size-3" />
        Ready
      </Badge>
    );
  }

  if (status === "processing" || status === "uploading") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-border bg-muted/60 text-foreground font-medium px-2 py-0.5"
      >
        <Loader2 className="size-3 animate-spin text-primary" />
        {status === "uploading" ? "Uploading..." : "Processing..."}
      </Badge>
    );
  }

  if (status === "failed") {
    const content = (
      <Badge
        variant="outline"
        className="gap-1.5 border-destructive/30 bg-destructive/10 text-destructive font-medium px-2 py-0.5 cursor-help"
      >
        <AlertCircle className="size-3" />
        Failed
      </Badge>
    );

    if (errorMessage) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={content} />
            <TooltipContent className="max-w-xs text-xs font-normal">
              <p className="font-semibold text-destructive mb-0.5">Ingestion Error:</p>
              <p>{errorMessage}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Clock className="size-3" />
      {status}
    </Badge>
  );
}
