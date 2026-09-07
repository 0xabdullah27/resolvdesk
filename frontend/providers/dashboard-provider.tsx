"use client";

import * as React from "react";
import { toast } from "sonner";

import type {
  AsyncResource,
  DashboardContextValue,
  DashboardState,
} from "@/types/dashboard-cache";
import type {
  AnalyticsOverview,
  AnalyticsTrends,
  KnowledgeGapsResponse,
  TopQuestionsResponse,
  TrendRange,
} from "@/types/analytics";
import type { DocumentListResponse } from "@/types/document";
import type { WidgetConfig } from "@/types/widget";
import type {
  ConversationDetail,
  ConversationListResponse,
  ConversationStats,
  TicketStatus,
} from "@/types/conversation";
import type { OwnerProfile } from "@/types/dashboard";

import {
  getAnalyticsOverviewAction,
  getAnalyticsTrendsAction,
  getKnowledgeGapsAction,
  getTopQuestionsAction,
} from "@/actions/analytics-actions";
import { getWidgetConfigAction } from "@/actions/widget-actions";
import { listDocumentsAction, deleteDocumentAction } from "@/actions/document-actions";
import {
  listConversationsAction,
  getConversationStatsAction,
  getConversationTranscriptAction,
  updateTicketStatusAction,
} from "@/actions/conversation-actions";

function createInitialResource<T>(): AsyncResource<T> {
  return {
    data: null,
    status: "idle",
    error: null,
    lastLoadedAt: null,
  };
}

