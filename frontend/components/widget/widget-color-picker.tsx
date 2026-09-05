"use client";

import * as React from "react";
import { Check, Pipette } from "lucide-react";
import { WIDGET_PRESET_COLORS } from "@/lib/validations/widget";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WidgetColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  error?: string;
}

export function WidgetColorPicker({
  value,
  onChange,
  error,
}: WidgetColorPickerProps) {
  const [hexInput, setHexInput] = React.useState(value);

  // Sync internal hex input state if external value changes (e.g. form reset)
  React.useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexBlur = () => {
    let clean = hexInput.trim();
    if (!clean.startsWith("#")) {
      clean = "#" + clean;
    }
    if (/^#([A-Fa-f0-9]{6})$/.test(clean)) {
      setHexInput(clean.toUpperCase());
      onChange(clean.toUpperCase());
    } else {
      // Revert if invalid
      setHexInput(value);
    }
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    setHexInput(newColor);
    onChange(newColor);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">
        Brand Accent Color
      </Label>
      <p className="text-xs text-muted-foreground">
        Used for the launcher bubble, header background, and primary action buttons.
      </p>

      {/* Preset Swatches */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {WIDGET_PRESET_COLORS.map((preset) => {
          const isSelected = value.toUpperCase() === preset.value.toUpperCase();
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                setHexInput(preset.value);
                onChange(preset.value);
              }}
              className={cn(
                "group relative size-8 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm"
                  : "hover:scale-105 opacity-90 hover:opacity-100"
              )}
              style={{ backgroundColor: preset.value }}
              title={`${preset.name} (${preset.value})`}
              aria-label={`Select ${preset.name} color`}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-sm">
                  <Check className="size-4 stroke-[2.5]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Picker & Hex Input */}
      <div className="flex items-center gap-3 pt-1">
        {/* Native Color Picker trigger */}
        <div className="relative flex items-center justify-center size-9 rounded-md border border-border shadow-xs overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
          <input
            type="color"
            value={value.startsWith("#") && value.length === 7 ? value : "#4F46E5"}
            onChange={handleNativeColorChange}
            className="absolute -inset-2 size-14 cursor-pointer opacity-0"
            aria-label="Custom color picker"
          />
          <div
            className="size-full flex items-center justify-center"
            style={{ backgroundColor: value }}
          >
            <Pipette className="size-4 text-white drop-shadow-sm pointer-events-none" />
          </div>
        </div>

        {/* Hex Text Field */}
        <div className="flex-1 max-w-[160px]">
          <Input
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onBlur={handleHexBlur}
            placeholder="#4F46E5"
            maxLength={7}
            className={cn(
              "font-mono uppercase text-xs h-9",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          {value.toUpperCase()}
        </span>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
