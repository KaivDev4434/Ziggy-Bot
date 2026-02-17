// Habit business logic and database operations

import prisma from "@/lib/db";
import { MAX_STREAK_DAYS, HABIT_RECORDS_LOOKBACK } from "@/lib/constants";

// --- Streak Calculation (single source of truth) ---

export interface StreakResult {
  streak: number;
  completedToday: boolean;
}

/**
 * Calculate the current streak for a habit given its completion records.
 * A streak counts consecutive days of completion going backwards from today.
 * If today is not yet completed, counting starts from yesterday.
 */
export function calculateStreak(
  records: { date: Date | string; completed: boolean }[],
  today?: Date
): StreakResult {
  const todayDate = today ? new Date(today) : new Date();
  todayDate.setHours(0, 0, 0, 0);

  const sortedTimestamps = records
    .filter((r) => r.completed)
    .map((r) => {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
    .sort((a, b) => b - a);

  const completedToday = sortedTimestamps.includes(todayDate.getTime());

  let streak = 0;
  const checkDate = new Date(todayDate);
  if (!completedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < MAX_STREAK_DAYS; i++) {
    if (sortedTimestamps.includes(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak, completedToday };
}

// --- Database Operations ---

export async function getAllActiveHabits() {
  return prisma.habit.findMany({
    where: { active: true },
    include: {
      records: {
        orderBy: { date: "desc" },
        take: HABIT_RECORDS_LOOKBACK,
      },
    },
  });
}

export async function getHabitById(id: string) {
  return prisma.habit.findUnique({
    where: { id },
    include: {
      records: {
        orderBy: { date: "desc" },
        take: HABIT_RECORDS_LOOKBACK,
      },
    },
  });
}

export async function createHabit(name: string, frequency: string = "daily") {
  return prisma.habit.create({
    data: { name, frequency },
  });
}

export async function deactivateHabit(id: string) {
  return prisma.habit.update({
    where: { id },
    data: { active: false },
  });
}

export async function recordHabitCompletion(
  habitId: string,
  date: Date,
  completed: boolean
) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  if (!completed) {
    // Remove the record for this date
    await prisma.habitRecord.deleteMany({
      where: {
        habitId,
        date: normalizedDate,
      },
    });
    return null;
  }

  // Upsert: create or update the record
  const existing = await prisma.habitRecord.findFirst({
    where: {
      habitId,
      date: normalizedDate,
    },
  });

  if (existing) {
    return prisma.habitRecord.update({
      where: { id: existing.id },
      data: { completed: true },
    });
  }

  return prisma.habitRecord.create({
    data: {
      habitId,
      date: normalizedDate,
      completed: true,
    },
  });
}

/**
 * Get habit streaks for the dashboard/briefing.
 * Returns an array of habits with their streak and today's completion status.
 */
export async function getHabitStreaks(today?: Date) {
  const habits = await getAllActiveHabits();
  return habits.map((habit) => {
    const { streak, completedToday } = calculateStreak(habit.records, today);
    return {
      id: habit.id,
      name: habit.name,
      streak,
      completedToday,
    };
  });
}
