import * as React from "react";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import {
  getPlatformMetricsAction,
  listPlatformUsersAction,
} from "@/actions/admin-actions";
import { MetricsOverview } from "@/components/admin/metrics-overview";
import { UserDirectoryTable } from "@/components/admin/user-directory-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform Admin Console - ResolvDesk",
  description: "Platform growth metrics, user management, and workspace health monitoring.",
};

export default async function AdminDashboardPage() {
  const [metricsRes, usersRes] = await Promise.all([
    getPlatformMetricsAction(),
    listPlatformUsersAction({ page: 1, pageSize: 20 }),
  ]);

  if (!metricsRes.success || !metricsRes.data) {
    throw new Error(metricsRes.error || "Failed to load platform KPI metrics.");
  }

  const initialUsers = usersRes.success && usersRes.data ? usersRes.data : {
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Banner / Hero Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight">
              Platform Overview
            </h1>
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time system growth, tenant metrics, and account access governance.
          </p>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards (US1) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Platform-Wide Metrics
        </h2>
        <MetricsOverview metrics={metricsRes.data} />
      </section>

      {/* User Directory & Resource Management (US2, US3, US4) */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold font-heading text-foreground">
              User & Organization Directory
            </h2>
            <p className="text-xs text-muted-foreground">
              Search, filter, inspect workspace counters, and manage account access status.
            </p>
          </div>
        </div>

        <UserDirectoryTable initialData={initialUsers} />
      </section>
    </div>
  );
}
