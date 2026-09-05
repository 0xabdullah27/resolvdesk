"use client";

import * as React from "react";
import {
  FileText,
  MoreVertical,
  Eye,
  Trash2,
  Calendar,
  Layers,
  HardDrive,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import type { DocumentItem } from "@/types/document";

interface DocumentTableProps {
  documents: DocumentItem[];
  onPreview: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
  isLoading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function DocumentTable({
  documents,
  onPreview,
  onDelete,
  isLoading = false,
}: DocumentTableProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[38%] text-xs font-semibold text-foreground">
                Document
              </TableHead>
              <TableHead className="w-[14%] text-xs font-semibold text-foreground">
                Size
              </TableHead>
              <TableHead className="w-[14%] text-xs font-semibold text-foreground">
                Chunks
              </TableHead>
              <TableHead className="w-[16%] text-xs font-semibold text-foreground">
                Ingested
              </TableHead>
              <TableHead className="w-[12%] text-xs font-semibold text-foreground">
                Status
              </TableHead>
              <TableHead className="w-[6%] text-right text-xs font-semibold text-foreground">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate" title={doc.title}>
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px] uppercase font-mono tracking-wider"
                        >
                          {doc.file_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-xs text-muted-foreground font-mono">
                  {doc.file_type === "raw" ? (
                    <span>{doc.character_count.toLocaleString()} chars</span>
                  ) : (
                    <span>{formatBytes(doc.file_size_bytes)}</span>
                  )}
                </TableCell>

                <TableCell className="text-xs text-muted-foreground font-mono">
                  {doc.chunk_count > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Layers className="size-3" />
                      {doc.chunk_count}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(doc.created_at)}
                </TableCell>

                <TableCell>
                  <DocumentStatusBadge status={doc.status} />
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <MoreVertical className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => onPreview(doc)}
                          disabled={doc.status !== "ready"}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 size-4" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(doc)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View (< 768px) */}
      <div className="block md:hidden divide-y divide-border/60">
        {documents.map((doc) => (
          <div key={doc.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate" title={doc.title}>
                    {doc.title}
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-0.5 px-1.5 py-0 text-[10px] uppercase font-mono tracking-wider"
                  >
                    {doc.file_type}
                  </Badge>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => onPreview(doc)}
                      disabled={doc.status !== "ready"}
                    >
                      <Eye className="mr-2 size-4" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(doc)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <HardDrive className="size-3 text-muted-foreground" />
                <span>
                  {doc.file_type === "raw"
                    ? `${doc.character_count.toLocaleString()} chars`
                    : formatBytes(doc.file_size_bytes)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="size-3 text-muted-foreground" />
                <span>{doc.chunk_count} chunks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3 text-muted-foreground" />
                <span>{formatDate(doc.created_at)}</span>
              </div>
              <div>
                <DocumentStatusBadge status={doc.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
