import { NextRequest, NextResponse } from "next/server";
import { searchNotes, isVaultConfigured } from "@/lib/services/obsidianService";

export async function GET(request: NextRequest) {
  try {
    const configured = await isVaultConfigured();
    if (!configured) {
      return NextResponse.json(
        { error: "Obsidian vault not configured" },
        { status: 400 }
      );
    }

    const query = request.nextUrl.searchParams.get("q");
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const notes = await searchNotes(query);

    return NextResponse.json({
      notes: notes.map((n) => ({
        name: n.name,
        relativePath: n.relativePath,
        modified: n.modified.toISOString(),
        // Include a snippet for search results
        snippet: n.content?.slice(0, 200) || "",
      })),
    });
  } catch (error) {
    console.error("Notes search error:", error);
    return NextResponse.json(
      { error: "Failed to search notes" },
      { status: 500 }
    );
  }
}
