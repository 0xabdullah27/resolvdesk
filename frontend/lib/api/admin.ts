import axios, { type AxiosInstance } from "axios";
import type {
  PlatformMetrics,
  PlatformUserItem,
  PlatformUserListResponse,
  UserStatusUpdateRequest,
} from "@/types/admin";
import {
  getPlatformMetricsAction,
  listPlatformUsersAction,
  getUserWorkspaceDetailsAction,
  updateUserStatusAction,
} from "@/actions/admin-actions";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.BACKEND_API_URL ||
  "http://localhost:8000";

/**
 * Pre-configured Axios instance for admin API calls
 */
export const adminAxios: AxiosInstance = axios.create({
  baseURL: BACKEND_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

/**
 * Frontend Admin API Client
 * Seamlessly leverages Server Actions to guarantee secure cookie-based JWT authorization
 * without exposing raw bearer tokens in client-side state.
 */
export const adminApi = {
  /**
   * Fetches platform-wide aggregate metrics
   */
  async getMetrics(): Promise<PlatformMetrics> {
    const result = await getPlatformMetricsAction();
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to load platform metrics.");
    }
    return result.data;
  },

  /**
   * Lists users with search, status filtering, and pagination
   */
  async listUsers(params: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PlatformUserListResponse> {
    const result = await listPlatformUsersAction(params);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to retrieve user directory.");
    }
    return result.data;
  },

  /**
   * Retrieves workspace resource counters for a given user
   */
  async getUserDetails(userId: string): Promise<PlatformUserItem> {
    const result = await getUserWorkspaceDetailsAction(userId);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to load user workspace details.");
    }
    return result.data;
  },

  /**
   * Suspends or reactivates a user account
   */
  async updateUserStatus(
    userId: string,
    payload: UserStatusUpdateRequest
  ): Promise<PlatformUserItem> {
    const result = await updateUserStatusAction(userId, payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to update user status.");
    }
    return result.data;
  },
};
