"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Admin dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-xs">
        <AlertTriangle className="size-7" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold font-heading text-foreground">
          Platform Admin Error
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred while loading platform metrics."}
        </p>
      </div>

      <Button
        onClick={() => reset()}
        className="cursor-pointer gap-2 mt-2"
      >
        <RefreshCw className="size-4" />
        <span>Try Again</span>
      </Button>
    </div>
  );
}
