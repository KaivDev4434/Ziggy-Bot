import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { buildSystemPrompt, buildAIContext, extractInformationFromResponse } from "@/lib/ai";
import { chatStream, type ChatMessage } from "@/lib/ai/index";
import { RECENT_MESSAGES_FOR_CONTEXT, HABIT_RECORDS_LOOKBACK } from "@/lib/constants";
import { cleanCitations, parseLocalDate, getEffectiveDate, toLocalDateString } from "@/lib/utils";
import { processTodoAction } from "@/lib/services/todoService";
import { processAndSaveMemories, buildMemoryContext } from "@/lib/services/memoryService";
import { buildCalendarContext } from "@/lib/services/calendarService";
import { getRecentNotesContext } from "@/lib/services/obsidianService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { message, date, location } = await request.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the date for message grouping
    const messageDate = date
      ? parseLocalDate(date.split("T")[0])
      : (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })();

    // Prevent sending messages to past days (respect late-night mode)
    const effectiveToday = getEffectiveDate();
    if (toLocalDateString(messageDate) < toLocalDateString(effectiveToday)) {
      return new Response(
        JSON.stringify({ error: "Cannot send messages to past days" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save user message immediately
    const userMessage = await prisma.message.create({
      data: {
        role: "user",
        content: message,
        date: messageDate,
      },
    });

    // Get recent messages for context
    const dayStart = new Date(messageDate);
    const dayEnd = new Date(messageDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [recentMessages, allTodos, allHabits, memoryContext, calendarContext, notesContext] = await Promise.all([
      prisma.message.findMany({
        where: {
          date: { gte: dayStart, lt: dayEnd },
        },
        orderBy: { createdAt: "desc" },
        take: RECENT_MESSAGES_FOR_CONTEXT,
      }),
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

    // Build AI context
    const aiContext = buildAIContext(
      allTodos,
      allHabits.map((h) => ({
        name: h.name,
        records: h.records.map((r) => ({ date: r.date, completed: r.completed })),
      })),
      location
    );

    // Build system prompt with memory, calendar, and notes context
    const systemPrompt = buildSystemPrompt(aiContext, memoryContext + calendarContext + notesContext);

    // Build messages for AI
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages.reverse().map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Create a TransformStream to stream the response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream the AI response
          for await (const chunk of chatStream(messages)) {
            if (chunk.content) {
              fullResponse += chunk.content;
              // Send as Server-Sent Event
              const data = JSON.stringify({ type: "text", content: chunk.content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Now process extractions from the full response
          const extractions = extractInformationFromResponse(fullResponse);
          
          // Get the conversational response (cleaned from JSON)
          const cleanedResponse = cleanCitations(extractions.conversationalResponse);

          // Process todos
          let todosCreated = 0;
          let todosUpdated = 0;
          let todosCompleted = 0;
          let todosDeleted = 0;

          if (extractions.todos.length > 0) {
            for (const todo of extractions.todos) {
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

          // Save habits
          if (extractions.habits.length > 0) {
            for (const habit of extractions.habits) {
              const existing = await prisma.habit.findFirst({
                where: { name: { equals: habit.name }, active: true },
              });
              if (!existing) {
                await prisma.habit.create({
                  data: { name: habit.name, frequency: habit.frequency },
                });
              }
            }
          }

          // Save landmarks
          if (extractions.landmarks.length > 0) {
            await prisma.landmark.createMany({
              data: extractions.landmarks.map((l) => ({
                title: l.title,
                date: new Date(l.date),
                notes: l.notes,
              })),
            });
          }

          // Save assistant message
          const assistantMessage = await prisma.message.create({
            data: {
              role: "assistant",
              content: cleanedResponse,
              date: messageDate,
            },
          });

          // Process memories in background
          processAndSaveMemories(message, cleanedResponse).catch((err) =>
            console.error("Background memory extraction failed:", err)
          );

          // Send final message with metadata
          const finalData = JSON.stringify({
            type: "done",
            userMessage,
            assistantMessage,
            extractions: {
              todosCreated,
              todosUpdated,
              todosCompleted,
              todosDeleted,
              habits: extractions.habits.length,
              landmarks: extractions.landmarks.length,
            },
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = JSON.stringify({
            type: "error",
            error: "Failed to process message",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat stream error:", error);
    return new Response(JSON.stringify({ error: "Failed to process message" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
