import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getTodoStats } from "@/lib/services/todoService";
import { getHabitStreaks } from "@/lib/services/habitService";
import { DASHBOARD_LANDMARKS_QUERY } from "@/lib/constants";

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      todoStats,
      habitStreaks,
      habits,
      landmarks,
      // Phase 4 — new skill panels
      moodEntries,
      transactions,
      followUps,
      inProgressMedia,
      latestWeeklySummary,
    ] = await Promise.all([
      getTodoStats(),
      getHabitStreaks(),
      prisma.habit.findMany({
        where: { active: true },
        include: { records: { where: { date: { gte: weekAgo } } } },
      }),
      prisma.landmark.findMany({
        orderBy: { date: "desc" },
        take: DASHBOARD_LANDMARKS_QUERY,
      }),
      // Mood: last 7 days
      prisma.moodEntry.findMany({
        where: { date: { gte: weekAgo } },
        orderBy: { date: "asc" },
        select: { mood: true, energy: true, date: true },
      }),
      // Finance: last 7 days expenses
      prisma.transaction.findMany({
        where: { date: { gte: weekAgo }, type: "expense" },
        select: { amount: true, category: true },
      }),
      // People: pending follow-ups
      prisma.interaction.findMany({
        where: { followUp: { not: null }, dueDate: { not: null } },
        include: { person: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      // Media: currently in-progress
      prisma.mediaItem.findMany({
        where: { status: "in_progress" },
        orderBy: { updatedAt: "desc" },
        take: 4,
        select: { id: true, title: true, type: true, rating: true },
      }),
      // Weekly summary
      prisma.weeklySummary.findFirst({ orderBy: { weekStart: "desc" } }),
    ]);

    // Habits stats
    const habitsCompletedToday = habits.filter((h) =>
      h.records.some((r) => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime() && r.completed;
      })
    ).length;
    const totalPossible = habits.length * 7;
    const actualCompletions = habits.reduce((s, h) => s + h.records.filter((r) => r.completed).length, 0);
    const weeklyCompletionRate = totalPossible > 0 ? Math.round((actualCompletions / totalPossible) * 100) : 0;

    // Mood stats
    const moodWithValue = moodEntries.filter((e) => e.mood !== null);
    const energyWithValue = moodEntries.filter((e) => e.energy !== null);
    const avgMood = moodWithValue.length
      ? Math.round((moodWithValue.reduce((s, e) => s + (e.mood ?? 0), 0) / moodWithValue.length) * 10) / 10
      : null;
    const avgEnergy = energyWithValue.length
      ? Math.round((energyWithValue.reduce((s, e) => s + (e.energy ?? 0), 0) / energyWithValue.length) * 10) / 10
      : null;
    // 7-day mood sparkline (one value per day, null if no entry)
    const moodSparkline = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAgo);
      d.setDate(d.getDate() + i);
      const entry = moodEntries.find((e) => {
        const ed = new Date(e.date);
        ed.setHours(0, 0, 0, 0);
        return ed.getTime() === d.getTime();
      });
      return entry?.mood ?? null;
    });

    // Finance stats
    const weeklySpend = transactions.reduce((s, t) => s + t.amount, 0);
    const byCategory = transactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] ?? null;

    // People: overdue follow-ups
    const overdueFollowUps = followUps.filter((i) => i.dueDate && new Date(i.dueDate) < now);

    return NextResponse.json({
      todos: todoStats,
      habits: {
        total: habits.length,
        completedToday: habitsCompletedToday,
        weeklyCompletionRate,
        streaks: habitStreaks.sort((a, b) => b.streak - a.streak),
      },
      landmarks,
      // Phase 4
      mood: {
        avgMood,
        avgEnergy,
        entryCount: moodEntries.length,
        sparkline: moodSparkline,
      },
      finance: {
        weeklySpend,
        topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
        transactionCount: transactions.length,
      },
      people: {
        followUpCount: followUps.length,
        overdueCount: overdueFollowUps.length,
        upcoming: followUps.slice(0, 3).map((i) => ({
          personName: i.person.name,
          personId: i.person.id,
          followUp: i.followUp,
          dueDate: i.dueDate,
          overdue: i.dueDate ? new Date(i.dueDate) < now : false,
        })),
      },
      media: {
        inProgress: inProgressMedia,
      },
      weeklySummary: latestWeeklySummary
        ? { report: latestWeeklySummary.report, weekStart: latestWeeklySummary.weekStart }
        : null,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
