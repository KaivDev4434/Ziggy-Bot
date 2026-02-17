import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/habits - List all habits
export async function GET() {
  try {
    const habits = await prisma.habit.findMany({
      where: { active: true },
      include: {
        records: {
          where: {
            date: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ habits });
  } catch (error) {
    console.error("Failed to fetch habits:", error);
    return NextResponse.json(
      { error: "Failed to fetch habits" },
      { status: 500 }
    );
  }
}

// POST /api/habits - Create a new habit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, frequency } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const habit = await prisma.habit.create({
      data: {
        name,
        frequency: frequency || "daily",
      },
    });

    return NextResponse.json({ habit }, { status: 201 });
  } catch (error) {
    console.error("Failed to create habit:", error);
    return NextResponse.json(
      { error: "Failed to create habit" },
      { status: 500 }
    );
  }
}


