"use client";

import * as React from "react";
import {
  CornerDownRight,
  CornerDownLeft,
  CornerUpRight,
  CornerUpLeft,
  Sliders,
  Sparkles,
  Move,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WidgetPlacementCorner } from "@/types/widget";
import { parsePlacement, formatPlacement } from "@/lib/validations/widget";

interface WidgetPositionPickerProps {
  value: string;
  onChange: (placement: string) => void;
  error?: string;
}

const CORNERS: {
  id: WidgetPlacementCorner;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "bottom-right",
    label: "Bottom Right",
    sublabel: "Recommended default",
    icon: CornerDownRight,
  },
  {
    id: "bottom-left",
    label: "Bottom Left",
    sublabel: "Alternative bottom side",
    icon: CornerDownLeft,
  },
  {
    id: "top-right",
    label: "Top Right",
    sublabel: "Header / top navigation area",
    icon: CornerUpRight,
  },
  {
    id: "top-left",
    label: "Top Left",
    sublabel: "Upper left screen corner",
    icon: CornerUpLeft,
  },
];

const PRESET_OFFSETS = [16, 24, 32, 48];

export function WidgetPositionPicker({
  value,
  onChange,
  error,
}: WidgetPositionPickerProps) {
  const parsed = React.useMemo(() => parsePlacement(value), [value]);
  const [directInput, setDirectInput] = React.useState(value);
  const [directError, setDirectError] = React.useState<string | null>(null);

  // Sync internal direct input text when parent value changes
  React.useEffect(() => {
    setDirectInput(value);
    setDirectError(null);
  }, [value]);

  const handleCornerSelect = (corner: WidgetPlacementCorner) => {
    const nextVal = formatPlacement(corner, parsed.offsetX, parsed.offsetY);
    onChange(nextVal);
  };

  const handleOffsetXChange = (offsetX: number) => {
    const clamped = Math.max(0, Math.min(500, isNaN(offsetX) ? 24 : offsetX));
    const nextVal = formatPlacement(parsed.corner, clamped, parsed.offsetY);
    onChange(nextVal);
  };

  const handleOffsetYChange = (offsetY: number) => {
    const clamped = Math.max(0, Math.min(500, isNaN(offsetY) ? 24 : offsetY));
    const nextVal = formatPlacement(parsed.corner, parsed.offsetX, clamped);
    onChange(nextVal);
  };

  const handleDirectInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDirectInput(val);

    const regex = /^(bottom-right|bottom-left|top-right|top-left)(:\d{1,4}:\d{1,4})?$/;
    if (regex.test(val.trim())) {
      setDirectError(null);
      onChange(val.trim());
    } else {
      setDirectError("Format: corner or corner:offsetX:offsetY (e.g. bottom-right:32:16)");
    }
  };

  const handleDirectInputBlur = () => {
    const regex = /^(bottom-right|bottom-left|top-right|top-left)(:\d{1,4}:\d{1,4})?$/;
    if (!regex.test(directInput.trim())) {
      // Revert to valid current state on blur if malformed
      setDirectInput(value);
      setDirectError(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Move className="size-3.5 text-primary" />
          Widget Screen Position &amp; Placement
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose a corner preset, customize exact pixel offsets from the browser viewport edges, or enter a direct value.
        </p>
      </div>

      {/* Visual Interactive Viewport Mockup */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
          <span className="font-medium text-foreground/80 flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" />
            Interactive Viewport Anchor
          </span>
          <span className="font-mono text-[11px] bg-background/80 border border-border/60 rounded px-2 py-0.5">
            {parsed.corner} ({parsed.offsetX}px, {parsed.offsetY}px)
          </span>
        </div>

        {/* Screen simulator frame */}
        <div className="relative h-40 w-full rounded-lg border border-border/80 bg-background/90 shadow-inner flex flex-col justify-between p-3 overflow-hidden select-none">
          {/* Subtle browser mockup header */}
          <div className="flex items-center gap-1.5 opacity-40 border-b border-border/50 pb-2">
            <div className="size-2 rounded-full bg-muted-foreground/50" />
            <div className="size-2 rounded-full bg-muted-foreground/50" />
            <div className="size-2 rounded-full bg-muted-foreground/50" />
            <div className="ml-2 h-2 w-28 rounded-full bg-muted-foreground/20" />
          </div>

          {/* 4 Interactive Corner Hotspots */}
          <div className="flex justify-between items-start pt-1">
            {/* Top-Left */}
            <button
              type="button"
              onClick={() => handleCornerSelect("top-left")}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 border",
                parsed.corner === "top-left"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              <CornerUpLeft className="size-3" />
              <span>Top Left</span>
              {parsed.corner === "top-left" && (
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>

            {/* Top-Right */}
            <button
              type="button"
              onClick={() => handleCornerSelect("top-right")}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 border",
                parsed.corner === "top-right"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              <span>Top Right</span>
              <CornerUpRight className="size-3" />
              {parsed.corner === "top-right" && (
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>

          <div className="flex justify-between items-end pb-1">
            {/* Bottom-Left */}
            <button
              type="button"
              onClick={() => handleCornerSelect("bottom-left")}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 border",
                parsed.corner === "bottom-left"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              <CornerDownLeft className="size-3" />
              <span>Bottom Left</span>
              {parsed.corner === "bottom-left" && (
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>

            {/* Bottom-Right */}
            <button
              type="button"
              onClick={() => handleCornerSelect("bottom-right")}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 border",
                parsed.corner === "bottom-right"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              <span>Bottom Right</span>
              <CornerDownRight className="size-3" />
              {parsed.corner === "bottom-right" && (
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Corner Preset Grid Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {CORNERS.map((corner) => {
          const Icon = corner.icon;
          const isSelected = parsed.corner === corner.id;
          return (
            <button
              key={corner.id}
              type="button"
              onClick={() => handleCornerSelect(corner.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-150 cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                  : "border-border/60 hover:border-border hover:bg-muted/30 bg-card"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border/60 bg-muted/40 text-muted-foreground"
                )}
              >
                <Icon className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground truncate">{corner.label}</p>
                  {isSelected && <Check className="size-3 text-primary ml-1 shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{corner.sublabel}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Pixel Offset Inputs (Side X and Edge Y) */}
      <div className="rounded-xl border border-border/70 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Custom Pixel Offsets</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Adjust margin from screen edge</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Side Distance (X Offset) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="offset-x-input" className="text-xs text-foreground/90">
                Side Offset (X)
              </Label>
              <span className="text-xs font-mono text-muted-foreground">{parsed.offsetX}px</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="offset-x-input"
                type="number"
                min={0}
                max={500}
                step={2}
                value={parsed.offsetX}
                onChange={(e) => handleOffsetXChange(parseInt(e.target.value, 10))}
                className="h-8 text-xs font-mono w-24"
              />
              {/* Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                {PRESET_OFFSETS.map((offset) => (
                  <button
                    key={`x-${offset}`}
                    type="button"
                    onClick={() => handleOffsetXChange(offset)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors border",
                      parsed.offsetX === offset
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
                    )}
                  >
                    {offset}px
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Horizontal gap from the left or right screen border.
            </p>
          </div>

          {/* Edge Distance (Y Offset) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="offset-y-input" className="text-xs text-foreground/90">
                Edge Offset (Y)
              </Label>
              <span className="text-xs font-mono text-muted-foreground">{parsed.offsetY}px</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="offset-y-input"
                type="number"
                min={0}
                max={500}
                step={2}
                value={parsed.offsetY}
                onChange={(e) => handleOffsetYChange(parseInt(e.target.value, 10))}
                className="h-8 text-xs font-mono w-24"
              />
              {/* Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                {PRESET_OFFSETS.map((offset) => (
                  <button
                    key={`y-${offset}`}
                    type="button"
                    onClick={() => handleOffsetYChange(offset)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors border",
                      parsed.offsetY === offset
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
                    )}
                  >
                    {offset}px
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Vertical gap from the top or bottom screen border.
            </p>
          </div>
        </div>
      </div>

      {/* Direct Value Input Field */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="direct-placement-input" className="text-xs font-medium text-foreground">
            Direct Placement String
          </Label>
          <span className="text-[11px] font-mono text-muted-foreground">
            Raw value
          </span>
        </div>
        <div className="relative">
          <Input
            id="direct-placement-input"
            value={directInput}
            onChange={handleDirectInputChange}
            onBlur={handleDirectInputBlur}
            placeholder="e.g. bottom-right:24:24 or top-left"
            className={cn(
              "font-mono text-xs h-8 pr-12",
              (directError || error) && "border-destructive focus-visible:ring-destructive"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              CSS
            </span>
          </div>
        </div>
        {directError ? (
          <p className="text-[11px] font-medium text-destructive">{directError}</p>
        ) : error ? (
          <p className="text-[11px] font-medium text-destructive">{error}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Direct string syntax: <code className="text-primary font-mono font-medium">corner:offsetX:offsetY</code>. Updating this will instantly sync the visual picker above.
          </p>
        )}
      </div>
    </div>
  );
}
