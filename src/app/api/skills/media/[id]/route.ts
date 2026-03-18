import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import prisma from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { status, rating, notes, title, author } = await request.json().catch(() => ({}));

  const item = await prisma.mediaItem.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(rating !== undefined ? { rating: rating ? Math.max(1, Math.min(5, rating)) : null } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(title ? { title } : {}),
      ...(author !== undefined ? { author } : {}),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  await prisma.mediaItem.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
