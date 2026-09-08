import * as React from "react";
import { CheckCircle2, Ban } from "lucide-react";
import { cn } from "cn";

interface UserStatusBadgeProps {
  status: string;
  className?: string;
}

export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const normalized = status.toLowerCase();

  if (normalized === "active") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
          className
        )}
      >
        <CheckCircle2 className="size-3" />
        <span>Active</span>
      </span>
    );
  }

  if (normalized === "suspended") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20",
          className
        )}
      >
        <Ban className="size-3" />
        <span>Suspended</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border",
        className
      )}
    >
      <span className="capitalize">{status}</span>
    </span>
  );
}
