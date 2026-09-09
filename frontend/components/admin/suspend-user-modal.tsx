"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
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

interface SuspendUserModalProps {
  user: PlatformUserItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    userId: string,
    newStatus: "active" | "suspended",
    reason?: string
  ) => Promise<void>;
}

export function SuspendUserModal({
  user,
  isOpen,
  onClose,
  onConfirm,
}: SuspendUserModalProps) {
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!user) return null;

  const isSuspending = user.status === "active";
  const targetStatus = isSuspending ? "suspended" : "active";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(user.id, targetStatus, reason.trim() || undefined);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${
                  isSuspending
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {isSuspending ? (
                  <ShieldAlert className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
              </div>
              <div>
                <DialogTitle>
                  {isSuspending ? "Suspend Account" : "Reactivate Account"}
                </DialogTitle>
                <DialogDescription>
                  {user.full_name} ({user.email})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isSuspending ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex gap-2.5 items-start">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Immediate Consequences:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-muted-foreground">
                    <li>Owner dashboard access will be immediately blocked.</li>
                    <li>Active sessions will be rejected.</li>
                    <li>Deployed chat widgets will transition to an offline state.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="suspend-reason"
                  className="text-xs font-medium text-foreground"
                >
                  Audit Reason (Optional)
                </label>
                <textarea
                  id="suspend-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Investigation of suspicious token drain or policy violation"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Reactivating this account will immediately restore full dashboard access and re-enable their customer chat widget.
              </p>
              <div className="space-y-1.5">
                <label
                  htmlFor="reactivate-reason"
                  className="text-xs font-medium text-foreground"
                >
                  Audit Reason (Optional)
                </label>
                <textarea
                  id="reactivate-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Resolved after merchant verification"
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={handleClose}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isSuspending ? "destructive" : "default"}
              size="sm"
              disabled={isSubmitting}
              className="cursor-pointer gap-1.5"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isSuspending ? "Confirm Suspension" : "Reactivate Account"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
