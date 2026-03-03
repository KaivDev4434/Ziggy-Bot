/**
 * Shared habit logic: streak calculation, milestones, scheduling.
 * Used by both client components and server API routes.
 */

export type FrequencyType = "every_day" | "specific_days" | "times_per_week" | "times_per_month";

export interface HabitConfig {
  frequencyType: FrequencyType;
  frequencyDays?: number[] | null; // 0=Sun, 1=Mon...6=Sat
  frequencyTarget?: number | null; // for times_per_week / times_per_month
}

export interface HabitRecord {
  date: Date | string;
  completed: boolean;
}

// ─── Milestones ──────────────────────────────────────────────
export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 180, 365] as const;

export interface MilestoneInfo {
  currentStreak: number;
  bestStreak: number;
  nextMilestone: number | null;
  progressToNext: number; // 0-1
  reachedMilestones: number[];
  isNewBest: boolean;
}

export function getMilestoneInfo(currentStreak: number, bestStreak: number): MilestoneInfo {
  const reached = STREAK_MILESTONES.filter((m) => currentStreak >= m);
  const next = STREAK_MILESTONES.find((m) => currentStreak < m) ?? null;
  const prevMilestone = reached.length > 0 ? reached[reached.length - 1] : 0;
  const progress = next ? (currentStreak - prevMilestone) / (next - prevMilestone) : 1;

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    nextMilestone: next,
    progressToNext: Math.min(1, Math.max(0, progress)),
    reachedMilestones: reached as unknown as number[],
    isNewBest: currentStreak > bestStreak && currentStreak > 0,
  };
}

export function getMilestoneLabel(milestone: number): string {
  if (milestone >= 365) return `${Math.floor(milestone / 365)} year${milestone >= 730 ? "s" : ""}`;
  if (milestone >= 30) return `${Math.floor(milestone / 30)} month${milestone >= 60 ? "s" : ""}`;
  if (milestone >= 7) return `${Math.floor(milestone / 7)} week${milestone >= 14 ? "s" : ""}`;
  return `${milestone} days`;
}

// ─── Day helpers ─────────────────────────────────────────────

