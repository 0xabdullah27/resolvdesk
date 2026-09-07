import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Handle CORS and Chrome Private Network Access preflights
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin") || "*";
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "X-Widget-Key, Authorization, Content-Type, Accept, Access-Control-Request-Private-Network, X-Requested-With"
    );
    response.headers.set("Access-Control-Allow-Private-Network", "true");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  }

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthenticated = Boolean(sessionToken);

  // 1. Protected routes: /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Auth routes:
  // If redirected to /login with callbackUrl (e.g. invalid/expired session from dashboard),
  // purge the stale cookie so the browser does not stay in a stale state.
  if (pathname === "/login") {
    const hasCallback = request.nextUrl.searchParams.has("callbackUrl");
    if (hasCallback) {
      const response = NextResponse.next();
      response.cookies.delete("better-auth.session_token");
      response.cookies.delete("__Secure-better-auth.session_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/widget.js",
    "/api/v1/:path*",
  ],
};
