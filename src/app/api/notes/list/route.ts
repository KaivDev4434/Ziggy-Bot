import { NextRequest, NextResponse } from "next/server";
import { listNotes, isVaultConfigured } from "@/lib/services/obsidianService";

export async function GET(request: NextRequest) {
  try {
    const configured = await isVaultConfigured();
    if (!configured) {
      return NextResponse.json(
        { error: "Obsidian vault not configured" },
        { status: 400 }
      );
    }

    const subdir = request.nextUrl.searchParams.get("subdir") || undefined;
    const notes = await listNotes(subdir);

    // Return without content for listing
    return NextResponse.json({
      notes: notes.map((n) => ({
        name: n.name,
        relativePath: n.relativePath,
        modified: n.modified.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Notes list error:", error);
    return NextResponse.json(
      { error: "Failed to list notes" },
      { status: 500 }
    );
  }
}
