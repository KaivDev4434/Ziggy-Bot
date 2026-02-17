import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the effective date for chat sessions.
 * Treats 12:00 AM - 4:00 AM as the previous day's chat session
 * to handle late-night usage gracefully.
 */
export function getEffectiveDate(now = new Date(), cutoffHour = 4): Date {
  const date = new Date(now);
  if (date.getHours() < cutoffHour) {
    date.setDate(date.getDate() - 1);
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Check if the current time is in "late night" mode (between midnight and cutoff)
 */
export function isLateNightMode(now = new Date(), cutoffHour = 4): boolean {
  return now.getHours() < cutoffHour;
}

/**
 * Format a date string to local date (YYYY-MM-DD) without timezone issues
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a local date string (YYYY-MM-DD) to Date at midnight local time
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return toLocalDateString(date1) === toLocalDateString(date2);
}

/**
 * Check if a date is in the past (before today)
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() < today.getTime();
}

/**
 * Clean Perplexity API citation markers from text
 * Removes patterns like [1], [2], etc.
 */
export function cleanCitations(text: string): string {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
