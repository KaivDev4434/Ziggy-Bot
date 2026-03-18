import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const type = searchParams.get("type"); // "expense" | "income"

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        date: { gte: since },
        ...(type ? { type } : {}),
      },
      orderBy: { date: "desc" },
    }),
    prisma.budget.findMany({ orderBy: { category: "asc" } }),
  ]);

  // Aggregate spending by category for the period
  const spendingByCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});

  return NextResponse.json({ transactions, budgets, spendingByCategory });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { amount, type, category, description, date } = await request.json().catch(() => ({}));

  if (!amount || !type || !category) {
    return NextResponse.json({ error: "amount, type, category required" }, { status: 400 });
  }

  const txn = await prisma.transaction.create({
    data: {
      amount: parseFloat(amount),
      type: type === "income" ? "income" : "expense",
      category,
      description: description ?? null,
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json(txn, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { id, ...updates } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const txn = await prisma.transaction.update({ where: { id }, data: updates });
  return NextResponse.json(txn);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
