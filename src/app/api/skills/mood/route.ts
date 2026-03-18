import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const entries = await prisma.moodEntry.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { energy, mood, notes, tags } = await request.json().catch(() => ({}));

  const entry = await prisma.moodEntry.create({
    data: {
      energy: energy != null ? Math.max(1, Math.min(10, energy)) : null,
      mood: mood != null ? Math.max(1, Math.min(10, mood)) : null,
      notes: notes ?? null,
      tags: tags ? JSON.stringify(tags) : null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.moodEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
