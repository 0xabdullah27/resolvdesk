"use server";

import { revalidatePath } from "next/cache";
import { backendFetch, BackendApiError } from "@/lib/backend-api";
import type {
  PlatformMetrics,
  PlatformUserItem,
  PlatformUserListResponse,
  UserStatusUpdateRequest,
} from "@/types/admin";

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
        return "Access denied. Platform creator administrative privileges required.";
      case 404:
        return "Requested admin resource was not found.";
      case 422:
        return "Validation failed on the administrative request.";
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
 * Server Action: Fetches platform-wide aggregated KPI metrics for the creator dashboard
 */
export async function getPlatformMetricsAction(): Promise<ActionResult<PlatformMetrics>> {
  try {
    const data = await backendFetch<PlatformMetrics>("/api/v1/admin/metrics", {
      method: "GET",
      requireAuth: true,
    });
    return { success: true, data };
  } catch (err) {
    console.error("Failed to fetch platform admin metrics:", err);
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load platform metrics."),
    };
  }
}

/**
 * Server Action: Lists registered platform users with search, status filtering, and pagination
 */
export async function listPlatformUsersAction(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ActionResult<PlatformUserListResponse>> {
  try {
    const searchParams = new URLSearchParams();
    if (params.search?.trim()) {
      searchParams.set("search", params.search.trim());
    }
    if (params.status && params.status !== "all") {
      searchParams.set("status", params.status);
    }
    if (params.page && params.page > 1) {
      searchParams.set("page", params.page.toString());
    }
    if (params.pageSize) {
      searchParams.set("page_size", params.pageSize.toString());
    }

    const query = searchParams.toString();
    const endpoint = `/api/v1/admin/users${query ? `?${query}` : ""}`;

    const data = await backendFetch<PlatformUserListResponse>(endpoint, {
      method: "GET",
      requireAuth: true,
    });
    return { success: true, data };
  } catch (err) {
    console.error("Failed to list platform users:", err);
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to retrieve user directory."),
    };
  }
}

/**
 * Server Action: Retrieves workspace utilization details for a specific user
 */
export async function getUserWorkspaceDetailsAction(
  userId: string
): Promise<ActionResult<PlatformUserItem>> {
  try {
    const data = await backendFetch<PlatformUserItem>(`/api/v1/admin/users/${userId}`, {
      method: "GET",
      requireAuth: true,
    });
    return { success: true, data };
  } catch (err) {
    console.error("Failed to fetch user workspace details:", err);
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load workspace details."),
    };
  }
}

/**
 * Server Action: Updates a user's status (active/suspended) and invalidates cache
 */
export async function updateUserStatusAction(
  userId: string,
  payload: UserStatusUpdateRequest
): Promise<ActionResult<PlatformUserItem>> {
  try {
    const data = await backendFetch<PlatformUserItem>(`/api/v1/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      requireAuth: true,
    });
    revalidatePath("/admin");
    return { success: true, data };
  } catch (err) {
    console.error("Failed to update user status:", err);
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to update user status."),
    };
  }
}
