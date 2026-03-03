// Suggestion Service
// Analyzes user data to generate proactive suggestions

import prisma from "@/lib/db";
import { calculateStreak } from "./habitService";

export interface Suggestion {
  id: string;
  type: "overdue" | "streak-risk" | "pattern" | "reminder" | "achievement";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    todoId?: string;
    habitId?: string;
  };
}

/**
 * Get overdue tasks that need attention
 */
async function getOverdueSuggestions(): Promise<Suggestion[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTodos = await prisma.todo.findMany({
    where: {
      status: "pending",
      dueDate: {
        lt: today,
      },
    },
    orderBy: { dueDate: "asc" },
    take: 3,
  });

  return overdueTodos.map((todo) => {
    const daysOverdue = Math.ceil(
      (today.getTime() - new Date(todo.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: `overdue-${todo.id}`,
      type: "overdue" as const,
      priority: daysOverdue > 7 ? "high" as const : "medium" as const,
      title: "Overdue Task",
      description: `"${todo.title}" was due ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago`,
      action: {
        label: "View Task",
        href: "/todos",
        todoId: todo.id,
      },
    };
  });
}

/**
 * Check for habits with streaks at risk
 */
async function getStreakRiskSuggestions(): Promise<Suggestion[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const habits = await prisma.habit.findMany({
    where: { active: true },
    include: {
      records: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  const suggestions: Suggestion[] = [];

  for (const habit of habits) {
    const { streak, completedToday } = calculateStreak(
      habit.records.map((r) => ({
        date: r.date,
        completed: r.completed,
      })),
      today
    );

    // If habit has a streak of 3+ days and not completed today, it's at risk
    if (streak >= 3 && !completedToday) {
      suggestions.push({
        id: `streak-risk-${habit.id}`,
        type: "streak-risk",
        priority: streak >= 7 ? "high" : "medium",
        title: "Streak at Risk!",
        description: `Your ${streak}-day "${habit.name}" streak is at risk. Complete it today!`,
        action: {
          label: "Complete Now",
          href: "/habits",
          habitId: habit.id,
        },
      });
    }
  }

  return suggestions.slice(0, 2);
}

/**
 * Check for upcoming deadlines in the next 2 days
 */
async function getUpcomingDeadlineSuggestions(): Promise<Suggestion[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  const upcomingTodos = await prisma.todo.findMany({
    where: {
      status: "pending",
      dueDate: {
        gte: today,
        lte: twoDaysFromNow,
      },
    },
    orderBy: { dueDate: "asc" },
    take: 3,
  });

  return upcomingTodos.map((todo) => {
    const dueDate = new Date(todo.dueDate!);
    const isToday = dueDate.getTime() === today.getTime();
    const isTomorrow = dueDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000;

    return {
      id: `deadline-${todo.id}`,
      type: "reminder" as const,
      priority: isToday ? "high" as const : "medium" as const,
      title: isToday ? "Due Today" : isTomorrow ? "Due Tomorrow" : "Upcoming Deadline",
      description: `"${todo.title}" is due ${isToday ? "today" : isTomorrow ? "tomorrow" : "soon"}`,
      action: {
        label: "View Task",
        href: "/todos",
        todoId: todo.id,
      },
    };
  });
}

/**
 * Check for recent achievements (completed streaks, task completions)
 */
async function getAchievementSuggestions(): Promise<Suggestion[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Count tasks completed this week
  const completedThisWeek = await prisma.todo.count({
    where: {
      status: "done",
      completedAt: {
        gte: weekAgo,
      },
    },
  });

  const suggestions: Suggestion[] = [];

  if (completedThisWeek >= 10) {
    suggestions.push({
      id: "achievement-tasks",
      type: "achievement",
      priority: "low",
      title: "Great Progress!",
      description: `You've completed ${completedThisWeek} tasks this week. Keep up the momentum!`,
    });
  }

  // Check for milestone streaks
  const habits = await prisma.habit.findMany({
    where: { active: true },
    include: {
      records: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  for (const habit of habits) {
    const { streak } = calculateStreak(
      habit.records.map((r) => ({
        date: r.date,
        completed: r.completed,
      })),
      today
    );

    if (streak === 7 || streak === 14 || streak === 30) {
      suggestions.push({
        id: `achievement-streak-${habit.id}`,
        type: "achievement",
        priority: "low",
        title: `${streak}-Day Streak!`,
        description: `Amazing! You've maintained "${habit.name}" for ${streak} days straight!`,
      });
    }
  }

  return suggestions.slice(0, 1);
}

/**
 * Get all suggestions, sorted by priority
 */
export async function getSuggestions(): Promise<Suggestion[]> {
  const [overdue, streakRisk, upcoming, achievements] = await Promise.all([
    getOverdueSuggestions(),
    getStreakRiskSuggestions(),
    getUpcomingDeadlineSuggestions(),
    getAchievementSuggestions(),
  ]);

  const all = [...overdue, ...streakRisk, ...upcoming, ...achievements];

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  all.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return all.slice(0, 4);
}
