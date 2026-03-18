import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const people = await prisma.person.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      interactions: {
        orderBy: { date: "desc" },
        take: 3,
      },
    },
  });

  // Pending follow-ups across all people
  const followUps = await prisma.interaction.findMany({
    where: { followUp: { not: null } },
    include: { person: { select: { id: true, name: true } } },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  return NextResponse.json({ people, followUps });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { name, relationship, notes, birthday } = await request.json().catch(() => ({}));
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const person = await prisma.person.create({
    data: {
      name,
      relationship: relationship ?? null,
      notes: notes ?? null,
      birthday: birthday ? new Date(birthday) : null,
    },
  });

  return NextResponse.json(person, { status: 201 });
}
