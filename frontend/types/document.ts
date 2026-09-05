export type DocumentType = "pdf" | "docx" | "txt" | "md" | "raw";

export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

export interface DocumentItem {
  id: string;
  title: string;
  file_type: DocumentType;
  file_size_bytes: number;
  status: DocumentStatus;
  chunk_count: number;
  character_count: number;
  created_at: string;
}

export interface DocumentDetail extends DocumentItem {
  organization_id?: string;
  content_preview?: string | null;
  error_message?: string | null;
  updated_at?: string;
}

export interface DocumentListResponse {
  total: number;
  items: DocumentItem[];
}

export interface UploadQueueItem {
  id: string;
  file: File;
  title: string;
  size: number;
  status: "queued" | "uploading" | "success" | "error";
  progress: number;
  error?: string | null;
}

export interface DocumentFilterState {
  searchQuery: string;
  statusFilter: "all" | DocumentStatus;
}
