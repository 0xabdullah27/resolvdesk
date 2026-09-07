import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Sliders,
  Sparkles,
  CheckCircle2,
  Inbox,
  ArrowRight,
} from "lucide-react";

import { getOwnerContextAction } from "@/actions/auth-actions";
import { listDocumentsAction } from "@/actions/document-actions";
import {
  getAnalyticsOverviewAction,
  getAnalyticsTrendsAction,
  getKnowledgeGapsAction,
  getTopQuestionsAction,
} from "@/actions/analytics-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AnalyticsKpiCards } from "@/components/dashboard/analytics-kpi-cards";
import { VolumeTrendsChart } from "@/components/dashboard/volume-trends-chart";
import { KnowledgeGapsCard } from "@/components/dashboard/knowledge-gaps-card";
import { TopQuestionsCard } from "@/components/dashboard/top-questions-card";

export const metadata: Metadata = {
  title: "Dashboard - ResolvDesk",
  description: "Manage your AI support workspace, deflection metrics, and knowledge base.",
};

export default async function DashboardPage() {
  const [
    owner,
    docsResult,
    overviewRes,
    trendsRes,
    gapsRes,
    topQuestionsRes,
  ] = await Promise.all([
    getOwnerContextAction(),
    listDocumentsAction(),
    getAnalyticsOverviewAction(),
    getAnalyticsTrendsAction(7),
    getKnowledgeGapsAction(5),
    getTopQuestionsAction(5),
  ]);

  const docCount = docsResult.success && docsResult.data ? docsResult.data.total : 0;

  const overview = overviewRes.success && overviewRes.data
    ? overviewRes.data
    : {
        total_conversations: 0,
        total_conversations_30d: 0,
        total_messages: 0,
        escalated_conversations: 0,
        deflection_rate: 100.0,
        open_tickets_count: 0,
        resolved_tickets_count: 0,
      };

  const trends = trendsRes.success && trendsRes.data
    ? trendsRes.data
    : {
        range_days: 7,
        points: [],
      };

  const gaps = gapsRes.success && gapsRes.data ? gapsRes.data.items : [];
  const topQuestions = topQuestionsRes.success && topQuestionsRes.data ? topQuestionsRes.data.items : [];

  return (
    <div className="space-y-8">
      {/* 1. Welcome & Workspace Header */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
              <Sparkles className="size-3.5" />
              Workspace Active
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-card-foreground">
              Welcome, {owner?.name || owner?.fullName || "Business Owner"}!
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Autonomous AI support for{" "}
              <span className="font-semibold text-foreground">
                {owner?.organizationName}
              </span>
              . Real-time metrics, deflection rates, and knowledge base insights.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/dashboard/conversations"
              className={buttonVariants({ variant: "outline" })}
            >
              <Inbox className="size-4" />
              Support Inbox
            </Link>
            <Link
              href="/dashboard/documents"
              className={buttonVariants({ variant: "default" })}
            >
              <FileText className="size-4" />
              {docCount > 0 ? "Manage Knowledge" : "Upload Knowledge"}
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Executive Overview KPI Cards */}
      <AnalyticsKpiCards overview={overview} />

      {/* 3. Interactive Volume Trends Chart */}
      <VolumeTrendsChart initialData={trends} />

      {/* 4. Actionable Insights Grid: Knowledge Gaps & Top Questions */}
      <div className="grid gap-6 md:grid-cols-2">
        <KnowledgeGapsCard items={gaps} />
        <TopQuestionsCard items={topQuestions} />
      </div>

      {/* 5. Onboarding Checklist (Contextual & Actionable) */}
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-base font-semibold text-foreground">
                Quick Setup & Onboarding
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Ensure your store or website is fully configured to maximize AI deflection.
              </CardDescription>
            </div>
            {docCount > 0 && overview.total_conversations > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Fully Operational
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3.5">
              <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">1. Account Provisioned</p>
                <p className="text-xs text-muted-foreground">
                  Tenant workspace and isolated vector space created.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3.5">
              {docCount > 0 ? (
                <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
              ) : (
                <div className="size-5 rounded-full border-2 border-muted-foreground/40 shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  2
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">2. Knowledge Base</p>
                <p className="text-xs text-muted-foreground">
                  {docCount > 0
                    ? `${docCount} document${docCount === 1 ? "" : "s"} indexed and active.`
                    : "Upload store FAQs or policies."}
                </p>
                {docCount === 0 && (
                  <Link
                    href="/dashboard/documents"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline pt-1"
                  >
                    Upload now <ArrowRight className="size-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3.5">
              <div className="size-5 rounded-full border-2 border-primary/50 text-primary shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold">
                3
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">3. Embed Widget</p>
                <p className="text-xs text-muted-foreground">
                  Customize and paste the snippet onto your website.
                </p>
                <Link
                  href="/dashboard/widget"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline pt-1"
                >
                  Configure widget <Sliders className="size-3 ml-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
