// ─── Next.js Middleware (Edge Runtime) ───────────────────────────────────────
//
// Protects all pages and API routes.
// - Pages:    Redirect unauthenticated users to /login
// - API:      Return 401 JSON for unauthenticated requests
//
// Runs on the Edge runtime — NO database access available here.
// Only JWT cookie verification (using process.env.JWT_SECRET).
// Bearer token verification is handled per-route by requireAuth().

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, getEdgeJwtSecret } from "@/lib/auth/index";

// Paths that never require authentication
const PUBLIC_PATHS = [
  "/login",
  "/onboarding",
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/session",
  // OAuth callback doesn't carry our session cookie
  "/api/calendar/callback",
  // Telegram webhook uses its own secret header
  "/api/telegram/webhook",
];

// Static asset prefixes to always allow
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/icons", "/manifest.json"];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow files with extensions (images, etc.)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  // Dev bypass — completely disable auth
  if (process.env.SKIP_AUTH === "true") {
    return NextResponse.next();
  }

  // Allow public paths (JWT cookie not required)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // For API routes with a Bearer token: pass through.
  // The route itself calls requireAuth() which checks the token against the DB.
  // (We can't do DB lookups in Edge middleware.)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Verify JWT cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    try {
      await jwtVerify(sessionToken, getEdgeJwtSecret());
      return NextResponse.next();
    } catch {
      // Token invalid or expired — fall through to redirect/401
    }
  }

  // Unauthenticated request
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect browser to login page
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match everything except Next.js internals
    "/((?!_next/static|_next/image).*)",
  ],
};
