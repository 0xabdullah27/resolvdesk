"use client";

import * as React from "react";
import { Search, Filter, HardDrive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { DocumentStatus } from "@/types/document";

interface DocumentToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: "all" | DocumentStatus;
  onStatusFilterChange: (status: "all" | DocumentStatus) => void;
  currentCount: number;
  maxLimit: number;
}

export function DocumentToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  currentCount,
  maxLimit,
}: DocumentToolbarProps) {
  const percentage = Math.min(100, Math.round((currentCount / maxLimit) * 100));

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search & Filter Controls */}
      <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search documents by title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 text-sm h-9 bg-card/80"
          />
        </div>

        <div className="flex items-center gap-2">
          <NativeSelect
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as "all" | DocumentStatus)
            }
            className="w-full sm:w-36 h-9"
          >
            <NativeSelectOption value="all">All Statuses</NativeSelectOption>
            <NativeSelectOption value="ready">Ready</NativeSelectOption>
            <NativeSelectOption value="processing">Processing</NativeSelectOption>
            <NativeSelectOption value="failed">Failed</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>

      {/* Storage Capacity Gauge */}
      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3.5 py-2 shadow-xs sm:w-64">
        <HardDrive className="size-4 shrink-0 text-primary" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Capacity</span>
            <span className="font-mono text-muted-foreground">
              {currentCount} / {maxLimit} docs
            </span>
          </div>
          <Progress value={percentage} className="h-1.5 bg-muted" />
        </div>
      </div>
    </div>
  );
}
