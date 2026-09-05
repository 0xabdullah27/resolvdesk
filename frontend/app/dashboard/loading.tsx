import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Banner Skeleton */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md mt-2" />
          </div>
        ))}
      </div>

      {/* Checklist Skeleton */}
      <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="h-3 w-64 rounded-md" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
