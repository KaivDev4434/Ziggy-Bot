import { NextResponse } from "next/server";
import { getVaultInfo } from "@/lib/services/obsidianService";

export async function GET() {
  try {
    const info = await getVaultInfo();
    return NextResponse.json(info);
  } catch (error) {
    console.error("Notes status error:", error);
    return NextResponse.json({
      configured: false,
      path: null,
      accessible: false,
    });
  }
}
