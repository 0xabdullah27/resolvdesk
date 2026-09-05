import { z } from "zod";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;
export const MAX_DOCUMENTS_LIMIT = 50;

export const rawDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(100_000, "Content cannot exceed 100,000 characters"),
});

export type RawDocumentFormValues = z.infer<typeof rawDocumentSchema>;

/**
 * Validates a single File object against allowed extensions and size limits
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file || file.size === 0) {
    return { valid: false, error: "File is empty or corrupted (0 bytes)." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 10 MB limit.`,
    };
  }

  const filename = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: `Unsupported file format. Allowed formats: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return { valid: true };
}
