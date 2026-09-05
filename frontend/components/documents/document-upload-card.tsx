"use client";

import * as React from "react";
import { Upload, Edit3, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDropzone } from "@/components/documents/file-dropzone";
import { ManualEntryForm } from "@/components/documents/manual-entry-form";
import { UploadQueue } from "@/components/documents/upload-queue";
import { uploadDocumentAction } from "@/actions/document-actions";
import type { UploadQueueItem } from "@/types/document";

interface DocumentUploadCardProps {
  currentCount: number;
  maxLimit: number;
  onUploadSuccess: () => void;
}

export function DocumentUploadCard({
  currentCount,
  maxLimit,
  onUploadSuccess,
}: DocumentUploadCardProps) {
  const [queue, setQueue] = React.useState<UploadQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = React.useState(false);

  const isLimitReached = currentCount >= maxLimit;

  const handleFilesSelected = (files: File[]) => {
    const remainingSlots = Math.max(0, maxLimit - currentCount);
    if (remainingSlots <= 0) {
      toast.error(`Knowledge base limit reached (${maxLimit} documents max).`);
      return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);
    if (acceptedFiles.length < files.length) {
      toast.warning(
        `Only ${remainingSlots} document slot${remainingSlots > 1 ? "s" : ""} available. Truncating batch.`
      );
    }

    const newQueueItems: UploadQueueItem[] = acceptedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      title: file.name,
      size: file.size,
      status: "queued",
      progress: 0,
    }));

    setQueue((prev) => [...prev, ...newQueueItems]);
  };

  // Sequential queue processor
  React.useEffect(() => {
    if (isProcessingQueue) return;

    const nextItem = queue.find((item) => item.status === "queued");
    if (!nextItem) return;

    const processNext = async () => {
      setIsProcessingQueue(true);

      // Set item uploading
      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: "uploading", progress: 30 }
            : item
        )
      );

      const formData = new FormData();
      formData.append("file", nextItem.file);
      formData.append("title", nextItem.title);

      try {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === nextItem.id ? { ...item, progress: 65 } : item
          )
        );

        const res = await uploadDocumentAction(formData);

        if (res.success) {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === nextItem.id
                ? { ...item, status: "success", progress: 100 }
                : item
            )
          );
          onUploadSuccess();
        } else {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === nextItem.id
                ? {
                    ...item,
                    status: "error",
                    progress: 100,
                    error: res.error || "Upload rejected.",
                  }
                : item
            )
          );
          toast.error(`"${nextItem.title}": ${res.error || "Upload failed."}`);
        }
      } catch (err) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: "error",
                  progress: 100,
                  error: "Network error during upload.",
                }
              : item
          )
        );
        toast.error(`"${nextItem.title}": Network error during upload.`);
      } finally {
        setIsProcessingQueue(false);
      }
    };

    processNext();
  }, [queue, isProcessingQueue, onUploadSuccess]);

  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              Add Knowledge to Assistant
            </CardTitle>
            <CardDescription>
              Upload policy documents or submit plain text FAQs to train the AI customer support agent.
            </CardDescription>
          </div>
          {isLimitReached && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 px-2.5 py-1 rounded-md">
              <AlertCircle className="size-3.5" />
              Capacity Full (50/50)
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="file-upload" className="w-full">
          <TabsList className="mb-4 bg-muted/60">
            <TabsTrigger value="file-upload" className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText className="size-4" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="manual-entry" className="flex items-center gap-2 text-xs sm:text-sm">
              <Edit3 className="size-4" />
              Manual Text / FAQ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file-upload" className="mt-0 focus-visible:outline-none">
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              disabled={isLimitReached}
              isUploading={isProcessingQueue}
            />
            <UploadQueue queue={queue} onDismiss={() => setQueue([])} />
          </TabsContent>

          <TabsContent value="manual-entry" className="mt-0 focus-visible:outline-none">
            <ManualEntryForm onSuccess={onUploadSuccess} disabled={isLimitReached} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
