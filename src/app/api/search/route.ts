import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/services/searchService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const type = searchParams.get("type") as
      | "all"
      | "messages"
      | "todos"
      | "habits"
      | "memories"
      | null;

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const results = await searchAll(query.trim(), type || "all");

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
