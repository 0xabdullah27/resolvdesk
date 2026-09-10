import type {
  AnalyticsOverview,
  AnalyticsTrends,
  KnowledgeGapsResponse,
  TopQuestionsResponse,
  TrendRange,
} from "@/types/analytics";
import type { DocumentItem, DocumentListResponse } from "@/types/document";
import type { WidgetConfig } from "@/types/widget";
import type {
  ConversationDetail,
  ConversationListResponse,
  ConversationStats,
  TicketStatus,
} from "@/types/conversation";
import type { OwnerProfile } from "@/types/dashboard";

export type AsyncStatus = "idle" | "loading" | "loaded" | "error";

export interface AsyncResource<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  lastLoadedAt: number | null;
}

export interface TicketStatusSnapshot {
  conversationId: string;
  previousStatus: TicketStatus | null;
  previousOpenCount: number;
  previousResolvedCount: number;
}

export interface DocumentDeletionSnapshot {
  documentId: string;
  deletedDocument: DocumentItem;
  previousIndex: number;
  previousTotal: number;
}

export interface DashboardState {
  overview: AsyncResource<AnalyticsOverview>;
  trends: AsyncResource<AnalyticsTrends>;
  knowledgeGaps: AsyncResource<KnowledgeGapsResponse>;
  topQuestions: AsyncResource<TopQuestionsResponse>;
  widgetConfig: AsyncResource<WidgetConfig>;
  documents: AsyncResource<DocumentListResponse>;
  conversations: AsyncResource<ConversationListResponse>;
  conversationStats: AsyncResource<ConversationStats>;
  transcripts: Record<string, ConversationDetail>;
  selectedConversationId: string | null;
  owner: OwnerProfile | null;
  lastRefreshedAt: Date | null;
  isRefreshing: boolean;
  isSidebarCollapsed: boolean;
}

export interface DashboardContextValue extends DashboardState {
  // Sidebar State
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;

  // Loaders
  loadOverview: (force?: boolean) => Promise<AnalyticsOverview | null>;
  loadTrends: (rangeDays?: TrendRange, force?: boolean) => Promise<AnalyticsTrends | null>;
  loadKnowledgeGaps: (limit?: number, days?: number, force?: boolean) => Promise<KnowledgeGapsResponse | null>;
  loadTopQuestions: (limit?: number, days?: number, force?: boolean) => Promise<TopQuestionsResponse | null>;
  loadWidgetConfig: (force?: boolean) => Promise<WidgetConfig | null>;
  loadDocuments: (force?: boolean) => Promise<DocumentListResponse | null>;
  loadConversations: (limit?: number, offset?: number, force?: boolean) => Promise<ConversationListResponse | null>;
  loadTranscript: (conversationId: string, force?: boolean) => Promise<ConversationDetail | null>;
  setSelectedConversationId: (id: string | null) => void;

  // Cache Updates
  updateWidgetConfigCache: (config: WidgetConfig) => void;

  // Optimistic Mutations
  optimisticUpdateTicketStatus: (
    conversationId: string,
    status: TicketStatus
  ) => Promise<boolean>;
  optimisticDeleteDocument: (documentId: string) => Promise<boolean>;

  // Manual Refresh
  refreshAll: () => Promise<void>;
}
