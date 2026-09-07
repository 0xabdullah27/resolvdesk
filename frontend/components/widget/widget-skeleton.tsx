import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function WidgetCustomizerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Embed Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Appearance Form Card */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="space-y-2 pb-2 border-b border-border/60">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3.5 w-72" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <Skeleton className="h-10 flex-1 rounded-md" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </div>
            </div>
          </div>

          {/* Embed Card Skeleton */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-60" />
            </div>
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>

        {/* Right Column: Live Interactive Preview Sandbox */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="size-6 rounded-full" />
            </div>

            <div className="h-[420px] rounded-xl border border-border/50 bg-background/50 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-3 border-b border-border/40">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>

              <div className="space-y-3 py-4 flex-1">
                <Skeleton className="h-14 w-3/4 rounded-2xl" />
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-2/3 rounded-2xl" />
                </div>
                <Skeleton className="h-16 w-4/5 rounded-2xl" />
              </div>

              <div className="pt-2 border-t border-border/40">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
