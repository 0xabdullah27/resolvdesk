"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
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

interface WidgetResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function WidgetResetDialog({
  isOpen,
  onClose,
  onConfirm,
}: WidgetResetDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-card text-card-foreground border-border/80 sm:max-w-md">
        <AlertDialogHeader className="space-y-2 text-left">
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-1">
            <RotateCcw className="size-5" />
          </div>
          <AlertDialogTitle className="text-base font-semibold text-foreground">
            Reset to factory defaults?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
            <span>
              This will revert your widget customization fields back to the platform defaults:
            </span>
            <ul className="list-disc list-inside space-y-1 pl-1 pt-1 font-mono text-[11px]">
              <li>Bot Name: Support Assistant</li>
              <li>Greeting: Hi! How can I help you today?</li>
              <li>Brand Color: #4F46E5 (Indigo)</li>
              <li>Placement: Bottom Right</li>
              <li>Allowed Domains: All websites (*)</li>
            </ul>
            <span className="block pt-1">
              You will still need to click &quot;Save Changes&quot; to apply these defaults to your live widget.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <AlertDialogCancel onClick={onClose} className="mt-0">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
              onClose();
            }}
          >
            Reset Form
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
