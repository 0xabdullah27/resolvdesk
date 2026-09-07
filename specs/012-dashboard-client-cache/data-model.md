# Data Model: Dashboard Client Cache & Optimistic State Management

## Overview
This document specifies the client-side in-memory data models, cache interfaces, and optimistic mutation structures maintained by `DashboardProvider`.

---

## 1. Core Cache Types

```typescript
export type AsyncStatus = "idle" | "loading" | "loaded" | "error";

export interface AsyncResource<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  lastLoadedAt: number | null; // epoch timestamp in ms
}
```

---

## 2. Dashboard State Shape

```typescript
import type { AnalyticsOverview, AnalyticsTrends, KnowledgeGapsResponse, TopQuestionsResponse } from "@/types/analytics";
import type { DocumentListResponse } from "@/types/document";
import type { WidgetProfileApiResponse } from "@/types/widget";
import type { ConversationListResponse, ConversationStats, TicketStatus } from "@/types/conversation";

export interface DashboardState {
  // Analytics Domain
  overview: AsyncResource<AnalyticsOverview>;
  trends: AsyncResource<AnalyticsTrends>;
  knowledgeGaps: AsyncResource<KnowledgeGapsResponse>;
  topQuestions: AsyncResource<TopQuestionsResponse>;

  // Widget Customizer Domain
  widgetProfile: AsyncResource<WidgetProfileApiResponse>;

  // Knowledge Base Documents Domain
  documents: AsyncResource<DocumentListResponse>;

  // Conversations Inbox Domain
  conversations: AsyncResource<ConversationListResponse>;
  conversationStats: AsyncResource<ConversationStats>;

  // Global Sync Metadata
  lastRefreshedAt: Date | null;
  isRefreshing: boolean;
}
```

---

## 3. Optimistic Action Models & Snapshots

### Ticket Status Mutation
```typescript
export interface TicketStatusSnapshot {
  conversationId: string;
  previousStatus: TicketStatus | null;
  previousOpenCount: number;
  previousResolvedCount: number;
}

export interface TicketStatusOptimisticUpdate {
  conversationId: string;
  nextStatus: TicketStatus;
}
```

#### State Transition on Ticket Status Update:
1. **Prior State**:
   - `conversation.ticket_status` = `"open"`
   - `conversationStats.open_tickets_count` = `12`
   - `overview.data.open_tickets_count` = `12`
2. **Optimistic Transition**:
   - `conversation.ticket_status` $\rightarrow$ `"resolved"`
   - `conversationStats.open_tickets_count` $\rightarrow$ `11`
   - `overview.data.open_tickets_count` $\rightarrow$ `11`
3. **Rollback on Error**:
   - Reverts `conversation.ticket_status` back to `"open"`
   - Restores `open_tickets_count` back to `12`
   - Triggers `toast.error("Failed to update status. Reverted.")`

---

### Document Deletion Mutation
```typescript
export interface DocumentDeletionSnapshot {
  documentId: string;
  deletedDocument: DocumentItem;
  previousIndex: number;
  previousTotalCount: number;
}
```

#### State Transition on Document Removal:
1. **Prior State**:
   - `documents.data.items` includes document `doc-123`
   - `documents.data.total` = `5`
2. **Optimistic Transition**:
   - `documents.data.items` filtered to exclude `doc-123`
   - `documents.data.total` = `4`
3. **Rollback on Error**:
   - Inserts `deletedDocument` back at `previousIndex`
   - Restores `documents.data.total` to `5`
   - Triggers `toast.error("Failed to delete document. Reverted.")`

---

## 4. Provider Action Interface

```typescript
export interface DashboardContextValue extends DashboardState {
  // Loaders (load once on first mount)
  loadOverview: (force?: boolean) => Promise<void>;
  loadTrends: (rangeDays?: number, force?: boolean) => Promise<void>;
  loadKnowledgeGaps: (limit?: number, days?: number, force?: boolean) => Promise<void>;
  loadTopQuestions: (limit?: number, days?: number, force?: boolean) => Promise<void>;
  loadWidgetProfile: (force?: boolean) => Promise<void>;
  loadDocuments: (force?: boolean) => Promise<void>;
  loadConversations: (limit?: number, offset?: number, force?: boolean) => Promise<void>;

  // Optimistic Mutators
  optimisticUpdateTicketStatus: (conversationId: string, status: TicketStatus) => Promise<boolean>;
  optimisticDeleteDocument: (documentId: string) => Promise<boolean>;

  // Global Refresh Action
  refreshAll: () => Promise<void>;
}
```
