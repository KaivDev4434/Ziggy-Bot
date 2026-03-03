import { NextRequest, NextResponse } from "next/server";
import { getTodayEvents, getUpcomingEvents, isConnected } from "@/lib/services/calendarService";

export async function GET(request: NextRequest) {
  try {
    const connected = await isConnected();
    if (!connected) {
      return NextResponse.json(
        { error: "Calendar not connected" },
        { status: 401 }
      );
    }

    const range = request.nextUrl.searchParams.get("range") || "today";

    if (range === "today") {
      const events = await getTodayEvents();
      return NextResponse.json({ events });
    } else if (range === "week") {
      const events = await getUpcomingEvents(7);
      return NextResponse.json({ events });
    } else {
      const days = parseInt(range) || 7;
      const events = await getUpcomingEvents(days);
      return NextResponse.json({ events });
    }
  } catch (error) {
    console.error("Calendar events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
