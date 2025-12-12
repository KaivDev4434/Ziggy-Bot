import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/todos - List todos with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const todos = await prisma.todo.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ todos });
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

// POST /api/todos - Create a new todo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, dueDate } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        description: description || null,
        priority: priority || 2,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error("Failed to create todo:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
