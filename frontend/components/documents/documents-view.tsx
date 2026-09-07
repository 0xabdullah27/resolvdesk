"use client";

import * as React from "react";
import { toast } from "sonner";
import { DocumentUploadCard } from "@/components/documents/document-upload-card";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { DocumentTable } from "@/components/documents/document-table";
import { DocumentEmptyState } from "@/components/documents/document-empty-state";
import { DocumentPreviewSheet } from "@/components/documents/document-preview-sheet";
import { DocumentDeleteDialog } from "@/components/documents/document-delete-dialog";
import {
  listDocumentsAction,
  deleteDocumentAction,
} from "@/actions/document-actions";
import { useDashboard } from "@/hooks/use-dashboard";
import { MAX_DOCUMENTS_LIMIT } from "@/lib/validations/document";
import type { DocumentItem, DocumentStatus } from "@/types/document";
import { Button } from "@/components/ui/button";

interface DocumentsViewProps {
  initialDocuments?: DocumentItem[];
  initialTotal?: number;
}

export function DocumentsView({
  initialDocuments = [],
  initialTotal = 0,
}: DocumentsViewProps) {
  const {
    documents: cachedDocs,
    loadDocuments,
    optimisticDeleteDocument,
  } = useDashboard();

  // Lazy load on first mount if idle
  React.useEffect(() => {
    if (cachedDocs.status === "idle") {
      loadDocuments();
    }
  }, [cachedDocs.status, loadDocuments]);

  // Use cached documents if available, falling back to initial props
  const documents = cachedDocs.data ? cachedDocs.data.items : initialDocuments;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | DocumentStatus>("all");

  // Sheet Preview state
  const [previewDocId, setPreviewDocId] = React.useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // Deletion Dialog state
  const [deleteDoc, setDeleteDoc] = React.useState<DocumentItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Refresh document list
  const refreshDocuments = React.useCallback(async () => {
    await loadDocuments(true);
  }, [loadDocuments]);

  // Conditional 3-second polling while any document is in active processing
  const hasActiveProcessing = React.useMemo(() => {
    return documents.some(
      (doc) => doc.status === "uploading" || doc.status === "processing"
    );
  }, [documents]);

  React.useEffect(() => {
    if (!hasActiveProcessing) return;

    const intervalId = setInterval(() => {
      refreshDocuments();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [hasActiveProcessing, refreshDocuments]);

  // Row Preview action handler
  const handlePreview = (doc: DocumentItem) => {
    setPreviewDocId(doc.id);
    setIsPreviewOpen(true);
  };

  // Open deletion confirmation dialog
  const handleDeleteClick = (doc: DocumentItem) => {
    setDeleteDoc(doc);
    setIsDeleteDialogOpen(true);
  };

  // Confirm permanent deletion with optimistic UI update
  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;
    const docToDelete = deleteDoc;
    setIsDeleteDialogOpen(false);
    setDeleteDoc(null);
    await optimisticDeleteDocument(docToDelete.id);
  };

  // Client-side real-time search & status filtering
  const filteredDocuments = React.useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesStatus =
        statusFilter === "all" || doc.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [documents, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Permanent Upload Card with Tabs (US1) */}
      <DocumentUploadCard
        currentCount={documents.length}
        maxLimit={MAX_DOCUMENTS_LIMIT}
        onUploadSuccess={refreshDocuments}
      />

      {/* 2. Toolbar with Search, Status Filter, and Capacity Bar (US5) */}
      <DocumentToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        currentCount={documents.length}
        maxLimit={MAX_DOCUMENTS_LIMIT}
      />

      {/* 3. Document List Table or Empty State (US2) */}
      {cachedDocs.status === "loading" && !cachedDocs.data && documents.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="h-9 w-full rounded-lg bg-muted/30 animate-pulse" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 w-full rounded-lg bg-muted/20 animate-pulse" />
            ))}
          </div>
        </div>
      ) : documents.length === 0 ? (
        <DocumentEmptyState />
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center bg-card/40">
          <p className="text-sm font-medium text-foreground">
            No documents matching current filters
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search keywords or resetting the status dropdown.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <DocumentTable
          documents={filteredDocuments}
          onPreview={handlePreview}
          onDelete={handleDeleteClick}
        />
      )}

      {/* 4. Slide-over Preview Sheet (US3) */}
      <DocumentPreviewSheet
        documentId={previewDocId}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewDocId(null);
        }}
      />

      {/* 5. Permanent Deletion Confirmation Dialog (US4) */}
      <DocumentDeleteDialog
        document={deleteDoc}
        isOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeleteDoc(null);
        }}
      />
    </div>
  );
}
