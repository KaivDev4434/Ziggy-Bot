import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Retention period in days
const RETENTION_DAYS = 90;

// Run cleanup periodically (not on every request, use a simple time-based check)
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Once per day

async function cleanupOldMessages() {
  const now = Date.now();
  
  // Skip if we cleaned up recently
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    return;
  }
  
  lastCleanupTime = now;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    cutoffDate.setHours(0, 0, 0, 0);
    
    const result = await prisma.message.deleteMany({
      where: {
        date: {
          lt: cutoffDate,
        },
      },
    });
    
    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} messages older than ${RETENTION_DAYS} days`);
    }
  } catch (error) {
    console.error("Failed to cleanup old messages:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Run cleanup in background (non-blocking)
    cleanupOldMessages();

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // Parse date using local components to avoid timezone issues
    let where = {};
    
    if (dateParam) {
      // Parse YYYY-MM-DD format
      const [year, month, day] = dateParam.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      where = {
        date: {
          gte: date,
          lt: nextDay,
        },
      };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100, // Limit to last 100 messages per day
    });

    // Get dates that have messages (for calendar dots)
    // Only get dates within retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    cutoffDate.setHours(0, 0, 0, 0);

    const messageDates = await prisma.message.groupBy({
      by: ["date"],
      where: {
        date: {
          gte: cutoffDate,
        },
      },
      orderBy: { date: "desc" },
    });

    // Format dates to local YYYY-MM-DD strings
    const formattedDates = messageDates.map((m) => {
      const d = new Date(m.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });

    return NextResponse.json({
      messages,
      messageDates: formattedDates,
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
