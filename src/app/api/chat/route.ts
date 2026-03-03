import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { processMessage, buildAIContext } from "@/lib/ai";
import { RECENT_MESSAGES_FOR_CONTEXT, HABIT_RECORDS_LOOKBACK } from "@/lib/constants";
import { cleanCitations, parseLocalDate, getEffectiveDate, toLocalDateString } from "@/lib/utils";
import { processTodoAction } from "@/lib/services/todoService";
import { processAndSaveMemories, buildMemoryContext } from "@/lib/services/memoryService";
import { buildCalendarContext } from "@/lib/services/calendarService";
import { getRecentNotesContext } from "@/lib/services/obsidianService";

export async function POST(request: NextRequest) {
  try {
    const { message, date, location } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Parse the date for message grouping (defaults to today)
    // Use parseLocalDate to avoid timezone issues
    const messageDate = date 
      ? parseLocalDate(date.split("T")[0]) 
      : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

    // Prevent sending messages to past days (respect late-night mode: 12AM-4AM counts as previous day)
    const effectiveToday = getEffectiveDate();
    const messageDateStr = toLocalDateString(messageDate);
    const effectiveTodayStr = toLocalDateString(effectiveToday);
    if (messageDateStr < effectiveTodayStr) {
      return NextResponse.json(
        { error: "Cannot send messages to past days. Past conversations are read-only." },
        { status: 400 }
      );
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        role: "user",
        content: message,
        date: messageDate,
      },
    });

    // Get recent messages for context (from the same day)
    const dayStart = new Date(messageDate);
    const dayEnd = new Date(messageDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const recentMessages = await prisma.message.findMany({
      where: {
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_MESSAGES_FOR_CONTEXT,
    });

    // Fetch current todos, habits, calendar, and notes context for AI
    const [allTodos, allHabits, memoryContext, calendarContext, notesContext] = await Promise.all([
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
      buildMemoryContext(),
      buildCalendarContext(),
      getRecentNotesContext(),
    ]);

    // Build AI context with location if provided
    const aiContext = buildAIContext(
      allTodos,
      allHabits.map((h) => ({
        name: h.name,
        records: h.records.map((r) => ({
          date: r.date,
          completed: r.completed,
        })),
      })),
      location // Pass location to AI context
    );

    // Process with AI, including memory, calendar, and notes context
    const aiResult = await processMessage(
      message,
      recentMessages.reverse().map((m) => ({
        role: m.role,
        content: m.content,
      })),
      aiContext,
      memoryContext + calendarContext + notesContext
    );

    // Process extracted todos with actions
    let todosCreated = 0;
    let todosUpdated = 0;
    let todosCompleted = 0;
    let todosDeleted = 0;

    if (aiResult.todos.length > 0) {
      for (const todo of aiResult.todos) {
        await processTodoAction(todo, allTodos);
        
        switch (todo.action) {
          case "create":
            todosCreated++;
            break;
          case "update":
            todosUpdated++;
            break;
          case "complete":
            todosCompleted++;
            break;
          case "delete":
            todosDeleted++;
            break;
        }
      }
    }

    // Save extracted habits
    if (aiResult.habits.length > 0) {
      for (const habit of aiResult.habits) {
        // Check if habit already exists (case-insensitive)
        const existing = await prisma.habit.findFirst({
          where: { 
            name: { 
              equals: habit.name,
            },
            active: true,
          },
        });
        if (!existing) {
          await prisma.habit.create({
            data: {
              name: habit.name,
              frequency: habit.frequency,
            },
          });
        }
      }
    }

    // Save extracted landmarks
    if (aiResult.landmarks.length > 0) {
      await prisma.landmark.createMany({
        data: aiResult.landmarks.map((landmark) => ({
          title: landmark.title,
          date: new Date(landmark.date),
          notes: landmark.notes,
        })),
      });
    }

    // Clean citations from AI response and save assistant message
    const cleanedResponse = cleanCitations(aiResult.conversationalResponse);
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        content: cleanedResponse,
        date: messageDate,
      },
    });

    // Extract and save memories in the background (non-blocking)
    processAndSaveMemories(message, cleanedResponse).catch((err) =>
      console.error("Background memory extraction failed:", err)
    );

    return NextResponse.json({
      userMessage,
      assistantMessage,
      extractions: {
        todosCreated,
        todosUpdated,
        todosCompleted,
        todosDeleted,
        habits: aiResult.habits.length,
        landmarks: aiResult.landmarks.length,
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

