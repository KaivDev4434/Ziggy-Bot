import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { processMessage, buildAIContext, ExtractedTodo } from "@/lib/ai";
import { cleanCitations, isPastDate, parseLocalDate } from "@/lib/utils";

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

    // Prevent sending messages to past days
    if (isPastDate(messageDate)) {
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
      take: 10,
    });

    // Fetch current todos and habits for AI context
    const [allTodos, allHabits] = await Promise.all([
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
            take: 30, // Last 30 records for streak calculation
          },
        },
      }),
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

    // Process with AI
    const aiResult = await processMessage(
      message,
      recentMessages.reverse().map((m) => ({
        role: m.role,
        content: m.content,
      })),
      aiContext
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

// Helper function to process todo actions
async function processTodoAction(
  todo: ExtractedTodo,
  existingTodos: { id: string; title: string; status: string }[]
) {
  const action = todo.action || "create";

  // For update/complete/delete, try to find matching todo
  let matchedTodoId = todo.id;
  
  if (!matchedTodoId && action !== "create") {
    // Try to match by title (fuzzy match)
    const normalizedTitle = todo.title.toLowerCase().trim();
    const match = existingTodos.find((t) => {
      const existingTitle = t.title.toLowerCase().trim();
      return (
        existingTitle === normalizedTitle ||
        existingTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(existingTitle)
      );
    });
    matchedTodoId = match?.id;
  }

  switch (action) {
    case "create": {
      // Check for duplicate before creating
      const normalizedTitle = todo.title.toLowerCase().trim();
      const existingMatch = existingTodos.find((t) => {
        const existingTitle = t.title.toLowerCase().trim();
        // Exact match or very similar
        return existingTitle === normalizedTitle;
      });

      if (existingMatch) {
        // Task already exists - update it instead of creating duplicate
        const updateData: Record<string, unknown> = {};
        if (todo.description) updateData.description = todo.description;
        if (todo.priority) updateData.priority = todo.priority;
        if (todo.dueDate) updateData.dueDate = new Date(todo.dueDate);
        if (todo.doDate) updateData.doDate = new Date(todo.doDate);
        if (todo.category) updateData.category = todo.category;

        if (Object.keys(updateData).length > 0) {
          await prisma.todo.update({
            where: { id: existingMatch.id },
            data: updateData,
          });
        }
        // Don't create a new one
      } else {
        // No duplicate found, create new task
        await prisma.todo.create({
          data: {
            title: todo.title,
            description: todo.description || null,
            priority: todo.priority || null,
            dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
            doDate: todo.doDate ? new Date(todo.doDate) : null,
            category: todo.category || null,
          },
        });
      }
      break;
    }

    case "update":
      if (matchedTodoId) {
        const updateData: Record<string, unknown> = {};
        if (todo.title) updateData.title = todo.title;
        if (todo.description !== undefined) updateData.description = todo.description;
        if (todo.priority !== undefined) updateData.priority = todo.priority;
        if (todo.dueDate !== undefined) updateData.dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
        if (todo.doDate !== undefined) updateData.doDate = todo.doDate ? new Date(todo.doDate) : null;
        if (todo.category !== undefined) updateData.category = todo.category;

        await prisma.todo.update({
          where: { id: matchedTodoId },
          data: updateData,
        });
      } else {
        // If no match found for update, create as new
        await prisma.todo.create({
          data: {
            title: todo.title,
            description: todo.description || null,
            priority: todo.priority || null,
            dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
            doDate: todo.doDate ? new Date(todo.doDate) : null,
            category: todo.category || null,
          },
        });
      }
      break;

    case "complete":
      if (matchedTodoId) {
        await prisma.todo.update({
          where: { id: matchedTodoId },
          data: {
            status: "done",
            completedAt: new Date(),
          },
        });
      }
      break;

    case "delete":
      if (matchedTodoId) {
        await prisma.todo.delete({
          where: { id: matchedTodoId },
        });
      }
      break;
  }
}

