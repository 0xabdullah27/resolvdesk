export interface AnalyticsOverview {
  total_conversations: number;
  total_conversations_30d: number;
  total_messages: number;
  escalated_conversations: number;
  deflection_rate: number;
  open_tickets_count: number;
  resolved_tickets_count: number;
}

export interface DailyVolumePoint {
  date: string; // YYYY-MM-DD
  total_conversations: number;
  ai_resolved: number;
  escalated: number;
  total_messages: number;
}

export interface AnalyticsTrends {
  range_days: number;
  points: DailyVolumePoint[];
}

export interface KnowledgeGapItem {
  question: string;
  frequency: number;
  last_asked_at: string;
  conversation_id?: string | null;
}

export interface KnowledgeGapsResponse {
  items: KnowledgeGapItem[];
  total: number;
}

export interface TopQuestionItem {
  question: string;
  frequency: number;
  last_asked_at: string;
}

export interface TopQuestionsResponse {
  items: TopQuestionItem[];
  total: number;
}

export type TrendRange = 7 | 14 | 30;
