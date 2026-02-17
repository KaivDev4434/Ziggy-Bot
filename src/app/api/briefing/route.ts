import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateBriefing } from "@/lib/briefing";
import { HABIT_RECORDS_LOOKBACK } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const { date, lat, lon, forceRegenerate } = await request.json();

    // Parse the date
    const briefingDate = date ? new Date(date) : new Date();
    briefingDate.setHours(0, 0, 0, 0);

    // Check if there's already a briefing message for this date
    const dayEnd = new Date(briefingDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existingBriefing = await prisma.message.findFirst({
      where: {
        date: {
          gte: briefingDate,
          lt: dayEnd,
        },
        role: "assistant",
      },
      orderBy: { createdAt: "asc" },
    });

    // If there's already a briefing and not forcing regeneration, skip
    if (existingBriefing && !forceRegenerate) {
      return NextResponse.json({ message: null, existing: true });
    }

    // Fetch todos and habits for briefing
    const [todos, habits] = await Promise.all([
      prisma.todo.findMany({
        select: {
          id: true,
          title: true,
          category: true,
          priority: true,
          dueDate: true,
          doDate: true,
          status: true,
        },
      }),
      prisma.habit.findMany({
        where: { active: true },
        include: {
          records: {
            orderBy: { date: "desc" },
            take: HABIT_RECORDS_LOOKBACK,
          },
        },
      }),
    ]);

    // Generate the briefing content with location if provided
    const briefingContent = await generateBriefing(
      todos,
      habits.map((h) => ({
        name: h.name,
        records: h.records.map((r) => ({
          date: r.date,
          completed: r.completed,
        })),
      })),
      { lat, lon }
    );

    let message;
    
    if (existingBriefing && forceRegenerate) {
      // Update existing briefing with new content and timestamp
      message = await prisma.message.update({
        where: { id: existingBriefing.id },
        data: {
          content: briefingContent,
          createdAt: new Date(), // Update timestamp so it appears as latest message
        },
      });
    } else {
      // Create new briefing
      message = await prisma.message.create({
        data: {
          role: "assistant",
          content: briefingContent,
          date: briefingDate,
        },
      });
    }

    return NextResponse.json({ message, regenerated: forceRegenerate });
  } catch (error) {
    console.error("Briefing error:", error);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
