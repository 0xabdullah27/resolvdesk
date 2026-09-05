"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Documents page error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border-destructive/30 bg-card text-card-foreground shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
            <AlertCircle className="size-6" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">
            Failed to Load Knowledge Base
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {error.message || "An unexpected error occurred while fetching your organization's documents."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-4">
          <Button onClick={() => reset()} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="size-3.5" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
