// ─── Login API ────────────────────────────────────────────────────────────────
//
// POST /api/auth/login  — validate password, set session cookie

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyPassword,
  getPasswordHash,
  createSessionToken,
  SESSION_COOKIE,
  isSetupComplete,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({}));

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  // Redirect to setup if onboarding not done
  if (!(await isSetupComplete())) {
    return NextResponse.json(
      { error: "Setup not complete", redirect: "/onboarding" },
      { status: 403 }
    );
  }

  const hash = await getPasswordHash();
  if (!hash) {
    return NextResponse.json(
      { error: "No password configured" },
      { status: 500 }
    );
  }

  const valid = await verifyPassword(password, hash);
  if (!valid) {
    // Intentionally vague error message
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({ success: true });
}
