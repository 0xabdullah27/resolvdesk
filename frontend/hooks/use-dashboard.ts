"use client";

import * as React from "react";
import { DashboardContext } from "@/providers/dashboard-provider";
import type { DashboardContextValue } from "@/types/dashboard-cache";

export function useDashboard(): DashboardContextValue {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a <DashboardProvider>");
  }
  return context;
}
