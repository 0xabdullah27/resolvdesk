"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, rollbackBetterAuthUser } from "@/lib/auth";
import { backendFetch, BackendApiError } from "@/lib/backend-api";
import {
  registerSchema,
  loginSchema,
  type RegisterFormValues,
  type LoginFormValues,
} from "@/lib/validations/auth";
import type { OwnerProfile } from "@/types/dashboard";

export async function registerOwnerAction(values: RegisterFormValues) {
  const parseResult = registerSchema.safeParse(values);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Validation failed",
    };
  }

  const { fullName, email, password, businessName, websiteUrl } = parseResult.data;

  let createdUserId: string | null = null;
  try {
    const headerList = await headers();

    // 1. Better Auth Sign-Up on Auth Server
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: fullName,
        email,
        password,
      },
      headers: headerList,
    });

    if (!signUpResult?.user?.id) {
      return {
        success: false,
        error: "Failed to create user account. Please try again.",
      };
    }

    createdUserId = signUpResult.user.id;

    // 2. Server-to-Server handshake with FastAPI backend: atomic workspace & owner provisioning
    try {
      await backendFetch("api/v1/registration/complete", {
        method: "POST",
        body: JSON.stringify({
          user_id: signUpResult.user.id,
          email: email,
          full_name: fullName,
          organization_name: businessName,
          website_url: websiteUrl,
        }),
      });
    } catch (backendErr) {
      console.error("FastAPI registration error:", backendErr);

      // Rollback Better Auth user so account is not left in an inconsistent state
      await rollbackBetterAuthUser(signUpResult.user.id);

      if (backendErr instanceof BackendApiError && backendErr.status === 409) {
        return {
          success: false,
          error: "An account or workspace with this email already exists.",
        };
      }
      return {
        success: false,
        error:
          backendErr instanceof Error
            ? backendErr.message
            : "Service temporarily unavailable. Workspace provisioning failed.",
      };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Registration action error:", err);
    if (createdUserId) {
      await rollbackBetterAuthUser(createdUserId);
    }
    if (
      err?.message?.includes("already exists") ||
      err?.status === 409 ||
      err?.code === "USER_ALREADY_EXISTS"
    ) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }
    return {
      success: false,
      error:
        err?.message ||
        "Registration failed. Please check your details and try again.",
    };
  }
}

export async function loginOwnerAction(values: LoginFormValues) {
  const parseResult = loginSchema.safeParse(values);
  if (!parseResult.success) {
    return {
      success: false,
      error: "Invalid email or password",
    };
  }

  const { email, password } = parseResult.data;

  try {
    const headerList = await headers();
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: headerList,
    });

    if (!result?.user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Login action error:", err);
    return {
      success: false,
      error: "Invalid email or password",
    };
  }
}

export async function signOutOwnerAction() {
  try {
    const headerList = await headers();
    await auth.api.signOut({
      headers: headerList,
    });
  } catch (err) {
    console.error("Sign out action error:", err);
  }
  revalidatePath("/");
  return { success: true };
}

export async function getOwnerContextAction(): Promise<OwnerProfile | null> {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({
      headers: headerList,
    });

    if (!session?.user) {
      return null;
    }

    try {
      const profile = await backendFetch<any>("api/v1/me", {
        method: "GET",
        requireAuth: true,
      });

      return {
        id: profile.id || session.user.id,
        email: profile.email || session.user.email,
        name: profile.name || profile.full_name || session.user.name,
        fullName: profile.full_name || profile.name || session.user.name,
        status: profile.status || "active",
        organizationId: profile.organization_id,
        organizationName: profile.organization_name || "My Workspace",
        createdAt: profile.created_at || new Date().toISOString(),
      };
    } catch (apiErr) {
      console.warn("Could not fetch owner profile from backend, falling back to session:", apiErr);
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        fullName: session.user.name,
        status: "active",
        organizationId: "default-org",
        organizationName: "ResolvDesk Workspace",
        createdAt: session.user.createdAt?.toISOString() || new Date().toISOString(),
      };
    }
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("Get owner context error:", err);
    return null;
  }
}
