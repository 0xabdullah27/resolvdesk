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
    transcripts: cachedTranscripts,
    selectedConversationId,
    loadConversations,
    loadTranscript,
    setSelectedConversationId,
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

  // URL-driven or Provider-cached selected ID
  const urlSelectedId = searchParams.get("id") || initialSelectedId || null;
  const initialEffectiveId =
    urlSelectedId ||
    selectedConversationId ||
    (cachedConversations.data?.items[0]?.id) ||
    (initialConversations[0]?.id) ||
    null;

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
  const [selectedId, setSelectedId] = React.useState<string | null>(initialEffectiveId);

  // Filters & Pagination
  const [activeFilter, setActiveFilter] = React.useState<InboxFilterTab>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // In-memory cache for filter tabs ("all" vs "escalated") to avoid redundant network requests on tab switch
  const filterCacheRef = React.useRef<Partial<Record<InboxFilterTab, { items: ConversationSummary[]; total: number }>>>({
    all: cachedConversations.data
      ? { items: cachedConversations.data.items, total: cachedConversations.data.total }
      : initialConversations.length > 0
      ? { items: initialConversations, total: initialTotal }
      : undefined,
  });

  // Keep local list in sync with cache updates (e.g. from refreshAll or lazy load)
  React.useEffect(() => {
    if (cachedConversations.data) {
      filterCacheRef.current["all"] = {
        items: cachedConversations.data.items,
        total: cachedConversations.data.total,
      };
      if (activeFilter === "all" && currentPage === 1 && !searchQuery) {
        setConversations(cachedConversations.data.items);
        setTotalCount(cachedConversations.data.total);
      }
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
  const [transcript, setTranscript] = React.useState<ConversationDetail | null>(
    (initialEffectiveId && cachedTranscripts[initialEffectiveId]) || null
  );
  const [isLoadingTranscript, setIsLoadingTranscript] = React.useState<boolean>(
    Boolean(initialEffectiveId && !cachedTranscripts[initialEffectiveId])
  );
  const [isTranscriptError, setIsTranscriptError] = React.useState<boolean>(false);

  // Mobile Drill-down view state
  const [isMobileDetailOpen, setIsMobileDetailOpen] = React.useState<boolean>(Boolean(initialEffectiveId));

  // Sync selectedId with URL & DashboardProvider cache without triggering full Next.js server re-renders
  const updateSelectedIdInUrl = React.useCallback(
    (newId: string | null) => {
      setSelectedId(newId);
      setSelectedConversationId(newId);

      // Instant synchronous render if transcript is already cached
      if (newId && cachedTranscripts[newId]) {
        setTranscript(cachedTranscripts[newId]);
        setIsLoadingTranscript(false);
        setIsTranscriptError(false);
      }

      if (newId) {
        setIsMobileDetailOpen(true);
      } else {
        setIsMobileDetailOpen(false);
      }

      // Update URL quietly without triggering Next.js RSC re-fetch
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (newId) {
          url.searchParams.set("id", newId);
        } else {
          url.searchParams.delete("id");
        }
        window.history.replaceState(null, "", url.toString());
      }
    },
    [cachedTranscripts, setSelectedConversationId]
  );

  // Auto-select first conversation on desktop if none is selected
  React.useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        updateSelectedIdInUrl(conversations[0].id);
      }
    }
  }, [conversations, selectedId, updateSelectedIdInUrl]);

  // Synchronize transcript with cache & fetch if not yet in cache
  React.useEffect(() => {
    if (!selectedId) {
      setTranscript(null);
      setIsLoadingTranscript(false);
      setIsTranscriptError(false);
      return;
    }

    // 1. If already cached, instant synchronous render!
    if (cachedTranscripts[selectedId]) {
      setTranscript(cachedTranscripts[selectedId]);
      setIsLoadingTranscript(false);
      setIsTranscriptError(false);
      return;
    }

    // 2. Not cached yet: fetch once and store in cache
    let isCancelled = false;
    setIsLoadingTranscript(true);
    setIsTranscriptError(false);

    loadTranscript(selectedId)
      .then((data) => {
        if (!isCancelled) {
          if (data) {
            setTranscript(data);
          } else {
            setIsTranscriptError(true);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("Failed to load transcript:", err);
          setIsTranscriptError(true);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingTranscript(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedId, cachedTranscripts, loadTranscript]);

  const handleRetryTranscript = React.useCallback(async () => {
    if (!selectedId) return;
    setIsLoadingTranscript(true);
    setIsTranscriptError(false);
    try {
      const data = await loadTranscript(selectedId, true);
      if (data) {
        setTranscript(data);
      } else {
        setIsTranscriptError(true);
      }
    } catch {
      setIsTranscriptError(true);
    } finally {
      setIsLoadingTranscript(false);
    }
  }, [selectedId, loadTranscript]);

  // Fetch list on filter or page change with in-memory cache to avoid refetching on tab switch
  const fetchConversationsList = React.useCallback(
    async (page: number, filter: InboxFilterTab, force: boolean = false) => {
      // Use cached data on page 1 when switching tabs unless explicit force refresh
      if (!force && page === 1 && filterCacheRef.current[filter]) {
        const cached = filterCacheRef.current[filter]!;
        setConversations(cached.items);
        setTotalCount(cached.total);
        return;
      }

      try {
        setIsLoadingList(true);
        const offset = (page - 1) * PAGE_SIZE;
        const isEscalatedParam = filter === "escalated" ? true : undefined;
        const res = await listConversationsAction(PAGE_SIZE, offset, isEscalatedParam);

        if (res.success && res.data) {
          setConversations(res.data.items);
          setTotalCount(res.data.total);
          if (page === 1) {
            filterCacheRef.current[filter] = {
              items: res.data.items,
              total: res.data.total,
            };
          }
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
    fetchConversationsList(1, newFilter, false);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchConversationsList(newPage, activeFilter, true);
  };

  // Manual Refresh: fetches fresh data from backend and updates cache
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Invalidate filter cache so fresh data is loaded
      filterCacheRef.current = {};
      const isEscalatedParam = activeFilter === "escalated" ? true : undefined;
      const offset = (currentPage - 1) * PAGE_SIZE;

      const [listRes, statsRes] = await Promise.all([
        listConversationsAction(PAGE_SIZE, offset, isEscalatedParam),
        getConversationStatsAction(),
      ]);

      if (listRes.success && listRes.data) {
        setConversations(listRes.data.items);
        setTotalCount(listRes.data.total);
        if (currentPage === 1) {
          filterCacheRef.current[activeFilter] = {
            items: listRes.data.items,
            total: listRes.data.total,
          };
        }
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (selectedId) {
        const refreshed = await loadTranscript(selectedId, true);
        if (refreshed) {
          setTranscript(refreshed);
        }
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

    // Also update in-memory tab caches
    Object.keys(filterCacheRef.current).forEach((key) => {
      const tab = key as InboxFilterTab;
      if (filterCacheRef.current[tab]) {
        filterCacheRef.current[tab] = {
          ...filterCacheRef.current[tab]!,
          items: filterCacheRef.current[tab]!.items.map((c) =>
            c.id === selectedId ? { ...c, ticket_status: newStatus } : c
          ),
        };
      }
    });

    // 2. Persist via DashboardProvider optimistic mutation (synchronizes KPIs and handles toast/rollback)
    const success = await optimisticUpdateTicketStatus(selectedId, newStatus);
    if (!success) {
      // Rollback local state on failure
      setTranscript((prev) => (prev ? { ...prev, ticket_status: previousStatus } : null));
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, ticket_status: previousStatus } : c))
      );
      Object.keys(filterCacheRef.current).forEach((key) => {
        const tab = key as InboxFilterTab;
        if (filterCacheRef.current[tab]) {
          filterCacheRef.current[tab] = {
            ...filterCacheRef.current[tab]!,
            items: filterCacheRef.current[tab]!.items.map((c) =>
              c.id === selectedId ? { ...c, ticket_status: previousStatus } : c
            ),
          };
        }
      });
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
            onRetry={handleRetryTranscript}
            onStatusChange={handleStatusChange}
            onBackToList={handleMobileBackToList}
          />
        </div>
      </div>
    </div>
  );
}
