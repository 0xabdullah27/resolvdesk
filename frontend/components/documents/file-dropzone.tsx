"use client";

import * as React from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { validateFile, ALLOWED_EXTENSIONS } from "@/lib/validations/document";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  disabled = false,
  isUploading = false,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const processFileList = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled || isUploading) return;

    const files = Array.from(fileList);
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`"${file.name}": ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    processFileList(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFileList(e.target.files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (!disabled && !isUploading && inputRef.current) {
          inputRef.current.click();
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
        "border-border/80 bg-card/50 hover:border-primary/50 hover:bg-muted/30",
        isDragOver && "border-primary bg-primary/5 ring-2 ring-primary/20",
        (disabled || isUploading) && "cursor-not-allowed opacity-60 hover:border-border/80 hover:bg-card/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(",")}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
        <Upload className="size-6" />
      </div>

      <h3 className="mt-3 text-base font-medium text-foreground">
        {isUploading
          ? "Processing upload queue..."
          : disabled
            ? "Document capacity limit reached (50/50)"
            : "Drop business documents here or click to browse"}
      </h3>

      <p className="mt-1 text-xs text-muted-foreground">
        Supports PDF, DOCX, TXT, and Markdown (.md) up to 10 MB per file
      </p>

      {disabled && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
          <AlertCircle className="size-3.5" />
          <span>Maximum 50 documents reached. Please delete old documents to upload new ones.</span>
        </div>
      )}
    </div>
  );
}
