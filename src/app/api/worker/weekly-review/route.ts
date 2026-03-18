import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { loadConfig } from "@/lib/configLoader";
import prisma from "@/lib/db";
import { chat } from "@/lib/ai/registry";
import type { ChatMessage } from "@/lib/ai/types";

const REVIEW_PROMPT = `You are Ziggy, a personal AI assistant. Based on the data provided, write a warm, insightful weekly review for the user.

Cover:
1. Tasks — what was completed, what's still pending, any patterns
2. Habits — streaks, consistency, wins and misses
3. Mood/Energy — average levels, notable days if tracked
4. Finances — total spent, categories, any budget concerns
5. People — any interactions or follow-ups from the week
6. One actionable suggestion for next week

Keep it conversational, encouraging, and under 300 words. Use HTML formatting with <b> for section headings.`;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;
  await loadConfig();

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Gather week's data
  const [completedTodos, pendingTodos, shortTermEntries, moodEntries, transactions, interactions] =
    await Promise.all([
      prisma.todo.findMany({ where: { status: "done", completedAt: { gte: weekAgo } } }),
      prisma.todo.findMany({ where: { status: "pending" } }),
      prisma.shortTermContext.findMany({ where: { date: { gte: weekAgo } }, orderBy: { date: "asc" } }),
      prisma.moodEntry.findMany({ where: { date: { gte: weekAgo } } }),
      prisma.transaction.findMany({ where: { date: { gte: weekAgo } } }),
      prisma.interaction.findMany({ where: { date: { gte: weekAgo } }, include: { person: { select: { name: true } } } }),
    ]);

  // Build data summary for the AI
  const parts: string[] = [];

  parts.push(`WEEK OF ${weekAgo.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`);

  parts.push(`\nTASKS:\n- Completed: ${completedTodos.length}\n- Pending: ${pendingTodos.length}`);
  if (completedTodos.length > 0) {
    parts.push("Completed: " + completedTodos.slice(0, 8).map((t) => t.title).join(", "));
  }

  if (moodEntries.length > 0) {
    const avgMood = moodEntries.filter((e) => e.mood).reduce((s, e) => s + (e.mood ?? 0), 0) / moodEntries.filter((e) => e.mood).length;
    const avgEnergy = moodEntries.filter((e) => e.energy).reduce((s, e) => s + (e.energy ?? 0), 0) / moodEntries.filter((e) => e.energy).length;
    parts.push(`\nMOOD: avg ${avgMood.toFixed(1)}/10, ENERGY: avg ${avgEnergy.toFixed(1)}/10 (${moodEntries.length} entries)`);
  }

  if (transactions.length > 0) {
    const spent = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const earned = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const byCategory = transactions.filter((t) => t.type === "expense").reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});
    const topCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ₹${v.toFixed(0)}`).join(", ");
    parts.push(`\nFINANCE: Spent ₹${spent.toFixed(0)}, Earned ₹${earned.toFixed(0)}. Top: ${topCats}`);
  }

  if (interactions.length > 0) {
    const names = Array.from(new Set(interactions.map((i) => i.person.name))).slice(0, 5);
    parts.push(`\nPEOPLE: Interacted with ${names.join(", ")}`);
  }

  if (shortTermEntries.length > 0) {
    parts.push(`\nDAILY SUMMARIES:\n${shortTermEntries.map((e) => `- ${e.date.toLocaleDateString("en-IN", { weekday: "short" })}: ${e.summary}`).join("\n")}`);
  }

  const dataStr = parts.join("\n");

  // weekStart = most recent Monday
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  try {
    const messages: ChatMessage[] = [
      { role: "system", content: REVIEW_PROMPT },
      { role: "user", content: dataStr },
    ];

    const result = await chat(messages, { maxTokens: 500, temperature: 0.4 });
    const report = result.content.trim();

    // Persist for dashboard display
    await prisma.weeklySummary.upsert({
      where: { weekStart },
      create: { weekStart, report },
      update: { report },
    });

    return NextResponse.json({ ok: true, report });
  } catch (err) {
    console.error("[weeklyReview] AI generation failed:", err);
    return NextResponse.json({ ok: true, report: dataStr });
  }
}
