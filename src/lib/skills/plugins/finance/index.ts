import type { SkillDefinition, ProcessingContext, SkillExtractionResult } from "../../types";
import prisma from "@/lib/db";

interface ExtractedTransaction {
  amount: number;
  type: "expense" | "income";
  category: string;
  description?: string;
}

export const financeSkill: SkillDefinition = {
  name: "transactions",
  displayName: "Finance Tracker",

  async buildSystemSection(): Promise<string> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recent, budgets] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: "desc" },
        take: 15,
      }),
      prisma.budget.findMany(),
    ]);

    const totalSpent = recent
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    const byCategory = recent
      .filter((t) => t.type === "expense")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {});

    const catSummary = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k}: ₹${v.toFixed(0)}`)
      .join(", ");

    const budgetWarnings = budgets
      .filter((b) => {
        const spent = byCategory[b.category] ?? 0;
        return spent > b.amount * 0.8;
      })
      .map((b) => {
        const spent = byCategory[b.category] ?? 0;
        return `${b.category} ₹${spent.toFixed(0)}/₹${b.amount.toFixed(0)}`;
      });

    const contextLines = [`Last 7 days: ₹${totalSpent.toFixed(0)} spent`];
    if (catSummary) contextLines.push(`By category: ${catSummary}`);
    if (budgetWarnings.length > 0) contextLines.push(`Near budget: ${budgetWarnings.join(", ")}`);

    return `
FINANCE TRACKER:
${contextLines.join("\n")}

If the user mentions spending, paying, buying, or receiving money, add a "transactions" field to your JSON response:
"transactions": [
  {
    "amount": 450.00,
    "type": "expense",
    "category": "groceries",
    "description": "optional description"
  }
]
type is "expense" (money spent) or "income" (money received).
Expense categories: groceries, dining, transport, entertainment, health, utilities, shopping, personal, other
Income categories: salary, freelance, gift, investment, other
Only extract when an explicit amount or clear financial transaction is mentioned. Omit the field if not mentioned.`;
  },

  async processExtractions(
    data: unknown,
    ctx: ProcessingContext
  ): Promise<SkillExtractionResult> {
    if (!Array.isArray(data) || data.length === 0) return { processed: 0 };

    const valid = (data as unknown[]).filter(
      (t): t is ExtractedTransaction =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as ExtractedTransaction).amount === "number" &&
        (t as ExtractedTransaction).amount > 0
    );

    if (valid.length === 0) return { processed: 0 };

    await prisma.transaction.createMany({
      data: valid.map((t) => ({
        amount: t.amount,
        type: t.type === "income" ? "income" : "expense",
        category: t.category ?? "other",
        description: t.description ?? null,
        date: ctx.messageDate,
      })),
    });

    return { processed: valid.length };
  },
};
