"use client";

import * as React from "react";
import { FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { UploadQueueItem } from "@/types/document";
import { cn } from "@/lib/utils";

interface UploadQueueProps {
  queue: UploadQueueItem[];
  onDismiss: () => void;
}

export function UploadQueue({ queue, onDismiss }: UploadQueueProps) {
  if (queue.length === 0) return null;

  const isAllComplete = queue.every(
    (item) => item.status === "success" || item.status === "error"
  );
  const successCount = queue.filter((item) => item.status === "success").length;
  const errorCount = queue.filter((item) => item.status === "error").length;

  return (
    <div className="mt-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Batch Upload Queue ({queue.length} file{queue.length > 1 ? "s" : ""})
          </span>
          {isAllComplete && (
            <span className="text-xs text-muted-foreground">
              ({successCount} completed{errorCount > 0 ? `, ${errorCount} failed` : ""})
            </span>
          )}
        </div>
        {isAllComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="size-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
        {queue.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-2.5 text-xs transition-colors",
              item.status === "uploading" && "border-primary/40 bg-primary/5",
              item.status === "success" && "border-border/60 bg-muted/20",
              item.status === "error" && "border-destructive/30 bg-destructive/5"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="font-medium truncate text-foreground">{item.title}</span>
                <span className="text-muted-foreground">
                  ({(item.size / 1024).toFixed(0)} KB)
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.status === "queued" && (
                  <span className="text-muted-foreground">Queued</span>
                )}
                {item.status === "uploading" && (
                  <span className="flex items-center gap-1 text-primary">
                    <Loader2 className="size-3 animate-spin" />
                    Uploading...
                  </span>
                )}
                {item.status === "success" && (
                  <span className="flex items-center gap-1 text-primary">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    Indexed
                  </span>
                )}
                {item.status === "error" && (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <AlertCircle className="size-3.5" />
                    Failed
                  </span>
                )}
              </div>
            </div>

            {item.status === "uploading" && (
              <Progress value={item.progress} className="h-1 bg-muted mt-1" />
            )}

            {item.status === "error" && item.error && (
              <p className="text-destructive text-[11px] mt-0.5">{item.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
