import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { MAX_MESSAGES_PER_DAY } from "@/lib/constants";
import {
  cleanupOldMessages,
  getMessagesForDate,
  getMessageDates,
} from "@/lib/services/messageService";

export async function GET(request: NextRequest) {
  try {
    cleanupOldMessages();

    const dateParam = request.nextUrl.searchParams.get("date");

    const [messages, messageDates] = await Promise.all([
      dateParam
        ? getMessagesForDate(dateParam)
        : prisma.message.findMany({
            orderBy: { createdAt: "asc" },
            take: MAX_MESSAGES_PER_DAY,
          }),
      getMessageDates(),
    ]);

    return NextResponse.json({ messages, messageDates });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
