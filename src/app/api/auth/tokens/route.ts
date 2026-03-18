// ─── API Token Management ─────────────────────────────────────────────────────
//
// GET    /api/auth/tokens       — list active API tokens (no raw values)
// POST   /api/auth/tokens       — create a new API token (returns raw value once)
// DELETE /api/auth/tokens/:id   — revoke a token

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { generateApiToken } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const tokens = await prisma.apiToken.findMany({
    where: { active: true },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { name } = await request.json().catch(() => ({}));
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { raw, hash } = generateApiToken();

  const token = await prisma.apiToken.create({
    data: { name, tokenHash: hash },
  });

  // Return the raw token exactly once — it will never be shown again
  return NextResponse.json({
    id: token.id,
    name: token.name,
    token: raw,
    createdAt: token.createdAt,
    warning: "Save this token now. It will not be shown again.",
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await request.json().catch(() => ({}));
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.apiToken.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
