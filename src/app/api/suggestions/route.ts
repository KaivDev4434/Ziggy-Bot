import { NextResponse } from "next/server";
import { getSuggestions } from "@/lib/services/suggestionService";

export async function GET() {
  try {
    const suggestions = await getSuggestions();
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
