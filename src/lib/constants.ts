// ============================================================
// Centralized constants for the Ziggy application
// ============================================================

// --- Storage Keys ---
export const STORAGE_KEYS = {
  SELECTED_DATE: "ziggy_selected_date",
  MESSAGES_CACHE: "ziggy_messages_cache",
  MESSAGE_DATES: "ziggy_message_dates",
  LAST_FETCHED_DATE: "ziggy_last_fetched_date",
  HIDE_COMPLETED: "ziggy_hide_completed",
  SIDEBAR_OPEN: "ziggy_sidebar_open",
  USER_LOCATION: "ziggy_user_location",
} as const;

// --- Time & Retention ---
export const LATE_NIGHT_CUTOFF_HOUR = 4;
export const MESSAGE_RETENTION_DAYS = 90;
export const MESSAGE_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const LOCATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const LOCATION_TIMEOUT_MS = 10_000;
export const LOCATION_MAX_AGE_MS = 300_000;
export const LATE_NIGHT_CHECK_INTERVAL_MS = 60_000;

// --- Query Limits ---
export const MAX_MESSAGES_PER_DAY = 100;
export const RECENT_MESSAGES_FOR_CONTEXT = 10;
export const HABIT_RECORDS_LOOKBACK = 30;
export const MAX_STREAK_DAYS = 365;
export const UPCOMING_DEADLINE_DAYS = 7;

// --- Dashboard Display Limits ---
export const DASHBOARD_HABITS_SHOWN = 4;
export const DASHBOARD_LANDMARKS_SHOWN = 3;
export const BRIEFING_DEADLINES_SHOWN = 5;
export const DASHBOARD_LANDMARKS_QUERY = 5;

// --- AI Configuration ---
export const AI_CONFIG = {
  PERPLEXITY_API_URL: "https://api.perplexity.ai/chat/completions",
  DEFAULT_MODEL: "sonar",
  MAX_TOKENS: 1500,
  TEMPERATURE: 0.3,
} as const;

// --- App Metadata ---
export const APP_VERSION = "v1.1";

// --- Category Colors ---
// Used across TodoItem, EditTodoModal, and todos page
export const CATEGORY_COLORS: Record<string, string> = {
  work: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  personal: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  chores: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  groceries: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  finance: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  health: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
  projects: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
  errands: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  shopping: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
};

export const CATEGORY_DOT_COLORS: Record<string, string> = {
  work: "bg-blue-500 dark:bg-blue-400",
  personal: "bg-purple-500 dark:bg-purple-400",
  chores: "bg-orange-500 dark:bg-orange-400",
  groceries: "bg-green-500 dark:bg-green-400",
  finance: "bg-emerald-500 dark:bg-emerald-400",
  health: "bg-pink-500 dark:bg-pink-400",
  projects: "bg-indigo-500 dark:bg-indigo-400",
  errands: "bg-amber-500 dark:bg-amber-400",
  shopping: "bg-teal-500 dark:bg-teal-400",
};

export const DEFAULT_CATEGORY_COLOR = "bg-muted text-muted-foreground border-border";
export const DEFAULT_CATEGORY_DOT = "bg-muted-foreground/50";

export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return DEFAULT_CATEGORY_COLOR;
  return CATEGORY_COLORS[category.toLowerCase()] ?? DEFAULT_CATEGORY_COLOR;
}

export function getCategoryDotColor(category: string | null | undefined): string {
  if (!category) return DEFAULT_CATEGORY_DOT;
  return CATEGORY_DOT_COLORS[category.toLowerCase()] ?? DEFAULT_CATEGORY_DOT;
}

// --- Priority Colors ---
export const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  2: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  3: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
};

export const PRIORITY_LABELS: Record<number, string> = {
  1: "High",
  2: "Medium",
  3: "Low",
};

export const PRIORITY_OPTIONS = [
  { value: 1, label: "High", color: PRIORITY_COLORS[1] },
  { value: 2, label: "Medium", color: PRIORITY_COLORS[2] },
  { value: 3, label: "Low", color: PRIORITY_COLORS[3] },
] as const;

// --- Navigation ---
export const NAV_ITEMS = [
  { href: "/", label: "Chat" },
  { href: "/todos", label: "Tasks" },
  { href: "/habits", label: "Habits" },
  { href: "/dashboard", label: "Dashboard" },
] as const;
