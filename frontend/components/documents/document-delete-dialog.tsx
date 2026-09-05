"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import type { DocumentItem } from "@/types/document";

interface DocumentDeleteDialogProps {
  document: DocumentItem | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DocumentDeleteDialog({
  document,
  isOpen,
  isDeleting,
  onConfirm,
  onClose,
}: DocumentDeleteDialogProps) {
  if (!document) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <AlertDialogContent className="bg-card text-card-foreground border-border/80 sm:max-w-md">
        <AlertDialogHeader className="space-y-2 text-left">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-1">
            <AlertTriangle className="size-5" />
          </div>
          <AlertDialogTitle className="text-base font-semibold text-foreground">
            Permanently delete "{document.title}"?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            This action will permanently delete this document from your database and purge all associated vector embeddings from Qdrant. The AI support assistant will immediately lose the ability to reference this knowledge. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <AlertDialogCancel
            disabled={isDeleting}
            onClick={onClose}
            className="mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Document"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
