import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Sliders,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

import { getOwnerContextAction } from "@/actions/auth-actions";
import { listDocumentsAction } from "@/actions/document-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard - ResolvDesk",
  description: "Manage your AI support workspace and configuration.",
};

export default async function DashboardPage() {
  const [owner, docsResult] = await Promise.all([
    getOwnerContextAction(),
    listDocumentsAction(),
  ]);

  const docCount = docsResult.success && docsResult.data ? docsResult.data.total : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
              <Sparkles className="size-3.5" />
              Workspace Ready
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-card-foreground">
              Welcome, {owner?.name || owner?.fullName || "Business Owner"}!
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Your autonomous AI assistant for{" "}
              <span className="font-semibold text-foreground">
                {owner?.organizationName}
              </span>{" "}
              is ready to be trained and deployed.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/documents"
              className={buttonVariants()}
            >
              <FileText className="mr-2 size-4" />
              {docCount > 0 ? "Manage Knowledge" : "Upload Knowledge"}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Metrics & Modules */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Knowledge Base
            </CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {docCount} {docCount === 1 ? "Document" : "Documents"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {docCount > 0
                ? `${docCount} knowledge resource${docCount === 1 ? "" : "s"} indexed for grounding.`
                : "Add FAQs, catalogs, or policies for grounding."}
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/documents"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "w-full",
                })}
              >
                Manage Documents
                <ArrowUpRight className="ml-1 size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversations Inbox
            </CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">0 Active Chats</div>
            <p className="text-xs text-muted-foreground mt-1">
              Live visitor interactions and human handoffs.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/conversations"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "w-full",
                })}
              >
                View Inbox
                <ArrowUpRight className="ml-1 size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Embeddable Widget
            </CardTitle>
            <Sliders className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">Configured</div>
            <p className="text-xs text-muted-foreground mt-1">
              Embed snippet ready for your storefront.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/widget"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "w-full",
                })}
              >
                Customize Widget
                <ArrowUpRight className="ml-1 size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Checklist */}
      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">
            Onboarding Checklist
          </CardTitle>
          <CardDescription>
            Complete these 3 steps to launch your automated support agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3.5">
              <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Step 1: Workspace Provisioned
                </p>
                <p className="text-xs text-muted-foreground">
                  Your tenant account and unique organization identifier were created.
                </p>
              </div>
            </div>

            {docCount > 0 ? (
              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3.5">
                <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Step 2: Upload Knowledge Base Files
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {docCount} {docCount === 1 ? "document" : "documents"} uploaded and ready for grounding.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3.5">
                <div className="size-5 rounded-full border-2 border-muted-foreground/40 shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Step 2: Upload Knowledge Base Files
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upload text files, FAQs, or markdown guides so the agent can answer queries.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3.5">
              <div className="size-5 rounded-full border-2 border-muted-foreground/40 shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold">
                3
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Step 3: Copy Your Embed Code
                </p>
                <p className="text-xs text-muted-foreground">
                  Grab your widget script snippet and paste it into your website or Shopify store.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
