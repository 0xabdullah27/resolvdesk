"use client";

import * as React from "react";
import {
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  FileText,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { PlatformUserItem, PlatformUserListResponse } from "@/types/admin";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { SuspendUserModal } from "@/components/admin/suspend-user-modal";
import { WorkspaceMetricsModal } from "@/components/admin/workspace-metrics-modal";

interface UserDirectoryTableProps {
  initialData: PlatformUserListResponse;
}

export function UserDirectoryTable({ initialData }: UserDirectoryTableProps) {
  const [data, setData] = React.useState<PlatformUserListResponse>(initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(initialData.page || 1);
  const [isLoading, setIsLoading] = React.useState(false);

  // Modals state
  const [selectedUserForStatus, setSelectedUserForStatus] =
    React.useState<PlatformUserItem | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);

  const [selectedUserForMetrics, setSelectedUserForMetrics] =
    React.useState<PlatformUserItem | null>(null);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = React.useState(false);

  // Fetch updated list with debounce
  const fetchUsers = React.useCallback(
    async (search: string, status: string, page: number) => {
      setIsLoading(true);
      try {
        const response = await adminApi.listUsers({
          search: search.trim() || undefined,
          status: status !== "all" ? status : undefined,
          page,
          pageSize: 20,
        });
        setData(response);
      } catch (err) {
        console.error("Failed to load users directory:", err);
        toast.error("Failed to update user directory.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchTerm, statusFilter, currentPage);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, currentPage, fetchUsers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleOpenStatusModal = (user: PlatformUserItem) => {
    if (user.role === "superadmin" && user.status === "active") {
      toast.error("Platform creator accounts cannot be suspended.");
      return;
    }
    setSelectedUserForStatus(user);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusUpdate = async (
    userId: string,
    newStatus: "active" | "suspended",
    reason?: string
  ) => {
    try {
      const updatedUser = await adminApi.updateUserStatus(userId, {
        status: newStatus,
        reason,
      });

      // Update local state smoothly
      setData((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === userId ? { ...item, status: updatedUser.status } : item
        ),
      }));

      toast.success(
        newStatus === "suspended"
          ? `Account for ${updatedUser.full_name} has been suspended.`
          : `Account for ${updatedUser.full_name} has been reactivated.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update account status.";
      toast.error(msg);
      throw err;
    }
  };

  const handleOpenMetricsModal = (user: PlatformUserItem) => {
    setSelectedUserForMetrics(user);
    setIsMetricsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by name, email, or organization..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border bg-card text-xs">
            <Filter className="size-3.5 text-muted-foreground ml-1" />
            <button
              type="button"
              onClick={() => handleStatusChange("all")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({data.total})
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("active")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                statusFilter === "active"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("suspended")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                statusFilter === "suspended"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-2xs">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="p-3.5 pl-4">Account Owner</th>
                <th className="p-3.5">Organization</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Docs</th>
                <th className="p-3.5 text-center">Chats</th>
                <th className="p-3.5">Joined</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="size-6 text-muted-foreground/60" />
                      <p className="font-medium text-foreground">No accounts found</p>
                      <p className="text-xs">
                        Try clearing search terms or changing status filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((user) => {
                  const isSuperadmin = user.role === "superadmin";
                  const createdDate = new Date(user.created_at).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", year: "numeric" }
                  );

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Owner info */}
                      <td className="p-3.5 pl-4">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <span>{user.full_name}</span>
                          {isSuperadmin && (
                            <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground truncate max-w-[200px]">
                          {user.email}
                        </div>
                      </td>

                      {/* Organization info */}
                      <td className="p-3.5">
                        <div className="font-medium text-foreground flex items-center gap-1">
                          <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {user.organization_name}
                          </span>
                        </div>
                        {user.website_url && (
                          <span className="text-[11px] text-muted-foreground truncate block max-w-[180px]">
                            {user.website_url.replace(/^https?:\/\//, "")}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <UserStatusBadge status={user.status} />
                      </td>

                      {/* Resource count: Docs */}
                      <td className="p-3.5 text-center font-mono">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3 text-muted-foreground" />
                          {user.documents_count}
                        </span>
                      </td>

                      {/* Resource count: Chats */}
                      <td className="p-3.5 text-center font-mono">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="size-3 text-muted-foreground" />
                          {user.conversations_count}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {createdDate}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Workspace Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenMetricsModal(user)}
                            className="h-7 px-2 text-xs gap-1 cursor-pointer"
                            title="Inspect workspace health"
                          >
                            <Eye className="size-3.5" />
                            <span className="hidden md:inline">Inspect</span>
                          </Button>

                          {/* Suspend / Reactivate Button */}
                          {user.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSuperadmin}
                              onClick={() => handleOpenStatusModal(user)}
                              className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer disabled:opacity-40"
                              title={
                                isSuperadmin
                                  ? "Creator account cannot be suspended"
                                  : "Suspend account access"
                              }
                            >
                              <ShieldAlert className="size-3.5" />
                              <span className="hidden md:inline">Suspend</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStatusModal(user)}
                              className="h-7 px-2 text-xs gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30 cursor-pointer"
                              title="Reactivate account access"
                            >
                              <ShieldCheck className="size-3.5" />
                              <span className="hidden md:inline">Reactivate</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div>
              Showing page <span className="font-medium text-foreground">{data.page}</span>{" "}
              of <span className="font-medium text-foreground">{data.total_pages}</span> (
              {data.total} total accounts)
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
                <span className="sr-only sm:not-sr-only">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.total_pages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-7 px-2 cursor-pointer"
              >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SuspendUserModal
        user={selectedUserForStatus}
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedUserForStatus(null);
        }}
        onConfirm={handleConfirmStatusUpdate}
      />

      <WorkspaceMetricsModal
        user={selectedUserForMetrics}
        isOpen={isMetricsModalOpen}
        onClose={() => {
          setIsMetricsModalOpen(false);
          setSelectedUserForMetrics(null);
        }}
      />
    </div>
  );
}
