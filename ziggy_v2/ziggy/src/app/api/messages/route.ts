import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    let where = {};
    
    if (dateParam) {
      const date = new Date(dateParam);
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
      take: 100, // Limit to last 100 messages
    });

    // Get dates that have messages (for calendar dots)
    const messageDates = await prisma.message.groupBy({
      by: ["date"],
      orderBy: { date: "desc" },
      take: 90, // Last 90 days
    });

    return NextResponse.json({ 
      messages,
      messageDates: messageDates.map(m => m.date.toISOString().split("T")[0]),
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

