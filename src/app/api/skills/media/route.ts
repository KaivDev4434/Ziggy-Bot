import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");   // "book" | "movie" | "series"
  const status = searchParams.get("status"); // "want" | "in_progress" | "done"

  const items = await prisma.mediaItem.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { title, type, status, rating, notes, author } = await request.json().catch(() => ({}));

  if (!title || !type) {
    return NextResponse.json({ error: "title and type required" }, { status: 400 });
  }

  const item = await prisma.mediaItem.create({
    data: {
      title,
      type: ["book", "movie", "series"].includes(type) ? type : "movie",
      status: status ?? "want",
      rating: rating ? Math.max(1, Math.min(5, rating)) : null,
      notes: notes ?? null,
      author: author ?? null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
