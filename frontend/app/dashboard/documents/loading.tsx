import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Upload Card Skeleton */}
      <div className="rounded-xl border border-border/70 bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-3 w-80 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2 sm:max-w-md">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-64 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
