export type TicketStatus = "open" | "in_progress" | "resolved";

export type MessageRole = "visitor" | "assistant" | "system";

export interface CitationItem {
  document_id: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  citations?: CitationItem[] | null;
  metadata?: Record<string, any> | null;
}

export interface ConversationSummary {
  id: string;
  created_at: string;
  updated_at: string;
  is_escalated: boolean;
  ticket_status?: TicketStatus | null;
  visitor_email?: string | null;
  message_count: number;
  last_message_preview?: string | null;
  last_message_role?: string | null;
  is_new?: boolean;
}

export interface ConversationDetail {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  is_escalated: boolean;
  ticket_status?: TicketStatus | null;
  visitor_email?: string | null;
  messages: ChatMessage[];
}

export interface ConversationListResponse {
  total: number;
  limit: number;
  offset: number;
  items: ConversationSummary[];
}

export interface ConversationStats {
  total_conversations: number;
  total_messages: number;
  escalated_conversations: number;
  active_last_24h: number;
}

export type InboxFilterTab = "all" | "escalated";

export interface InboxViewState {
  selectedConversationId: string | null;
  activeFilter: InboxFilterTab;
  searchQuery: string;
  page: number;
  pageSize: number;
  isMobileDetailOpen: boolean;
}
