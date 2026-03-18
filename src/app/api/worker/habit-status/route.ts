import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import prisma from "@/lib/db";
import { calculateStreak } from "@/lib/services/habitService";
import { HABIT_RECORDS_LOOKBACK } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const habits = await prisma.habit.findMany({
    where: { active: true },
    include: {
      records: {
        orderBy: { date: "desc" },
        take: HABIT_RECORDS_LOOKBACK,
      },
    },
  });

  const result = habits.map((h) => {
    const { streak, completedToday } = calculateStreak(h.records, today);
    return { name: h.name, completedToday, streak };
  });

  return NextResponse.json({ habits: result });
}
