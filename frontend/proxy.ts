import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js Edge Middleware for route protection.
 * Runs before any route HTML or RSC payload is loaded:
 * - Redirects logged-in users away from /login and /register to /dashboard.
 * - Redirects unauthenticated users trying to access /dashboard to /login.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Better Auth session cookie (handles both dev and secure HTTPS production names)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedPage = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  // 1. Authenticated users should never see /login or /register
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. Unauthenticated visitors should not access protected /dashboard or /admin routes
  if (isProtectedPage && !sessionToken) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
