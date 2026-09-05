"use client";

import * as React from "react";
import { KeyRound, AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface WidgetRotateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isRotating: boolean;
}

export function WidgetRotateDialog({
  isOpen,
  onClose,
  onConfirm,
  isRotating,
}: WidgetRotateDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isRotating && onClose()}>
      <AlertDialogContent className="bg-card text-card-foreground border-border/80 sm:max-w-md">
        <AlertDialogHeader className="space-y-2 text-left">
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-1">
            <KeyRound className="size-5" />
          </div>
          <AlertDialogTitle className="text-base font-semibold text-foreground">
            Rotate Public Widget Key?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <span className="block">
              Rotating your widget key generates a new unique key and immediately updates your embed script snippet.
            </span>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="size-3.5 shrink-0" />
                24-Hour Dual-Key Grace Period Active
              </div>
              <p className="leading-normal">
                Your existing key will remain valid for exactly 24 hours to prevent downtime on active storefronts while you update your embed code.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <AlertDialogCancel disabled={isRotating} onClick={onClose} className="mt-0">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            size="sm"
            disabled={isRotating}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
          >
            {isRotating ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Rotating Key...
              </>
            ) : (
              "Confirm & Rotate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
