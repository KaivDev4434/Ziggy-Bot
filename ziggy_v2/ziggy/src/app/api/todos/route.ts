import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/todos - List todos with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const todos = await prisma.todo.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ priority: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    });

    // Get all unique categories for filtering
    const allTodos = await prisma.todo.findMany({
      select: { category: true },
      distinct: ["category"],
    });
    const categories = allTodos
      .map((t) => t.category)
      .filter((c): c is string => c !== null)
      .sort();

    return NextResponse.json({ todos, categories });
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
    const { title, description, priority, dueDate, doDate, category } = body;

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
        priority: priority || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        doDate: doDate ? new Date(doDate) : null,
        category: category || null,
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


