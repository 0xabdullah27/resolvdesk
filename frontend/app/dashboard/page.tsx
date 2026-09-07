import * as React from "react";
import type { Metadata } from "next";

import { getOwnerContextAction } from "@/actions/auth-actions";
import { DashboardOverviewView } from "@/components/dashboard/dashboard-overview-view";

export const metadata: Metadata = {
  title: "Dashboard - ResolvDesk",
  description: "Manage your AI support workspace, deflection metrics, and knowledge base.",
};

export default async function DashboardPage() {
  const owner = await getOwnerContextAction();

  return <DashboardOverviewView owner={owner} />;
}
