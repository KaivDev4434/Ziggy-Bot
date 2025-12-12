import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { processMessage } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        role: "user",
        content: message,
      },
    });

    // Get recent messages for context
    const recentMessages = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Process with AI
    const aiResult = await processMessage(
      message,
      recentMessages.reverse().map((m) => ({
        role: m.role,
        content: m.content,
      }))
    );

    // Save extracted todos
    if (aiResult.todos.length > 0) {
      await prisma.todo.createMany({
        data: aiResult.todos.map((todo) => ({
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
        })),
      });
    }

    // Save extracted habits
    if (aiResult.habits.length > 0) {
      for (const habit of aiResult.habits) {
        // Check if habit already exists
        const existing = await prisma.habit.findFirst({
          where: { name: { equals: habit.name } },
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

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        content: aiResult.conversationalResponse,
      },
    });

    return NextResponse.json({
      userMessage,
      assistantMessage,
      extractions: {
        todos: aiResult.todos.length,
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
