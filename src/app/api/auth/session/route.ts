// ─── Session API ──────────────────────────────────────────────────────────────
//
// GET    /api/auth/session  — return current session status + user info
// DELETE /api/auth/session  — log out (clear session cookie)

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { getConfig } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token || !(await verifySessionToken(token))) {
    return NextResponse.json({ authenticated: false });
  }

  const displayName = await getConfig("display_name");
  const timezone = await getConfig("timezone");

  return NextResponse.json({
    authenticated: true,
    user: { displayName, timezone },
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return NextResponse.json({ success: true });
}
