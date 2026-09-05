"use client";

import * as React from "react";
import { FileUp, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function DocumentEmptyState() {
  return (
    <Card className="border-dashed border-2 border-border/80 bg-card/40">
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <FileUp className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          No Documents Ingested Yet
        </h3>
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
          Upload your business FAQs, return policies, or catalogs using the card above.
          Once processed, your AI support assistant will answer customer questions with 100% factual accuracy.
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary">
          <ShieldCheck className="size-4" />
          <span>Zero Hallucination Guaranteed</span>
        </div>
      </CardContent>
    </Card>
  );
}
