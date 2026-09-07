"use client";

import * as React from "react";
import { Bot, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetPreviewBubbleProps {
  isOpen: boolean;
  onToggle: () => void;
  primaryColor: string;
  className?: string;
}

export function WidgetPreviewBubble({
  isOpen,
  onToggle,
  primaryColor,
  className,
}: WidgetPreviewBubbleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative flex size-13 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      style={{ backgroundColor: primaryColor }}
      aria-label={isOpen ? "Close preview chat" : "Open preview chat"}
    >
      <span className="sr-only">{isOpen ? "Close chat preview" : "Open chat preview"}</span>
      {isOpen ? (
        <X className="size-6 text-white stroke-[2.5] transition-transform duration-200 rotate-0" />
      ) : (
        <Bot className="size-6 text-white stroke-[2.2] transition-transform duration-200" />
      )}
    </button>
  );
}
