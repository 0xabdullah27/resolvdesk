"use server";

import { backendFetch, BackendApiError } from "@/lib/backend-api";
import type {
  AnalyticsOverview,
  AnalyticsTrends,
  KnowledgeGapsResponse,
  TopQuestionsResponse,
  TrendRange,
} from "@/types/analytics";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function parseErrorMessage(err: unknown, fallbackMessage: string): string {
  if (err instanceof BackendApiError) {
    if (typeof err.data === "object" && err.data !== null && "detail" in err.data) {
      const detail = (err.data as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
        return detail[0].msg;
      }
    }
    switch (err.status) {
      case 401:
        return "Your session has expired. Please log in again.";
      case 403:
        return "You do not have permission to view analytics.";
      case 422:
        return "Validation failed on the requested analytics query.";
      default:
        return err.message || fallbackMessage;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallbackMessage;
}

/**
 * Fetches executive overview KPIs and deflection rates for the authenticated organization
 */
export async function getAnalyticsOverviewAction(): Promise<ActionResult<AnalyticsOverview>> {
  try {
    const data = await backendFetch<AnalyticsOverview>("/api/v1/analytics/overview", {
      method: "GET",
      requireAuth: true,
    });
    return { success: true, data };
  } catch (err) {
    console.error("Failed to fetch analytics overview:", err);
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load analytics overview."),
    };
  }
}

/**
 * Fetches daily conversation and deflection volume trends over 7, 14, or 30 days
 */
export async function getAnalyticsTrendsAction(
  rangeDays: TrendRange = 7
): Promise<ActionResult<AnalyticsTrends>> {
  try {
    const data = await backendFetch<AnalyticsTrends>(
      `/api/v1/analytics/trends?range_days=${rangeDays}`,
      {
        method: "GET",
        requireAuth: true,
      }
    );
    return { success: true, data };
  } catch (err) {
    console.error("Failed to fetch analytics volume trends:", err);
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load volume trends."),
    };
  }
}

/**
 * Fetches knowledge base gaps (unanswered visitor inquiries triggering AI fallback)
 */
export async function getKnowledgeGapsAction(
  limit: number = 10,
  days: number = 30
): Promise<ActionResult<KnowledgeGapsResponse>> {
  try {
    const data = await backendFetch<KnowledgeGapsResponse>(
      `/api/v1/analytics/knowledge-gaps?limit=${limit}&days=${days}`,
      {
        method: "GET",
        requireAuth: true,
      }
    );
    return { success: true, data };
  } catch (err) {
    console.error("Failed to fetch knowledge base gaps:", err);
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load knowledge gaps."),
    };
  }
}

/**
 * Fetches most frequent customer questions asked across all chat interactions
 */
export async function getTopQuestionsAction(
  limit: number = 10,
  days: number = 30
): Promise<ActionResult<TopQuestionsResponse>> {
  try {
    const data = await backendFetch<TopQuestionsResponse>(
      `/api/v1/analytics/top-questions?limit=${limit}&days=${days}`,
      {
        method: "GET",
        requireAuth: true,
      }
    );
    return { success: true, data };
  } catch (err) {
    console.error("Failed to fetch top customer questions:", err);
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load top questions."),
    };
  }
}
