"use client";

import * as React from "react";
import {
  FileText,
  Calendar,
  Layers,
  HardDrive,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { getDocumentDetailsAction } from "@/actions/document-actions";
import type { DocumentDetail } from "@/types/document";

interface DocumentPreviewSheetProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function DocumentPreviewSheet({
  documentId,
  isOpen,
  onClose,
}: DocumentPreviewSheetProps) {
  const [detail, setDetail] = React.useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !documentId) {
      setDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await getDocumentDetailsAction(documentId);
        if (res.success && res.data) {
          setDetail(res.data);
        } else {
          toast.error(res.error || "Failed to load document preview.");
        }
      } catch {
        toast.error("An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, documentId]);

  const handleCopy = () => {
    if (!detail?.content_preview) return;
    navigator.clipboard.writeText(detail.content_preview);
    setIsCopied(true);
    toast.success("Preview snippet copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden bg-card text-foreground"
      >
        <SheetHeader className="p-6 border-b border-border/70 space-y-1 text-left">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase text-[10px] font-mono">
              {detail?.file_type || "DOCUMENT"}
            </Badge>
            {detail && <DocumentStatusBadge status={detail.status} />}
          </div>
          <SheetTitle className="text-base font-semibold truncate pt-1 text-foreground" title={detail?.title}>
            {detail?.title || "Document Inspection"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Metadata metrics and extracted text snippet used for vector search.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">Loading document inspection data...</p>
            </div>
          ) : detail ? (
            <>
              {/* Metadata Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HardDrive className="size-3.5" />
                    <span>File Size</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground font-mono">
                    {detail.file_type === "raw"
                      ? `${detail.character_count.toLocaleString()} chars`
                      : formatBytes(detail.file_size_bytes)}
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers className="size-3.5" />
                    <span>Vector Chunks</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground font-mono">
                    {detail.chunk_count} chunks
                  </p>
                </div>

                <div className="col-span-2 rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <span>Ingestion Timestamp</span>
                  </div>
                  <p className="text-xs font-mono text-foreground">
                    {formatDate(detail.created_at)}
                  </p>
                </div>
              </div>

              {/* Error Callout if Failed */}
              {detail.error_message && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium text-xs">
                    <AlertCircle className="size-4" />
                    <span>Processing Failure Reason</span>
                  </div>
                  <p className="text-xs text-destructive/90 leading-relaxed">
                    {detail.error_message}
                  </p>
                </div>
              )}

              {/* Extracted Text Snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-primary" />
                    Extracted Text Preview (First 500 characters)
                  </span>
                  {detail.content_preview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isCopied ? (
                        <>
                          <Check className="mr-1.5 size-3.5 text-primary" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 size-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/40 p-4 font-mono text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {detail.content_preview || (
                    <span className="text-muted-foreground italic">
                      No text preview available for this document.
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Document details could not be loaded.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
