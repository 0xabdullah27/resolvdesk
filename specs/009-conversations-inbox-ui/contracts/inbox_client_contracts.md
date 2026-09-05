# Client & Component Contracts: Conversations Inbox & Ticket Management

**Feature Branch**: `009-conversations-inbox-ui`  
**Date**: 2026-09-06  
**Status**: Complete

---

## 1. Next.js Server Actions Contracts (`frontend/actions/conversation-actions.ts`)

Server Actions act as the secure boundary between the browser client and the backend FastAPI service, handling server-side JWT authentication and cache invalidation.

```typescript
"use server";

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

/**
 * Lists conversations with pagination and optional escalation filtering.
 */
export async function listConversationsAction(
  limit: number = 20,
  offset: number = 0,
  isEscalated?: boolean
): Promise<ActionResult<ConversationListResponse>>;

/**
 * Fetches the full message transcript for a specific conversation.
 */
export async function getConversationTranscriptAction(
  conversationId: string
): Promise<ActionResult<ConversationDetail>>;

/**
 * Retrieves aggregate overview metrics for the dashboard header.
 */
export async function getConversationStatsAction(): Promise<
  ActionResult<ConversationStats>
>;

/**
 * Updates the ticket resolution status and triggers Next.js path revalidation.
 */
export async function updateTicketStatusAction(
  conversationId: string,
  status: TicketStatus
): Promise<ActionResult<{ id: string; ticket_status: TicketStatus; updated_at: string }>>;
```

---

## 2. Component Hierarchy & Prop Contracts (`frontend/components/conversations/`)

```text
ConversationsPage (Server Component - app/dashboard/conversations/page.tsx)
  │
  ├── ConversationStatsCards (Client/Server)
  │
  └── ConversationsInbox (Client Controller Component)
        │
        ├── ConversationList (Master Sidebar)
        │     ├── InboxSearchBar
        │     ├── InboxFilterTabs ("All" | "Escalated")
        │     ├── ConversationCard (Item)
        │     └── InboxPagination
        │
        └── ConversationTranscript (Detail Pane)
              ├── TranscriptHeader (Visitor ID, timestamp, mobile back button)
              ├── EscalationCard (Contact email, Copy button, mailto link, status dropdown)
              ├── MessageBubbleStream
              │     ├── VisitorBubble
              │     ├── AssistantBubble (with CitationBadges)
              │     └── SystemAuditBubble
              └── TranscriptEmptyState
```

### 2.1 `ConversationsInbox` (Root Container)
```typescript
interface ConversationsInboxProps {
  initialConversations: ConversationSummary[];
  initialTotal: number;
  initialStats: ConversationStats;
  initialSelectedId?: string | null;
}
```
**Responsibilities**:
- Reads and updates URL search parameter `?id=<uuid>` using Next.js `useSearchParams()` and `useRouter()`.
- Runs background polling interval (every 30 seconds) via `document.visibilityState` to fetch recent chats.
- Prepends new conversations without interrupting active scroll or transcript selection.
- Controls responsive mobile toggle between master list and detail pane.

---

### 2.2 `ConversationList` (Sidebar)
```typescript
interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  activeFilter: "all" | "escalated";
  onFilterChange: (filter: "all" | "escalated") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  onRefresh: () => void;
}
```

---

### 2.3 `ConversationTranscript` (Detail Pane)
```typescript
interface ConversationTranscriptProps {
  conversationId: string | null;
  transcript: ConversationDetail | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onStatusChange: (status: TicketStatus) => Promise<void>;
  onBackToList?: () => void; // Mobile view navigation
}
```

---

### 2.4 `EscalationCard` (Detail Banner)
```typescript
interface EscalationCardProps {
  visitorEmail?: string | null;
  ticketStatus: TicketStatus;
  isUpdatingStatus: boolean;
  onStatusChange: (newStatus: TicketStatus) => Promise<void>;
  createdAt: string;
}
```
**UI Elements**:
- Status pill badge with color-coded semantic state:
  - `open`: amber/warning accent
  - `in_progress`: blue/accent
  - `resolved`: emerald/success accent
- Email container with:
  - Clickable `mailto:{visitorEmail}` icon button
  - One-click copy button with clipboard copy and transient "Copied!" checkmark feedback.
- Interactive status dropdown select to trigger immediate update.

---

### 2.5 `ConversationStatsCards` (Metrics Grid)
```typescript
interface ConversationStatsCardsProps {
  stats: ConversationStats;
  isLoading?: boolean;
}
```
Renders 4 metric cards:
1. **Total Conversations** (`total_conversations`)
2. **Total Messages** (`total_messages`)
3. **Escalated Tickets** (`escalated_conversations`)
4. **Active in 24h** (`active_last_24h`)
