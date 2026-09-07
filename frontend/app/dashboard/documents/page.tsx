import * as React from "react";
import type { Metadata } from "next";
import { DocumentsView } from "@/components/documents/documents-view";

export const metadata: Metadata = {
  title: "Knowledge Base - ResolvDesk",
  description: "Manage grounded support documents, catalogs, and FAQs.",
};

export default function DocumentsPage() {
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

      <DocumentsView />
    </div>
  );
}
