import * as React from "react";
import type { Metadata } from "next";
import { FileText, Upload, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Knowledge Base - ResolvDesk",
  description: "Manage grounded support documents and FAQs.",
};

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Knowledge Base
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload policies, FAQs, and product catalogs to train your AI support assistant.
          </p>
        </div>
        <Button disabled title="Document upload flow implemented in Feature 006">
          <Plus className="mr-2 size-4" />
          Add Document (Upcoming)
        </Button>
      </div>

      <Card className="border-dashed border-2 border-border/80 bg-card/40">
        <CardHeader className="text-center py-12">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Upload className="size-6" />
          </div>
          <CardTitle className="text-lg font-semibold">
            No Documents Ingested Yet
          </CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Grounding documents ensure your assistant answers questions with 100% precision. Document uploading, chunking, and Qdrant vector indexing will be active in Feature 006.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
