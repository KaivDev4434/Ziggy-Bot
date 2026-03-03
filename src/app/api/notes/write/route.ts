import { NextRequest, NextResponse } from "next/server";
import {
  writeNote,
  appendToNote,
  deleteNote,
  isVaultConfigured,
} from "@/lib/services/obsidianService";

export async function POST(request: NextRequest) {
  try {
    const configured = await isVaultConfigured();
    if (!configured) {
      return NextResponse.json(
        { error: "Obsidian vault not configured" },
        { status: 400 }
      );
    }

    const { path, content, append } = await request.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      );
    }

    if (content === undefined || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    let success: boolean;
    if (append) {
      success = await appendToNote(path, content);
    } else {
      success = await writeNote(path, content);
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to write note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, path });
  } catch (error) {
    console.error("Notes write error:", error);
    return NextResponse.json(
      { error: "Failed to write note" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const configured = await isVaultConfigured();
    if (!configured) {
      return NextResponse.json(
        { error: "Obsidian vault not configured" },
        { status: 400 }
      );
    }

    const { path } = await request.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      );
    }

    const success = await deleteNote(path);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notes delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
