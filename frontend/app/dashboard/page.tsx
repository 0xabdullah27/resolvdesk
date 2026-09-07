import * as React from "react";
import type { Metadata } from "next";

import { DashboardOverviewView } from "@/components/dashboard/dashboard-overview-view";

export const metadata: Metadata = {
  title: "Dashboard - ResolvDesk",
  description: "Manage your AI support workspace, deflection metrics, and knowledge base.",
};

export default function DashboardPage() {
  return <DashboardOverviewView />;
}
