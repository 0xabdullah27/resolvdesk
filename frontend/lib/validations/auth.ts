import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be under 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be under 128 characters"),
  businessName: z
    .string()
    .min(1, "Business or organization name is required")
    .max(100, "Business name must be under 100 characters"),
  websiteUrl: z
    .string()
    .url("Must be a valid URL (e.g. https://example.com)")
    .optional()
    .or(z.literal("")),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
