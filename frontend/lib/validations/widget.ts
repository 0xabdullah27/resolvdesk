import { z } from "zod";

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
  widget_placement: "bottom-right" as const,
  domain_scope: "all" as const,
  restricted_domains: "",
};

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
  widget_placement: z.enum(["bottom-right", "bottom-left"]),
  domain_scope: z.enum(["all", "restricted"]),
  restricted_domains: z.string(),
});

export type WidgetFormValues = z.infer<typeof widgetFormSchema>;

/**
 * Normalizes a list of domains from user input (strips protocol, port/paths if present, trailing slashes)
 * and returns comma-separated clean domain string.
 */
export function normalizeDomains(input: string): string {
  if (!input) return "";
  return input
    .split(/[\n,]+/)
    .map((d) => d.trim())
    .filter(Boolean)
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
