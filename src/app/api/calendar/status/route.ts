import { NextResponse } from "next/server";
import { isConnected, disconnect } from "@/lib/services/calendarService";

export async function GET() {
  try {
    const connected = await isConnected();
    return NextResponse.json({ connected });
  } catch (error) {
    console.error("Calendar status error:", error);
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  try {
    await disconnect();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Calendar disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}
