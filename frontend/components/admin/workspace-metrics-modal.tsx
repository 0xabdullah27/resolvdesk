"use client";

import * as React from "react";
import {
  Building2,
  FileText,
  MessageSquare,
  LifeBuoy,
  Globe,
  Calendar,
  Lock,
} from "lucide-react";
import type { PlatformUserItem } from "@/types/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserStatusBadge } from "@/components/admin/user-status-badge";

interface WorkspaceMetricsModalProps {
  user: PlatformUserItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceMetricsModal({
  user,
  isOpen,
  onClose,
}: WorkspaceMetricsModalProps) {
  if (!user) return null;

  const formattedDate = new Date(user.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Workspace Health & Metrics</DialogTitle>
            <UserStatusBadge status={user.status} />
          </div>
          <DialogDescription>
            Account activity and resource allocation for {user.organization_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User & Organization Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/40 text-xs">
            <div>
              <span className="text-muted-foreground block">Account Owner</span>
              <span className="font-medium text-foreground">{user.full_name}</span>
              <span className="text-muted-foreground block text-[11px] truncate">
                {user.email}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block">Organization</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <Building2 className="size-3 text-muted-foreground" />
                {user.organization_name}
              </span>
              {user.website_url && (
                <a
                  href={user.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Globe className="size-3" />
                  {user.website_url}
                </a>
              )}
            </div>

            <div>
              <span className="text-muted-foreground block">Account Role</span>
              <span className="font-medium text-foreground capitalize">
                {user.role}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block">Joined On</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Resource Counters Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
              <FileText className="size-4 text-primary mx-auto" />
              <div className="text-lg font-bold font-heading text-foreground">
                {user.documents_count}
              </div>
              <div className="text-[11px] text-muted-foreground">Documents</div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
              <MessageSquare className="size-4 text-primary mx-auto" />
              <div className="text-lg font-bold font-heading text-foreground">
                {user.conversations_count}
              </div>
              <div className="text-[11px] text-muted-foreground">Conversations</div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card shadow-2xs space-y-1">
              <LifeBuoy className="size-4 text-primary mx-auto" />
              <div className="text-lg font-bold font-heading text-foreground">
                {user.tickets_count}
              </div>
              <div className="text-[11px] text-muted-foreground">Escalations</div>
            </div>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2.5">
            <Lock className="size-4 text-primary shrink-0" />
            <span>
              Customer chat message contents and private transcripts are protected by tenant privacy isolation and are never visible here.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
