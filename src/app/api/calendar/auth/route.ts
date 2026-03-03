import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/services/calendarService";

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Calendar auth error:", error);
    return NextResponse.json(
      { error: "Google Calendar not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file." },
      { status: 500 }
    );
  }
}
