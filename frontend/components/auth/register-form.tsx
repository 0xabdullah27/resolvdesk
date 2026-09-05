"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth";
import { registerOwnerAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      businessName: "",
      websiteUrl: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const result = await registerOwnerAction(values);
      if (!result.success) {
        setServerError(result.error || "Registration failed");
        toast.error(result.error || "Registration failed");
        return;
      }

      toast.success("Workspace provisioned! Welcome to ResolvDesk.");
      router.push("/dashboard");
    } catch {
      const fallbackMsg = "An unexpected error occurred. Please try again.";
      setServerError(fallbackMsg);
      toast.error(fallbackMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="e.g. Alice Johnson"
          autoComplete="name"
          disabled={isSubmitting}
          aria-invalid={!!errors.fullName}
          {...register("fullName")}
        />
        {errors.fullName && (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@business.com"
          autoComplete="email"
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="businessName">Business / Store Name</Label>
        <Input
          id="businessName"
          type="text"
          placeholder="e.g. Chronos Watches"
          disabled={isSubmitting}
          aria-invalid={!!errors.businessName}
          {...register("businessName")}
        />
        {errors.businessName && (
          <p className="text-xs text-destructive">
            {errors.businessName.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <span className="text-xs text-muted-foreground">Optional</span>
        </div>
        <Input
          id="websiteUrl"
          type="url"
          placeholder="https://example.com"
          disabled={isSubmitting}
          aria-invalid={!!errors.websiteUrl}
          {...register("websiteUrl")}
        />
        {errors.websiteUrl && (
          <p className="text-xs text-destructive">
            {errors.websiteUrl.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full mt-2 cursor-pointer"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Provisioning Workspace...
          </>
        ) : (
          "Create Account & Workspace"
        )}
      </Button>
    </form>
  );
}
