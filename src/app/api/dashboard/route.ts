import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get todos stats
    const [pendingTodos, completedThisWeek, totalTodos] = await Promise.all([
      prisma.todo.count({ where: { status: "pending" } }),
      prisma.todo.count({
        where: {
          status: "done",
          completedAt: { gte: weekAgo },
        },
      }),
      prisma.todo.count(),
    ]);

    // Get habits with today's completion status
    const habits = await prisma.habit.findMany({
      where: { active: true },
      include: {
        records: {
          where: {
            date: { gte: weekAgo },
          },
        },
      },
    });

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

    // Calculate streaks for each habit
    const habitStreaks = habits.map((habit) => {
      const sortedRecords = habit.records
        .map((r) => {
          const d = new Date(r.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
        .sort((a, b) => b - a);

      let streak = 0;
      let currentDate = new Date(today);

      // Check if completed today
      const completedToday = sortedRecords.includes(today.getTime());
      if (!completedToday) {
        currentDate.setDate(currentDate.getDate() - 1);
      }

      for (let i = 0; i < 365; i++) {
        const checkTime = currentDate.getTime();
        if (sortedRecords.includes(checkTime)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return {
        id: habit.id,
        name: habit.name,
        streak,
        completedToday,
      };
    });

    // Get recent landmarks
    const landmarks = await prisma.landmark.findMany({
      orderBy: { date: "desc" },
      take: 5,
    });

    return NextResponse.json({
      todos: {
        pending: pendingTodos,
        completedThisWeek,
        total: totalTodos,
      },
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


