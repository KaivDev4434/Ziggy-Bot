import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/habits/[id] - Get a single habit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const habit = await prisma.habit.findUnique({
      where: { id },
      include: {
        records: {
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    return NextResponse.json({ habit });
  } catch (error) {
    console.error("Failed to fetch habit:", error);
    return NextResponse.json(
      { error: "Failed to fetch habit" },
      { status: 500 }
    );
  }
}

// PATCH /api/habits/[id] - Update a habit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, frequency, active } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (active !== undefined) updateData.active = active;

    const habit = await prisma.habit.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ habit });
  } catch (error) {
    console.error("Failed to update habit:", error);
    return NextResponse.json(
      { error: "Failed to update habit" },
      { status: 500 }
    );
  }
}

// DELETE /api/habits/[id] - Delete a habit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Soft delete by setting active to false
    await prisma.habit.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete habit:", error);
    return NextResponse.json(
      { error: "Failed to delete habit" },
      { status: 500 }
    );
  }
}
