import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const budgets = await prisma.budget.findMany({ orderBy: { category: "asc" } });
  return NextResponse.json({ budgets });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { category, amount, period } = await request.json().catch(() => ({}));
  if (!category || !amount) {
    return NextResponse.json({ error: "category and amount required" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { category },
    update: { amount: parseFloat(amount), period: period ?? "monthly" },
    create: { category, amount: parseFloat(amount), period: period ?? "monthly" },
  });

  return NextResponse.json(budget);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.budget.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
