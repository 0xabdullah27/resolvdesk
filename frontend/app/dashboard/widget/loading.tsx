import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WidgetLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* 2-Column Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Embed Card Skeletons */}
        <div className="lg:col-span-7 space-y-6">
          {/* Appearance Card Skeleton */}
          <div className="rounded-xl border border-border/70 bg-card p-6 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3 w-72 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
            <div className="space-y-3 pt-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="size-8 rounded-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Domains Card Skeleton */}
          <div className="rounded-xl border border-border/70 bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>

        {/* Right Column: Live Preview Sandbox Skeleton */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
            <div className="p-4 border-b border-border/60">
              <Skeleton className="h-5 w-40 rounded-md" />
            </div>
            <Skeleton className="h-[520px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
