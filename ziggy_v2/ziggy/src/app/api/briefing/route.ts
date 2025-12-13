import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateBriefing } from "@/lib/briefing";

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json();

    // Parse the date
    const briefingDate = date ? new Date(date) : new Date();
    briefingDate.setHours(0, 0, 0, 0);

    // Check if there's already a briefing message for this date
    const dayEnd = new Date(briefingDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existingMessages = await prisma.message.findFirst({
      where: {
        date: {
          gte: briefingDate,
          lt: dayEnd,
        },
        role: "assistant",
      },
    });

    // If there's already a message for this day, don't generate a new briefing
    if (existingMessages) {
      return NextResponse.json({ message: null });
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
            take: 30,
          },
        },
      }),
    ]);

    // Generate the briefing content
    const briefingContent = await generateBriefing(
      todos,
      habits.map((h) => ({
        name: h.name,
        records: h.records.map((r) => ({
          date: r.date,
          completed: r.completed,
        })),
      }))
    );

    // Save the briefing as an assistant message
    const message = await prisma.message.create({
      data: {
        role: "assistant",
        content: briefingContent,
        date: briefingDate,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Briefing error:", error);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}

