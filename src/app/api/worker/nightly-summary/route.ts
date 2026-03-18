import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { loadConfig } from "@/lib/configLoader";
import { summarizeDay } from "@/lib/services/shortTermContext";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;
  await loadConfig();

  const today = new Date();
  const summary = await summarizeDay(today);

  return NextResponse.json({ ok: true, summary });
}