export const DashboardContext = React.createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  children,
  owner,
}: {
  children: React.ReactNode;
  owner?: OwnerProfile | null;
}) {
  const [overview, setOverview] = React.useState<AsyncResource<AnalyticsOverview>>(createInitialResource);
  const [trends, setTrends] = React.useState<AsyncResource<AnalyticsTrends>>(createInitialResource);
  const [knowledgeGaps, setKnowledgeGaps] = React.useState<AsyncResource<KnowledgeGapsResponse>>(createInitialResource);
  const [topQuestions, setTopQuestions] = React.useState<AsyncResource<TopQuestionsResponse>>(createInitialResource);
  const [widgetConfig, setWidgetConfig] = React.useState<AsyncResource<WidgetConfig>>(createInitialResource);
  const [documents, setDocuments] = React.useState<AsyncResource<DocumentListResponse>>(createInitialResource);
  const [conversations, setConversations] = React.useState<AsyncResource<ConversationListResponse>>(createInitialResource);
  const [conversationStats, setConversationStats] = React.useState<AsyncResource<ConversationStats>>(createInitialResource);
  const [transcripts, setTranscripts] = React.useState<Record<string, ConversationDetail>>({});
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  // Loaders
  const loadOverview = React.useCallback(async (force = false): Promise<AnalyticsOverview | null> => {
    if (!force && overview.status === "loaded" && overview.data) {
      return overview.data;
    }
    setOverview((prev) => ({ ...prev, status: "loading", error: null }));
    const res = await getAnalyticsOverviewAction();
    if (res.success && res.data) {
      setOverview({
        data: res.data,
        status: "loaded",
        error: null,
        lastLoadedAt: Date.now(),
      });
      return res.data;
    }
    setOverview((prev) => ({
      ...prev,
      status: "error",
      error: res.error || "Failed to load overview",
    }));
    return null;
  }, [overview.data, overview.status]);

  const loadTrends = React.useCallback(async (rangeDays: TrendRange = 30, force = false): Promise<AnalyticsTrends | null> => {
    if (!force && trends.status === "loaded" && trends.data) {
      return trends.data;
    }
    setTrends((prev) => ({ ...prev, status: "loading", error: null }));
    const res = await getAnalyticsTrendsAction(rangeDays);
    if (res.success && res.data) {
      setTrends({
        data: res.data,
        status: "loaded",
        error: null,
        lastLoadedAt: Date.now(),
      });
      return res.data;
    }
    setTrends((prev) => ({
      ...prev,
      status: "error",
      error: res.error || "Failed to load trends",
    }));
    return null;
  }, [trends.data, trends.status]);

  const loadKnowledgeGaps = React.useCallback(async (limit = 5, days = 30, force = false): Promise<KnowledgeGapsResponse | null> => {
    if (!force && knowledgeGaps.status === "loaded" && knowledgeGaps.data) {
      return knowledgeGaps.data;
    }
    setKnowledgeGaps((prev) => ({ ...prev, status: "loading", error: null }));
    const res = await getKnowledgeGapsAction(limit, days);
    if (res.success && res.data) {
      setKnowledgeGaps({
        data: res.data,
        status: "loaded",
        error: null,
        lastLoadedAt: Date.now(),
      });
      return res.data;
    }
    setKnowledgeGaps((prev) => ({
      ...prev,
      status: "error",
      error: res.error || "Failed to load knowledge gaps",
    }));
    return null;
  }, [knowledgeGaps.data, knowledgeGaps.status]);

  const loadTopQuestions = React.useCallback(async (limit = 5, days = 30, force = false): Promise<TopQuestionsResponse | null> => {
    if (!force && topQuestions.status === "loaded" && topQuestions.data) {
      return topQuestions.data;
    }
    setTopQuestions((prev) => ({ ...prev, status: "loading", error: null }));
    const res = await getTopQuestionsAction(limit, days);
    if (res.success && res.data) {
      setTopQuestions({
        data: res.data,
        status: "loaded",
        error: null,
        lastLoadedAt: Date.now(),
      });
      return res.data;
    }
    setTopQuestions((prev) => ({
      ...prev,
      status: "error",
      error: res.error || "Failed to load top inquiries",
    }));
    return null;
  }, [topQuestions.data, topQuestions.status]);

  const loadWidgetConfig = React.useCallback(async (force = false): Promise<WidgetConfig | null> => {
    if (!force && widgetConfig.status === "loaded" && widgetConfig.data) {
      return widgetConfig.data;
    }
    setWidgetConfig((prev) => ({ ...prev, status: "loading", error: null }));
    const res = await getWidgetConfigAction();
    if (res.success && res.data) {
      setWidgetConfig({
        data: res.data,
        status: "loaded",
        error: null,
        lastLoadedAt: Date.now(),
      });
      return res.data;
    }
    setWidgetConfig((prev) => ({
      ...prev,
      status: "error",
      error: res.error || "Failed to load widget settings",
    }));
    return null;
  }, [widgetConfig.data, widgetConfig.status]);

  const updateWidgetConfigCache = React.useCallback((newConfig: WidgetConfig) => {
    setWidgetConfig({
      data: newConfig,
      status: "loaded",
      error: null,
      lastLoadedAt: Date.now(),
    });
  }, []);

  const loadDocuments = React.useCallback(async (force = false): Promise<DocumentListResponse | null> => {
    if (!force && documents.status === "loaded" && documents.data) {
      return documents.data;
    }
    setDocuments((prev) => ({ ...prev, status: "loading", error: null }));
    const res = await listDocumentsAction();
    if (res.success && res.data) {
      setDocuments({
        data: res.data,
        status: "loaded",
        error: null,
        lastLoadedAt: Date.now(),
      });
      return res.data;
    }
    setDocuments((prev) => ({
      ...prev,
      status: "error",
      error: res.error || "Failed to load documents",
    }));
    return null;
  }, [documents.data, documents.status]);

  const loadConversations = React.useCallback(async (limit = 20, offset = 0, force = false): Promise<ConversationListResponse | null> => {
    if (!force && conversations.status === "loaded" && conversations.data) {
      return conversations.data;
    }
    setConversations((prev) => ({ ...prev, status: "loading", error: null }));
    setConversationStats((prev) => ({ ...prev, status: "loading", error: null }));

    const [convRes, statsRes] = await Promise.all([
      listConversationsAction(limit, offset),
      getConversationStatsAction(),
    ]);

    if (convRes.success && convRes.data) {
      setConversations({
        data: convRes.data,
        status: "loaded",
        error: null,
        lastLoadedAt: Date.now(),
      });

      // Automatically prefetch transcripts in background so switching conversations has 0ms delay
      const items = convRes.data.items;
      if (items.length > 0) {
        setSelectedConversationId((prev) => prev || items[0].id);

        const firstId = items[0].id;
        getConversationTranscriptAction(firstId).then((firstRes) => {
          if (firstRes.success && firstRes.data) {
            setTranscripts((prev) => ({
              ...prev,
              [firstId]: firstRes.data!,
            }));
          }

          // Prefetch remaining conversations on page in background
          items.slice(1, 10).forEach((item) => {
            getConversationTranscriptAction(item.id).then((res) => {
              if (res.success && res.data) {
                setTranscripts((prev) => ({
                  ...prev,
                  [item.id]: res.data!,
                }));
              }
            });
          });
        });
      }
    } else {
      setConversations((prev) => ({
        ...prev,
        status: "error",
        error: convRes.error || "Failed to load conversations",
      }));
    }

    if (statsRes.success && statsRes.data) {
      setConversationStats({
        data: statsRes.data,
        status: "loaded",
        error: null,
        lastLoadedAt: Date.now(),
      });
    } else {
      setConversationStats((prev) => ({
        ...prev,
        status: "error",
        error: statsRes.error || "Failed to load conversation stats",
      }));
    }

    return convRes.data || null;
  }, [conversations.data, conversations.status]);

  const loadTranscript = React.useCallback(
    async (conversationId: string, force = false): Promise<ConversationDetail | null> => {
      if (!force && transcripts[conversationId]) {
        return transcripts[conversationId];
      }
      const res = await getConversationTranscriptAction(conversationId);
      if (res.success && res.data) {
        setTranscripts((prev) => ({
          ...prev,
          [conversationId]: res.data!,
        }));
        return res.data;
      }
      return null;
    },
    [transcripts]
  );

  // Background pre-load conversations on mount if idle so inbox is instantly ready
  React.useEffect(() => {
    if (conversations.status === "idle") {
      loadConversations(20, 0);
    }
  }, [conversations.status, loadConversations]);

  // Optimistic Mutations
  const optimisticUpdateTicketStatus = React.useCallback(
    async (conversationId: string, status: TicketStatus): Promise<boolean> => {
      // 1. Capture snapshot for rollback
      const previousConversations = conversations.data;
      const previousStats = conversationStats.data;
      const previousOverview = overview.data;
      const previousTranscripts = transcripts;

      // 2. Compute optimistic state
      if (transcripts[conversationId]) {
        setTranscripts((prev) => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            ticket_status: status,
          },
        }));
      }

      if (conversations.data) {
        const target = conversations.data.items.find((c) => c.id === conversationId);
        const prevStatus = target?.ticket_status;

        const updatedItems = conversations.data.items.map((item) =>
          item.id === conversationId ? { ...item, ticket_status: status } : item
        );

        setConversations((prev) =>
          prev.data ? { ...prev, data: { ...prev.data, items: updatedItems } } : prev
        );

        // Adjust open/resolved ticket counts if moving to or from resolved
        if (prevStatus !== status) {
          const isOpenNow = status === "open" || status === "in_progress";
          const wasOpenBefore = prevStatus === "open" || prevStatus === "in_progress";

          if (wasOpenBefore && !isOpenNow) {
            // Decrement open, increment resolved
            setOverview((prev) =>
              prev.data
                ? {
                    ...prev,
                    data: {
                      ...prev.data,
                      open_tickets_count: Math.max(0, prev.data.open_tickets_count - 1),
                      resolved_tickets_count: prev.data.resolved_tickets_count + 1,
                    },
                  }
                : prev
            );
            setConversationStats((prev) =>
              prev.data
                ? {
                    ...prev,
                    data: {
                      ...prev.data,
                      escalated_conversations: Math.max(0, prev.data.escalated_conversations - 1),
                    },
                  }
                : prev
            );
          } else if (!wasOpenBefore && isOpenNow) {
            // Increment open, decrement resolved
            setOverview((prev) =>
              prev.data
                ? {
                    ...prev,
                    data: {
                      ...prev.data,
                      open_tickets_count: prev.data.open_tickets_count + 1,
                      resolved_tickets_count: Math.max(0, prev.data.resolved_tickets_count - 1),
                    },
                  }
                : prev
            );
            setConversationStats((prev) =>
              prev.data
                ? {
                    ...prev,
                    data: {
                      ...prev.data,
                      escalated_conversations: prev.data.escalated_conversations + 1,
                    },
                  }
                : prev
            );
          }
        }
      }

      // 3. Dispatch background mutation
      try {
        const res = await updateTicketStatusAction(conversationId, status);
        if (!res.success) {
          throw new Error(res.error || "Failed to update ticket status.");
        }
        toast.success(`Ticket marked as ${status === "resolved" ? "Resolved" : "Open"}.`);
        return true;
      } catch (err: any) {
        // 4. Rollback on failure
        setConversations((prev) => ({ ...prev, data: previousConversations }));
        setConversationStats((prev) => ({ ...prev, data: previousStats }));
        setOverview((prev) => ({ ...prev, data: previousOverview }));
        setTranscripts(previousTranscripts);
        toast.error(err?.message || "Could not update ticket status. Changes reverted.");
        return false;
      }
    },
    [conversations.data, conversationStats.data, overview.data, transcripts]
  );

  const optimisticDeleteDocument = React.useCallback(
    async (documentId: string): Promise<boolean> => {
      // 1. Capture snapshot for rollback
      const previousDocuments = documents.data;

      // 2. Apply optimistic removal
      if (documents.data) {
        const updatedItems = documents.data.items.filter((doc) => doc.id !== documentId);
        setDocuments((prev) =>
          prev.data
            ? {
                ...prev,
                data: {
                  ...prev.data,
                  items: updatedItems,
                  total: Math.max(0, prev.data.total - 1),
                },
              }
            : prev
        );
      }

      // 3. Dispatch background mutation
      try {
        const res = await deleteDocumentAction(documentId);
        if (!res.success) {
          throw new Error(res.error || "Failed to delete document.");
        }
        toast.success("Document removed from knowledge base.");
        return true;
      } catch (err: any) {
        // 4. Rollback on failure
        setDocuments((prev) => ({ ...prev, data: previousDocuments }));
        toast.error(err?.message || "Could not delete document. Changes reverted.");
        return false;
      }
    },
    [documents.data]
  );

  // Global Refresh Action
  const refreshAll = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        loadOverview(true),
        loadTrends(30, true),
        loadKnowledgeGaps(5, 30, true),
        loadTopQuestions(5, 30, true),
        loadWidgetConfig(true),
        loadDocuments(true),
        loadConversations(20, 0, true),
      ]);
      setLastRefreshedAt(new Date());
      toast.success("Dashboard metrics refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  }, [
    loadOverview,
    loadTrends,
    loadKnowledgeGaps,
    loadTopQuestions,
    loadWidgetConfig,
    loadDocuments,
    loadConversations,
  ]);

  const value: DashboardContextValue = {
    overview,
    trends,
    knowledgeGaps,
    topQuestions,
    widgetConfig,
    documents,
    conversations,
    conversationStats,
    transcripts,
    selectedConversationId,
    owner: owner || null,
    lastRefreshedAt,
    isRefreshing,
    loadOverview,
    loadTrends,
    loadKnowledgeGaps,
    loadTopQuestions,
    loadWidgetConfig,
    loadDocuments,
    loadConversations,
    loadTranscript,
    setSelectedConversationId,
    updateWidgetConfigCache,
    optimisticUpdateTicketStatus,
    optimisticDeleteDocument,
    refreshAll,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
