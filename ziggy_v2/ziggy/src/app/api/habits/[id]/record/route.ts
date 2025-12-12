import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/habits/[id]/record - Log a habit completion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, completed } = body;

    const recordDate = date ? new Date(date) : new Date();
    // Normalize to start of day
    recordDate.setHours(0, 0, 0, 0);

    // Check if record already exists for this date
    const existingRecord = await prisma.habitRecord.findFirst({
      where: {
        habitId: id,
        date: recordDate,
      },
    });

    if (existingRecord) {
      // Update existing record
      if (completed === false) {
        // Delete the record if unmarking
        await prisma.habitRecord.delete({
          where: { id: existingRecord.id },
        });
        return NextResponse.json({ deleted: true });
      }
      return NextResponse.json({ record: existingRecord });
    }

    // Create new record
    const record = await prisma.habitRecord.create({
      data: {
        habitId: id,
        date: recordDate,
        completed: completed !== false,
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error("Failed to log habit:", error);
    return NextResponse.json(
      { error: "Failed to log habit" },
      { status: 500 }
    );
  }
}
