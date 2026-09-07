import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const BACKEND_BASE_URL =
  process.env.BACKEND_API_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:8000";

export class BackendApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

/**
 * Resolves the RS256 JWT token on the server using Better Auth session
 */
export async function getServerJwtToken(): Promise<string | null> {
  try {
    const headerList = await headers();
    if ("getToken" in auth.api && typeof (auth.api as any).getToken === "function") {
      const tokenRes = await (auth.api as any).getToken({
        headers: headerList,
      });
      if (tokenRes && typeof tokenRes === "object" && "token" in tokenRes) {
        return (tokenRes as any).token;
      }
      if (typeof tokenRes === "string") {
        return tokenRes;
      }
    }
  } catch (err) {
    console.error("Failed to retrieve server JWT token:", err);
  }
  return null;
}

/**
 * Server-side native fetch wrapper for FastAPI endpoints
 */
export async function backendFetch<T = unknown>(
  endpoint: string,
  options: RequestInit & { token?: string; requireAuth?: boolean } = {}
): Promise<T> {
  const { token, requireAuth = false, headers: customHeaders, ...restOptions } = options;

  const requestHeaders = new Headers(customHeaders || {});
  if (!requestHeaders.has("Content-Type") && !(restOptions.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let authToken = token;
  if (!authToken && requireAuth) {
    authToken = (await getServerJwtToken()) || undefined;
    if (!authToken) {
      throw new BackendApiError(401, null, "Unauthorized: No active session token");
    }
  }

  if (authToken) {
    requestHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  const url = `${BACKEND_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
    cache: restOptions.cache ?? "no-store",
  });

  if (!response.ok) {
    let errorData: any = null;
    const rawText = await response.text();
    try {
      errorData = JSON.parse(rawText);
    } catch {
      errorData = rawText;
    }
    const message =
      (typeof errorData === "object" && errorData?.detail) ||
      (typeof errorData === "string" && errorData.length > 0 && errorData.length < 200 ? errorData : null) ||
      `Backend API call failed with status ${response.status}`;
    throw new BackendApiError(response.status, errorData, message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const rawText = await response.text();
  try {
    return JSON.parse(rawText) as T;
  } catch {
    return rawText as unknown as T;
  }
}