const DAY_LABELS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_LABELS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getDayLabel(day: number, short = true): string {
  return short ? DAY_LABELS_SHORT[day] : DAY_LABELS_FULL[day];
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeDate(d: Date | string): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

// ─── Scheduling: which days is this habit "due"? ─────────────

export function isHabitDueOnDate(config: HabitConfig, date: Date): boolean {
  const d = normalizeDate(date);
  const dayOfWeek = d.getDay(); // 0=Sun

  switch (config.frequencyType) {
    case "every_day":
      return true;

    case "specific_days":
      return (config.frequencyDays ?? []).includes(dayOfWeek);

    case "times_per_week":
    case "times_per_month":
      // Every day is a valid day to complete; streak is checked at period level
      return true;

    default:
      return true;
  }
}

/**
 * Get a human-readable label for the frequency configuration.
 */
export function getFrequencyLabel(config: HabitConfig): string {
  switch (config.frequencyType) {
    case "every_day":
      return "Every day";

    case "specific_days": {
      const days = config.frequencyDays ?? [];
      if (days.length === 0) return "No days selected";
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Weekdays";
      if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
      return days.map((d) => getDayLabel(d, false)).join(", ");
    }

    case "times_per_week":
      return `${config.frequencyTarget ?? 0}x per week`;

    case "times_per_month":
      return `${config.frequencyTarget ?? 0}x per month`;

    default:
      return "Custom";
  }
}

// ─── Streak Calculation ──────────────────────────────────────

/**
 * Calculate the current streak for a habit given its config and records.
 * Different frequency types have different streak semantics:
 *
 *   every_day       — must complete every single day
 *   specific_days   — must complete on each scheduled day; off-days are skipped
 *   times_per_week  — must hit the weekly target; streak counts in weeks
 *   times_per_month — must hit the monthly target; streak counts in months
 */
export function calculateStreak(
  config: HabitConfig,
  records: HabitRecord[]
): number {
  const completedDates = new Set(
    records
      .filter((r) => r.completed)
      .map((r) => toDateKey(normalizeDate(r.date)))
  );

  if (completedDates.size === 0) return 0;

  switch (config.frequencyType) {
    case "every_day":
      return calcStreakEveryDay(completedDates);

    case "specific_days":
      return calcStreakSpecificDays(completedDates, config.frequencyDays ?? []);

    case "times_per_week":
      return calcStreakTimesPerWeek(completedDates, config.frequencyTarget ?? 1);

    case "times_per_month":
      return calcStreakTimesPerMonth(completedDates, config.frequencyTarget ?? 1);

    default:
      return calcStreakEveryDay(completedDates);
  }
}

function calcStreakEveryDay(completedDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // If today isn't completed, start from yesterday
  if (!completedDates.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 730; i++) {
    if (completedDates.has(toDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function calcStreakSpecificDays(completedDates: Set<string>, scheduledDays: number[]): number {
  if (scheduledDays.length === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Walk backwards, only counting scheduled days
  // First, skip today if it's a scheduled day and not yet completed
  if (scheduledDays.includes(cursor.getDay()) && !completedDates.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 730; i++) {
    if (!scheduledDays.includes(cursor.getDay())) {
      // Not a scheduled day, skip without breaking
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (completedDates.has(toDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function calcStreakTimesPerWeek(completedDates: Set<string>, target: number): number {
  // Streak is counted in whole weeks (Mon-Sun)
  // Current week is checked: if target already met, it counts
  let streak = 0;

  // Start from the current week's Monday
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentDayOfWeek = now.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);

  // Check current week first
  const currentWeekCount = countCompletionsInRange(completedDates, weekStart, 7);
  const currentWeekMet = currentWeekCount >= target;

  // If current week target is met, count it and go backwards
  // If not, start checking from last week
  const checkFrom = new Date(weekStart);
  if (currentWeekMet) {
    streak++;
  }
  checkFrom.setDate(checkFrom.getDate() - 7); // Go to previous week

  for (let w = 0; w < 104; w++) {
    const count = countCompletionsInRange(completedDates, checkFrom, 7);
    if (count >= target) {
      streak++;
      checkFrom.setDate(checkFrom.getDate() - 7);
    } else {
      break;
    }
  }

  return streak;
}

function calcStreakTimesPerMonth(completedDates: Set<string>, target: number): number {
  let streak = 0;
  const now = new Date();

  // Start from current month
  let year = now.getFullYear();
  let month = now.getMonth();

  // Check current month
  const currentMonthCount = countCompletionsInMonth(completedDates, year, month);
  if (currentMonthCount >= target) {
    streak++;
  }

  // Go backwards
  for (let m = 0; m < 24; m++) {
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
    const count = countCompletionsInMonth(completedDates, year, month);
    if (count >= target) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function countCompletionsInRange(completedDates: Set<string>, start: Date, days: number): number {
  let count = 0;
  const cursor = new Date(start);
  for (let i = 0; i < days; i++) {
    if (completedDates.has(toDateKey(cursor))) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function countCompletionsInMonth(completedDates: Set<string>, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (completedDates.has(toDateKey(date))) count++;
  }
  return count;
}

// ─── Period progress (for times_per_week / times_per_month) ──

export interface PeriodProgress {
  completed: number;
  target: number;
  label: string;
}

export function getCurrentPeriodProgress(
  config: HabitConfig,
  records: HabitRecord[]
): PeriodProgress | null {
  if (config.frequencyType !== "times_per_week" && config.frequencyType !== "times_per_month") {
    return null;
  }

  const completedDates = new Set(
    records.filter((r) => r.completed).map((r) => toDateKey(normalizeDate(r.date)))
  );

  if (config.frequencyType === "times_per_week") {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    const count = countCompletionsInRange(completedDates, weekStart, 7);
    return {
      completed: count,
      target: config.frequencyTarget ?? 1,
      label: "this week",
    };
  }

  if (config.frequencyType === "times_per_month") {
    const now = new Date();
    const count = countCompletionsInMonth(completedDates, now.getFullYear(), now.getMonth());
    return {
      completed: count,
      target: config.frequencyTarget ?? 1,
      label: "this month",
    };
  }

  return null;
}
