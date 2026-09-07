"use client";

import * as React from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetPreviewWindowProps {
  botName: string;
  greeting: string;
  primaryColor: string;
  onClose: () => void;
  className?: string;
}

export function WidgetPreviewWindow({
  botName,
  greeting,
  primaryColor,
  onClose,
  className,
}: WidgetPreviewWindowProps) {
  const displayTitle = botName.trim() || "Support Assistant";
  const displayGreeting = greeting.trim() || "Hi! How can I help you today?";

  return (
    <div
      className={cn(
        "flex flex-col w-[290px] sm:w-[320px] h-[390px] rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200",
        className
      )}
    >
      {/* 1. Header with dynamic brand background */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white transition-colors duration-150"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs text-white">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate leading-tight drop-shadow-xs">
              {displayTitle}
            </h4>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/85 font-medium leading-none">
                Online &bull; Instant AI
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors focus-visible:outline-none"
          aria-label="Close chat window"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* 2. Message History Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        <div className="flex justify-center">
          <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Today
          </span>
        </div>

        {/* Assistant Greeting Bubble */}
        <div className="flex items-start gap-2 max-w-[90%]">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-white text-xs mt-0.5"
            style={{ backgroundColor: primaryColor }}
          >
            <Bot className="size-3.5" />
          </div>
          <div className="space-y-1">
            <div className="rounded-2xl rounded-tl-xs bg-muted/80 border border-border/50 px-3.5 py-2.5 text-xs text-foreground leading-relaxed shadow-xs break-words">
              {displayGreeting}
            </div>
            <span className="text-[10px] text-muted-foreground pl-1">
              Just now
            </span>
          </div>
        </div>
      </div>

      {/* 3. Mock Input & Watermark Footer */}
      <div className="p-3 border-t border-border/70 bg-card space-y-2">
        <div className="relative flex items-center">
          <input
            type="text"
            readOnly
            disabled
            placeholder="Type a message (simulation only)..."
            className="w-full rounded-full border border-border bg-muted/40 py-2 pl-3.5 pr-9 text-xs text-muted-foreground cursor-not-allowed select-none"
          />
          <div
            className="absolute right-1.5 flex size-6 items-center justify-center rounded-full text-white opacity-80"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="size-3" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <span>Powered by</span>
          <span className="font-semibold text-foreground">ResolvDesk</span>
        </div>
      </div>
    </div>
  );
}
