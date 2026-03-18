import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import prisma from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const person = await prisma.person.findUnique({
    where: { id: params.id },
    include: { interactions: { orderBy: { date: "desc" } } },
  });

  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(person);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { name, relationship, notes, birthday } = await request.json().catch(() => ({}));

  const person = await prisma.person.update({
    where: { id: params.id },
    data: {
      ...(name ? { name } : {}),
      ...(relationship !== undefined ? { relationship } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}),
    },
  });

  return NextResponse.json(person);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  await prisma.person.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // POST /api/skills/people/[id] → add interaction
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { summary, followUp, dueDate } = await request.json().catch(() => ({}));
  if (!summary) return NextResponse.json({ error: "summary required" }, { status: 400 });

  const interaction = await prisma.interaction.create({
    data: {
      personId: params.id,
      summary,
      followUp: followUp ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  // Bump person's updatedAt
  await prisma.person.update({ where: { id: params.id }, data: { updatedAt: new Date() } });

  return NextResponse.json(interaction, { status: 201 });
}
