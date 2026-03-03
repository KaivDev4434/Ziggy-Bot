import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@/lib/services/calendarService";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      // User denied access
      return NextResponse.redirect(new URL("/dashboard?calendar=denied", request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/dashboard?calendar=error", request.url));
    }

    await handleCallback(code);

    return NextResponse.redirect(new URL("/dashboard?calendar=connected", request.url));
  } catch (error) {
    console.error("Calendar callback error:", error);
    return NextResponse.redirect(new URL("/dashboard?calendar=error", request.url));
  }
}
