// ─── API Route Auth Guard ─────────────────────────────────────────────────────
//
// Call requireAuth(request) at the start of any protected API route.
// Supports both JWT cookies (web sessions) and Bearer tokens (API clients).
// Set SKIP_AUTH=true in env to bypass all auth (local development only).

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, verifyApiToken } from "./index";

type AuthResult =
  | { authenticated: true }
  | { authenticated: false; response: NextResponse };

/**
 * Verifies the request is authenticated via:
 *   1. JWT cookie (web browser sessions)
 *   2. Bearer token header (API clients: Telegram, scripts, mobile)
 *
 * Returns { authenticated: true } or { authenticated: false, response } to return.
 *
 * Usage in an API route:
 *   const auth = await requireAuth(request);
 *   if (!auth.authenticated) return auth.response;
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  // Dev bypass
  if (process.env.SKIP_AUTH === "true") {
    return { authenticated: true };
  }

  // 1. Check JWT cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken && (await verifySessionToken(sessionToken))) {
    return { authenticated: true };
  }

  // 2. Check Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token && (await verifyApiToken(token))) {
      return { authenticated: true };
    }
  }

  return {
    authenticated: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
