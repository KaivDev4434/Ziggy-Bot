// Message business logic and database operations

import prisma from "@/lib/db";
import {
  MESSAGE_RETENTION_DAYS,
  MESSAGE_CLEANUP_INTERVAL_MS,
  MAX_MESSAGES_PER_DAY,
} from "@/lib/constants";

// --- Cleanup ---

let lastCleanupTime = 0;

export async function cleanupOldMessages() {
  const now = Date.now();
  if (now - lastCleanupTime < MESSAGE_CLEANUP_INTERVAL_MS) return;

  lastCleanupTime = now;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MESSAGE_RETENTION_DAYS);
    cutoffDate.setHours(0, 0, 0, 0);

    const result = await prisma.message.deleteMany({
      where: { date: { lt: cutoffDate } },
    });

    if (result.count > 0) {
      console.log(
        `Cleaned up ${result.count} messages older than ${MESSAGE_RETENTION_DAYS} days`
      );
    }
  } catch (error) {
    console.error("Failed to cleanup old messages:", error);
  }
}

// --- Database Operations ---

export async function getMessagesForDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  return prisma.message.findMany({
    where: { date: { gte: date, lt: nextDay } },
    orderBy: { createdAt: "asc" },
    take: MAX_MESSAGES_PER_DAY,
  });
}

export async function getMessageDates() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MESSAGE_RETENTION_DAYS);
  cutoffDate.setHours(0, 0, 0, 0);

  const messageDates = await prisma.message.groupBy({
    by: ["date"],
    where: { date: { gte: cutoffDate } },
    orderBy: { date: "desc" },
  });

  return messageDates.map((m) => {
    const d = new Date(m.date);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  });
}

export async function createMessage(
  role: "user" | "assistant",
  content: string,
  date: Date
) {
  return prisma.message.create({
    data: { role, content, date },
  });
}

export async function getRecentMessagesForDay(date: Date, limit: number) {
  const dayStart = new Date(date);
  const dayEnd = new Date(date);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return prisma.message.findMany({
    where: { date: { gte: dayStart, lt: dayEnd } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
