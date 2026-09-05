"use server";

import { revalidatePath } from "next/cache";
import { backendFetch, BackendApiError } from "@/lib/backend-api";
import type {
  ConversationListResponse,
  ConversationDetail,
  ConversationStats,
  TicketStatus,
} from "@/types/conversation";

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
      case 400:
        return "Invalid request parameter or ticket status.";
      case 401:
        return "Your session has expired. Please log in again.";
      case 403:
        return "You do not have permission to access these conversations.";
      case 404:
        return "Conversation or ticket not found.";
      case 422:
        return "Validation failed on the submitted data.";
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
 * Retrieves a paginated list of conversations with optional escalation filtering
 */
export async function listConversationsAction(
  limit: number = 20,
  offset: number = 0,
  isEscalated?: boolean
): Promise<ActionResult<ConversationListResponse>> {
  try {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (typeof isEscalated === "boolean") {
      params.set("is_escalated", String(isEscalated));
    }

    const data = await backendFetch<ConversationListResponse>(
      `api/v1/conversations?${params.toString()}`,
      {
        requireAuth: true,
        cache: "no-store",
      }
    );
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load conversations."),
    };
  }
}

/**
 * Fetches the complete chronological transcript for an individual conversation
 */
export async function getConversationTranscriptAction(
  conversationId: string
): Promise<ActionResult<ConversationDetail>> {
  try {
    if (!conversationId) {
      return { success: false, error: "Conversation ID is required." };
    }

    const data = await backendFetch<ConversationDetail>(
      `api/v1/conversations/${conversationId}`,
      {
        requireAuth: true,
        cache: "no-store",
      }
    );
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load conversation transcript."),
    };
  }
}

/**
 * Retrieves high-level conversation statistics and metrics for the dashboard overview
 */
export async function getConversationStatsAction(): Promise<ActionResult<ConversationStats>> {
  try {
    const data = await backendFetch<ConversationStats>(
      "api/v1/conversations/stats",
      {
        requireAuth: true,
        cache: "no-store",
      }
    );
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load conversation statistics."),
    };
  }
}

/**
 * Updates the resolution lifecycle status of an escalated ticket (open, in_progress, resolved)
 */
export async function updateTicketStatusAction(
  conversationId: string,
  status: TicketStatus
): Promise<ActionResult<{ id: string; ticket_status: TicketStatus; updated_at: string }>> {
  try {
    if (!conversationId) {
      return { success: false, error: "Conversation ID is required." };
    }

    const data = await backendFetch<{ id: string; ticket_status: TicketStatus; updated_at: string }>(
      `api/v1/conversations/${conversationId}/ticket`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
        requireAuth: true,
      }
    );

    revalidatePath("/dashboard/conversations");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to update ticket status."),
    };
  }
}
