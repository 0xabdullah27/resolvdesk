"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PlusCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  rawDocumentSchema,
  type RawDocumentFormValues,
} from "@/lib/validations/document";
import { createRawDocumentAction } from "@/actions/document-actions";

interface ManualEntryFormProps {
  onSuccess: () => void;
  disabled?: boolean;
}

export function ManualEntryForm({ onSuccess, disabled = false }: ManualEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RawDocumentFormValues>({
    resolver: zodResolver(rawDocumentSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const contentValue = watch("content") || "";
  const charCount = contentValue.length;

  const onSubmit = async (values: RawDocumentFormValues) => {
    if (disabled) return;
    setIsSubmitting(true);
    try {
      const res = await createRawDocumentAction(values);
      if (res.success) {
        toast.success(`"${values.title}" queued for knowledge base indexing.`);
        reset();
        onSuccess();
      } else {
        toast.error(res.error || "Failed to ingest text snippet.");
      }
    } catch {
      toast.error("An unexpected error occurred while saving the note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="manual-doc-title" className="text-sm font-medium text-foreground">
          Document Title / Topic
        </Label>
        <Input
          id="manual-doc-title"
          placeholder="e.g. Store Return Policy & Warranty Terms"
          disabled={isSubmitting || disabled}
          {...register("title")}
          className="bg-background/80"
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="manual-doc-content" className="text-sm font-medium text-foreground">
            Knowledge Content / FAQ Text
          </Label>
          <span className="text-xs font-mono text-muted-foreground">
            {charCount.toLocaleString()} / 100,000 characters
          </span>
        </div>
        <Textarea
          id="manual-doc-content"
          placeholder="Paste or write store policies, product catalogs, FAQ questions and answers, service pricing, etc."
          rows={6}
          disabled={isSubmitting || disabled}
          {...register("content")}
          className="resize-y font-sans text-sm bg-background/80"
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="size-3.5" />
          <span>Text will be partitioned into overlapping semantic chunks and indexed into Qdrant.</span>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || disabled || charCount === 0}
          className="min-w-32"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Ingesting...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 size-4" />
              Ingest Text
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
