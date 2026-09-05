"use server";

import { revalidatePath } from "next/cache";
import { backendFetch, BackendApiError } from "@/lib/backend-api";
import {
  rawDocumentSchema,
  validateFile,
  type RawDocumentFormValues,
} from "@/lib/validations/document";
import type {
  DocumentItem,
  DocumentDetail,
  DocumentListResponse,
} from "@/types/document";

/**
 * Maps BackendApiError status codes to human-readable error messages
 */
function parseErrorMessage(err: unknown, fallbackMessage: string): string {
  if (err instanceof BackendApiError) {
    if (typeof err.data === "object" && err.data !== null && "detail" in err.data) {
      const detail = (err.data as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
    switch (err.status) {
      case 400:
        return "Knowledge base capacity limit reached (maximum 50 documents).";
      case 401:
        return "Your session has expired. Please log in again.";
      case 404:
        return "The requested document was not found.";
      case 409:
        return "A document with this filename already exists in your knowledge base. Please delete the existing file or rename this one.";
      case 413:
        return "File is too large. Maximum supported size is 10 MB.";
      case 415:
        return "Unsupported file type. Please upload a .pdf, .docx, .txt, or .md file.";
      case 422:
        return "Document contains no readable text or character limit was exceeded.";
      case 500:
        return "Internal server error during document processing. Please try again.";
      default:
        return err.message || fallbackMessage;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallbackMessage;
}

/**
 * Lists all documents belonging to the authenticated owner's organization
 */
export async function listDocumentsAction(): Promise<{
  success: boolean;
  data?: DocumentListResponse;
  error?: string;
}> {
  try {
    const data = await backendFetch<DocumentListResponse>(
      "api/v1/documents?limit=50",
      {
        requireAuth: true,
        cache: "no-store",
      }
    );
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to load documents."),
    };
  }
}

/**
 * Retrieves full document details and the 500-character plain text preview
 */
export async function getDocumentDetailsAction(
  documentId: string
): Promise<{
  success: boolean;
  data?: DocumentDetail;
  error?: string;
}> {
  try {
    const data = await backendFetch<DocumentDetail>(
      `api/v1/documents/${documentId}`,
      {
        requireAuth: true,
        cache: "no-store",
      }
    );
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to retrieve document details."),
    };
  }
}

/**
 * Uploads a document file (.pdf, .docx, .txt, .md) and triggers background ingestion
 */
export async function uploadDocumentAction(
  formData: FormData
): Promise<{
  success: boolean;
  data?: DocumentDetail;
  error?: string;
}> {
  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file was provided for upload." };
  }

  const clientValidation = validateFile(file);
  if (!clientValidation.valid) {
    return { success: false, error: clientValidation.error };
  }

  try {
    const data = await backendFetch<DocumentDetail>("api/v1/documents/upload", {
      method: "POST",
      body: formData,
      requireAuth: true,
    });

    revalidatePath("/dashboard/documents");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to upload document."),
    };
  }
}

/**
 * Ingests a manual raw text snippet (title + content) directly into the knowledge base
 */
export async function createRawDocumentAction(
  values: RawDocumentFormValues
): Promise<{
  success: boolean;
  data?: DocumentDetail;
  error?: string;
}> {
  const parseResult = rawDocumentSchema.safeParse(values);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Validation failed.",
    };
  }

  try {
    const data = await backendFetch<DocumentDetail>("api/v1/documents/raw", {
      method: "POST",
      body: JSON.stringify(parseResult.data),
      requireAuth: true,
    });

    revalidatePath("/dashboard/documents");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to ingest text snippet."),
    };
  }
}

/**
 * Atomically deletes a document from PostgreSQL and purges its vector embeddings from Qdrant
 */
export async function deleteDocumentAction(
  documentId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await backendFetch(`api/v1/documents/${documentId}`, {
      method: "DELETE",
      requireAuth: true,
    });

    revalidatePath("/dashboard/documents");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: parseErrorMessage(err, "Failed to delete document."),
    };
  }
}
