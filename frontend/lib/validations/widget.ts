import { z } from "zod";
import type { WidgetPlacementCorner } from "@/types/widget";

export const WIDGET_PRESET_COLORS = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Blue", value: "#2563EB" },
  { name: "Emerald", value: "#059669" },
  { name: "Violet", value: "#7C3AED" },
  { name: "Orange", value: "#EA580C" },
  { name: "Slate", value: "#0F172A" },
] as const;

export const WIDGET_DEFAULTS = {
  bot_display_name: "Support Assistant",
  welcome_message: "Hi! How can I help you today?",
  primary_color: "#4F46E5",
  widget_placement: "bottom-right",
  restricted_domains: "localhost",
};

export interface ParsedPlacement {
  corner: WidgetPlacementCorner;
  offsetX: number;
  offsetY: number;
}

export function parsePlacement(raw: string | undefined | null): ParsedPlacement {
  const fallback: ParsedPlacement = { corner: "bottom-right", offsetX: 24, offsetY: 24 };
  if (!raw || typeof raw !== "string") return fallback;

  const parts = raw.trim().split(":");
  const corner = parts[0] as WidgetPlacementCorner;
  const validCorners: WidgetPlacementCorner[] = [
    "bottom-right",
    "bottom-left",
    "top-right",
    "top-left",
  ];

  if (!validCorners.includes(corner)) {
    return fallback;
  }

  const offsetX = parts.length > 1 ? parseInt(parts[1], 10) : 24;
  const offsetY = parts.length > 2 ? parseInt(parts[2], 10) : 24;

  return {
    corner,
    offsetX: Number.isFinite(offsetX) && offsetX >= 0 ? offsetX : 24,
    offsetY: Number.isFinite(offsetY) && offsetY >= 0 ? offsetY : 24,
  };
}

export function formatPlacement(
  corner: WidgetPlacementCorner,
  offsetX: number = 24,
  offsetY: number = 24
): string {
  if (offsetX === 24 && offsetY === 24) {
    return corner;
  }
  return `${corner}:${offsetX}:${offsetY}`;
}

export const widgetFormSchema = z.object({
  bot_display_name: z
    .string()
    .trim()
    .min(1, "Bot display name cannot be empty")
    .max(100, "Bot display name cannot exceed 100 characters"),
  welcome_message: z
    .string()
    .trim()
    .min(1, "Welcome greeting cannot be empty")
    .max(500, "Welcome greeting cannot exceed 500 characters"),
  primary_color: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6})$/, "Must be a valid 6-character hex color (e.g. #4F46E5)"),
  widget_placement: z
    .string()
    .trim()
    .regex(
      /^(bottom-right|bottom-left|top-right|top-left)(:\d{1,4}:\d{1,4})?$/,
      "Placement must be one of: bottom-right, bottom-left, top-right, top-left, optionally with :offsetX:offsetY (e.g. bottom-right:24:24)"
    ),
  restricted_domains: z
    .string()
    .trim()
    .min(1, "At least one authorized domain is required (e.g. yourstore.com, localhost)")
    .refine(
      (val) => {
        const tokens = val.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        return !tokens.includes("*");
      },
      { message: "Wildcard '*' is not permitted. Please specify verified domain hostnames." }
    ),
});

export type WidgetFormValues = z.infer<typeof widgetFormSchema>;

/**
 * Normalizes a list of domains from user input (strips protocol, port/paths if present, trailing slashes)
 * and returns comma-separated clean domain string. Wildcard '*' is filtered out.
 */
export function normalizeDomains(input: string): string {
  if (!input) return "";
  return input
    .split(/[\n,]+/)
    .map((d) => d.trim())
    .filter((d) => Boolean(d) && d !== "*")
    .map((d) => {
      // Remove protocol
      let clean = d.replace(/^https?:\/\//i, "");
      // Remove path or query string
      clean = clean.split("/")[0];
      // Remove trailing colons or slashes
      clean = clean.replace(/[:\/]+$/, "").trim().toLowerCase();
      return clean;
    })
    .filter(Boolean)
    .join(", ");
}
