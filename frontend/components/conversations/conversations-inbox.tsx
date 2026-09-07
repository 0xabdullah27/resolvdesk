"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type {
  ConversationSummary,
  ConversationDetail,
  ConversationStats,
  InboxFilterTab,
  TicketStatus,
} from "@/types/conversation";
import {
  listConversationsAction,
  getConversationTranscriptAction,
  getConversationStatsAction,
} from "@/actions/conversation-actions";
import { ConversationStatsCards } from "@/components/conversations/conversation-stats-cards";
import { ConversationList } from "@/components/conversations/conversation-list";
import { ConversationTranscript } from "@/components/conversations/conversation-transcript";
import { ConversationsSkeleton } from "@/components/conversations/conversations-skeleton";
import { useDashboard } from "@/hooks/use-dashboard";

interface ConversationsInboxProps {
  initialConversations?: ConversationSummary[];
  initialTotal?: number;
  initialStats?: ConversationStats;
  initialSelectedId?: string | null;
}

const PAGE_SIZE = 20;
const POLLING_INTERVAL_MS = 30000;

export function ConversationsInbox({
  initialConversations = [],
  initialTotal = 0,
  initialStats = {
    total_conversations: 0,
    total_messages: 0,
    escalated_conversations: 0,
    active_last_24h: 0,
  },
  initialSelectedId,
}: ConversationsInboxProps) {
  const {
    conversations: cachedConversations,
    conversationStats: cachedStats,
    loadConversations,
    optimisticUpdateTicketStatus,
  } = useDashboard();

  // Lazy load conversations on first mount if idle
  React.useEffect(() => {
    if (cachedConversations.status === "idle") {
      loadConversations(PAGE_SIZE, 0);
    }
  }, [cachedConversations.status, loadConversations]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL-driven selected ID
  const urlSelectedId = searchParams.get("id") || initialSelectedId || null;

  // Local state
  const [conversations, setConversations] = React.useState<ConversationSummary[]>(
    cachedConversations.data ? cachedConversations.data.items : initialConversations
  );
  const [totalCount, setTotalCount] = React.useState<number>(
    cachedConversations.data ? cachedConversations.data.total : initialTotal
  );
  const [stats, setStats] = React.useState<ConversationStats>(
    cachedStats.data ? cachedStats.data : initialStats
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(urlSelectedId);

  // Filters & Pagination
  const [activeFilter, setActiveFilter] = React.useState<InboxFilterTab>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Keep local list in sync with cache updates (e.g. from refreshAll or lazy load)
  React.useEffect(() => {
    if (cachedConversations.data && activeFilter === "all" && currentPage === 1 && !searchQuery) {
      setConversations(cachedConversations.data.items);
      setTotalCount(cachedConversations.data.total);
    }
  }, [cachedConversations.data, activeFilter, currentPage, searchQuery]);

  React.useEffect(() => {
    if (cachedStats.data) {
      setStats(cachedStats.data);
    }
  }, [cachedStats.data]);

  // Loading & Error States
  const [isLoadingList, setIsLoadingList] = React.useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [transcript, setTranscript] = React.useState<ConversationDetail | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = React.useState<boolean>(false);
  const [isTranscriptError, setIsTranscriptError] = React.useState<boolean>(false);

  // Mobile Drill-down view state
  const [isMobileDetailOpen, setIsMobileDetailOpen] = React.useState<boolean>(Boolean(urlSelectedId));

  // Sync selectedId with URL parameter changes
  const updateSelectedIdInUrl = React.useCallback(
    (newId: string | null) => {
      setSelectedId(newId);
      const params = new URLSearchParams(searchParams.toString());
      if (newId) {
        params.set("id", newId);
        setIsMobileDetailOpen(true);
      } else {
        params.delete("id");
        setIsMobileDetailOpen(false);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Auto-select first conversation on desktop if none is selected
  React.useEffect(() => {
    if (!urlSelectedId && conversations.length > 0) {
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        updateSelectedIdInUrl(conversations[0].id);
      }
    }
  }, [conversations, updateSelectedIdInUrl, urlSelectedId]);

  // Load transcript whenever selectedId changes
  const fetchTranscript = React.useCallback(async (id: string) => {
    try {
      setIsLoadingTranscript(true);
      setIsTranscriptError(false);
      const res = await getConversationTranscriptAction(id);
      if (res.success && res.data) {
        setTranscript(res.data);
      } else {
        setIsTranscriptError(true);
      }
    } catch (err) {
      console.error("Failed to fetch transcript:", err);
      setIsTranscriptError(true);
    } finally {
      setIsLoadingTranscript(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedId) {
      fetchTranscript(selectedId);
    } else {
      setTranscript(null);
    }
  }, [selectedId, fetchTranscript]);

  // Fetch list on filter or page change
  const fetchConversationsList = React.useCallback(
    async (page: number, filter: InboxFilterTab) => {
      try {
        setIsLoadingList(true);
        const offset = (page - 1) * PAGE_SIZE;
        const isEscalatedParam = filter === "escalated" ? true : undefined;
        const res = await listConversationsAction(PAGE_SIZE, offset, isEscalatedParam);

        if (res.success && res.data) {
          setConversations(res.data.items);
          setTotalCount(res.data.total);
        }
      } catch (err) {
        console.error("Failed to list conversations:", err);
      } finally {
        setIsLoadingList(false);
      }
    },
    []
  );

  const handleFilterChange = (newFilter: InboxFilterTab) => {
    setActiveFilter(newFilter);
    setCurrentPage(1);
    fetchConversationsList(1, newFilter);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchConversationsList(newPage, activeFilter);
  };

  // Manual Refresh
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      const isEscalatedParam = activeFilter === "escalated" ? true : undefined;
      const offset = (currentPage - 1) * PAGE_SIZE;

      const [listRes, statsRes] = await Promise.all([
        listConversationsAction(PAGE_SIZE, offset, isEscalatedParam),
        getConversationStatsAction(),
      ]);

      if (listRes.success && listRes.data) {
        setConversations(listRes.data.items);
        setTotalCount(listRes.data.total);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (selectedId) {
        await fetchTranscript(selectedId);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // 30-second background polling for silent list prepending
  React.useEffect(() => {
    const interval = setInterval(async () => {
      // Only poll when browser tab is actively visible
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      try {
        const isEscalatedParam = activeFilter === "escalated" ? true : undefined;
        const [listRes, statsRes] = await Promise.all([
          listConversationsAction(PAGE_SIZE, 0, isEscalatedParam),
          getConversationStatsAction(),
        ]);

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }

        if (listRes.success && listRes.data) {
          const incomingItems = listRes.data.items;
          setConversations((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newItems: ConversationSummary[] = [];

            for (const item of incomingItems) {
              if (!existingIds.has(item.id)) {
                newItems.push({ ...item, is_new: true });
              }
            }

            if (newItems.length > 0) {
              // Prepend newly arrived chats to the top without disrupting scroll or selection
              return [...newItems, ...prev];
            }
            return prev;
          });
          setTotalCount(listRes.data.total);
        }
      } catch (err) {
        // Silent polling error handling: do not disrupt active view
        console.debug("Background conversation poll skipped:", err);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeFilter]);

  // Optimistic Ticket Status Transition
  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedId || !transcript) return;

    const previousStatus = transcript.ticket_status || "open";

    // 1. Optimistic update in local transcript & list
    setTranscript((prev) => (prev ? { ...prev, ticket_status: newStatus } : null));
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, ticket_status: newStatus } : c))
    );

    // 2. Persist via DashboardProvider optimistic mutation (synchronizes KPIs and handles toast/rollback)
    const success = await optimisticUpdateTicketStatus(selectedId, newStatus);
    if (!success) {
      // Rollback local state on failure
      setTranscript((prev) => (prev ? { ...prev, ticket_status: previousStatus } : null));
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, ticket_status: previousStatus } : c))
      );
    }
  };

  const handleMobileBackToList = () => {
    updateSelectedIdInUrl(null);
  };

  // Render skeleton during very first initial load if no cached data exists
  if (
    cachedConversations.status === "loading" &&
    !cachedConversations.data &&
    conversations.length === 0
  ) {
    return <ConversationsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 4 Overview Metric Cards */}
      <ConversationStatsCards stats={stats} isLoading={isRefreshing} />

      {/* Split-Pane Master-Detail Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar (Master Conversation List) */}
        <div
          className={`md:col-span-5 lg:col-span-4 ${
            isMobileDetailOpen ? "hidden md:block" : "block"
          }`}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelectConversation={updateSelectedIdInUrl}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            isLoading={isLoadingList}
            onRefresh={handleManualRefresh}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Right Detail Pane (Conversation Transcript) */}
        <div
          className={`md:col-span-7 lg:col-span-8 ${
            !isMobileDetailOpen ? "hidden md:block" : "block"
          }`}
        >
          <ConversationTranscript
            conversationId={selectedId}
            transcript={transcript}
            isLoading={isLoadingTranscript}
            isError={isTranscriptError}
            onRetry={() => selectedId && fetchTranscript(selectedId)}
            onStatusChange={handleStatusChange}
            onBackToList={handleMobileBackToList}
          />
        </div>
      </div>
    </div>
  );
}
