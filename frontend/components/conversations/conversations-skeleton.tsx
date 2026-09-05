import * as React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ConversationsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header text skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* 4 Stats Cards skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Split-pane container skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[640px]">
        {/* Left Sidebar (Master list) skeleton */}
        <div className="md:col-span-5 lg:col-span-4 rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="size-9 rounded-md shrink-0" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail (Transcript pane) skeleton */}
        <div className="md:col-span-7 lg:col-span-8 rounded-xl border border-border bg-card flex flex-col min-h-[640px] p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>

          {/* Transcript Message stream */}
          <div className="flex-1 space-y-4 py-4">
            <div className="flex justify-start">
              <Skeleton className="h-16 w-3/4 max-w-md rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-12 w-2/3 max-w-sm rounded-2xl" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-20 w-4/5 max-w-lg rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
