import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { HABIT_RECORDS_LOOKBACK } from "@/lib/constants";

// GET /api/habits - List all habits
export async function GET() {
  try {
    const habits = await prisma.habit.findMany({
      where: { active: true },
      include: {
        records: {
          where: {
            date: {
              gte: new Date(new Date().setDate(new Date().getDate() - HABIT_RECORDS_LOOKBACK)),
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
    const { name, frequency, frequencyType, frequencyDays, frequencyTarget } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Determine the frequency type and legacy frequency string
    const type = frequencyType || "every_day";
    let legacyFrequency = frequency || "daily";
    if (type === "specific_days") {
      const days = frequencyDays || [];
      const weekdaySet = [1, 2, 3, 4, 5];
      const isWeekdays = days.length === 5 && weekdaySet.every((d: number) => days.includes(d));
      legacyFrequency = isWeekdays ? "weekdays" : "custom";
    } else if (type === "times_per_week") {
      legacyFrequency = "weekly";
    } else if (type === "times_per_month") {
      legacyFrequency = "monthly";
    }

    const habit = await prisma.habit.create({
      data: {
        name,
        frequency: legacyFrequency,
        frequencyType: type,
        frequencyDays: frequencyDays ? JSON.stringify(frequencyDays) : null,
        frequencyTarget: frequencyTarget || null,
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
