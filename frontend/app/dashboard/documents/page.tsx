import * as React from "react";
import type { Metadata } from "next";
import { listDocumentsAction } from "@/actions/document-actions";
import { DocumentsView } from "@/components/documents/documents-view";

export const metadata: Metadata = {
  title: "Knowledge Base - ResolvDesk",
  description: "Manage grounded support documents, catalogs, and FAQs.",
};

export default async function DocumentsPage() {
  const result = await listDocumentsAction();
  const initialDocuments = result.success && result.data ? result.data.items : [];
  const initialTotal = result.success && result.data ? result.data.total : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Knowledge Base
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload store policies, pricing catalogs, and FAQs to ground your AI assistant with zero hallucinations.
        </p>
      </div>

      <DocumentsView
        initialDocuments={initialDocuments}
        initialTotal={initialTotal}
      />
    </div>
  );
}
