"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ConversationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Conversations route error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/40 bg-card shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
            <AlertCircle className="size-6" />
          </div>
          <CardTitle className="text-xl font-semibold text-foreground">
            Failed to load conversations
          </CardTitle>
          <CardDescription>
            We encountered an unexpected error while retrieving your conversation logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground font-mono break-words">
            {error.message || "An unexpected network or server error occurred."}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => reset()} className="cursor-pointer">
            <RotateCcw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
