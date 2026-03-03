import { NextRequest, NextResponse } from "next/server";
import { readNote, isVaultConfigured } from "@/lib/services/obsidianService";

export async function GET(request: NextRequest) {
  try {
    const configured = await isVaultConfigured();
    if (!configured) {
      return NextResponse.json(
        { error: "Obsidian vault not configured" },
        { status: 400 }
      );
    }

    const path = request.nextUrl.searchParams.get("path");
    if (!path) {
      return NextResponse.json(
        { error: "Path parameter is required" },
        { status: 400 }
      );
    }

    const note = await readNote(path);
    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: note.name,
      relativePath: note.relativePath,
      modified: note.modified.toISOString(),
      content: note.content,
    });
  } catch (error) {
    console.error("Notes read error:", error);
    return NextResponse.json(
      { error: "Failed to read note" },
      { status: 500 }
    );
  }
}
