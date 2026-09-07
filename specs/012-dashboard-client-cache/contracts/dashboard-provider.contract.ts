/**
 * Contract: Dashboard Provider & Hook Interface
 *
 * Defines the public API exposed to all child dashboard components.
 */

export interface DashboardProviderContract {
  /**
   * Retrieves or lazily loads the top-level analytics overview metrics.
   * If already loaded, returns immediately from in-memory cache without hitting the database.
   */
  getOverview(): Promise<void>;

  /**
   * Retrieves or lazily loads the 30-day volume trends data.
   */
  getTrends(days?: number): Promise<void>;

  /**
   * Retrieves or lazily loads knowledge base gaps.
   */
  getKnowledgeGaps(limit?: number, days?: number): Promise<void>;

  /**
   * Retrieves or lazily loads top customer inquiries.
   */
  getTopQuestions(limit?: number, days?: number): Promise<void>;

  /**
   * Retrieves or lazily loads widget customizer branding and domain rules.
   */
  getWidgetProfile(): Promise<void>;

  /**
   * Retrieves or lazily loads uploaded knowledge base documents.
   */
  getDocuments(): Promise<void>;

  /**
   * Retrieves or lazily loads conversation inbox items and stats.
   */
  getConversations(limit?: number, offset?: number): Promise<void>;

  /**
   * Optimistically updates ticket status.
   * Modifies local state immediately. Reverts and toasts on failure.
   */
  optimisticUpdateTicketStatus(
    conversationId: string,
    status: "open" | "in_progress" | "resolved"
  ): Promise<boolean>;

  /**
   * Optimistically deletes a document from the list.
   * Reverts and toasts on failure.
   */
  optimisticDeleteDocument(documentId: string): Promise<boolean>;

  /**
   * Explicit user-triggered refresh. Invalidates cache and refetches canonical state.
   */
  refreshAll(): Promise<void>;
}
