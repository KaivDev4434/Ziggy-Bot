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

    const [todoStats, habitStreaks, habits, landmarks] = await Promise.all([
      getTodoStats(),
      getHabitStreaks(),
      prisma.habit.findMany({
        where: { active: true },
        include: {
          records: {
            where: { date: { gte: weekAgo } },
          },
        },
      }),
      prisma.landmark.findMany({
        orderBy: { date: "desc" },
        take: DASHBOARD_LANDMARKS_QUERY,
      }),
    ]);

    const habitsCompletedToday = habits.filter((h) =>
      h.records.some((r) => {
        const recordDate = new Date(r.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime() && r.completed;
      })
    ).length;

    // Calculate weekly habit completion rate
    const totalPossibleCompletions = habits.length * 7;
    const actualCompletions = habits.reduce(
      (sum, h) => sum + h.records.filter((r) => r.completed).length,
      0
    );
    const weeklyCompletionRate =
      totalPossibleCompletions > 0
        ? Math.round((actualCompletions / totalPossibleCompletions) * 100)
        : 0;

    return NextResponse.json({
      todos: todoStats,
      habits: {
        total: habits.length,
        completedToday: habitsCompletedToday,
        weeklyCompletionRate,
        streaks: habitStreaks.sort((a, b) => b.streak - a.streak),
      },
      landmarks,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
