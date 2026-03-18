// ─── Setup / Onboarding API ───────────────────────────────────────────────────
//
// GET  /api/auth/setup  — check if onboarding has been completed
// POST /api/auth/setup  — complete first-time setup (called by onboarding wizard)

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  hashPassword,
  isSetupComplete,
  createSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth";
import { invalidateConfigCache } from "@/lib/configLoader";
import prisma from "@/lib/db";

// ─── GET: Check setup status ──────────────────────────────────────────────────

export async function GET() {
  const complete = await isSetupComplete();
  return NextResponse.json({ setupComplete: complete });
}

// ─── POST: Complete setup ─────────────────────────────────────────────────────

interface SetupBody {
  displayName: string;
  timezone: string;
  password: string;
  aiProvider: "anthropic" | "perplexity" | "openai" | "ollama";
  apiKey?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  telegramBotToken?: string;
}

export async function POST(request: NextRequest) {
  // Prevent re-running setup if already complete
  if (await isSetupComplete()) {
    return NextResponse.json(
      { error: "Setup already complete. Use /api/auth/tokens to manage API tokens." },
      { status: 400 }
    );
  }

  let body: SetupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { displayName, timezone, password, aiProvider, apiKey, ollamaBaseUrl, ollamaModel, telegramBotToken } = body;

  if (!displayName || !timezone || !password || !aiProvider) {
    return NextResponse.json(
      { error: "displayName, timezone, password, and aiProvider are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Validate provider + API key combination
  if (aiProvider !== "ollama" && !apiKey) {
    return NextResponse.json(
      { error: `An API key is required for provider: ${aiProvider}` },
      { status: 400 }
    );
  }
  if (aiProvider === "ollama" && !ollamaBaseUrl) {
    return NextResponse.json(
      { error: "ollamaBaseUrl is required for the Ollama provider" },
      { status: 400 }
    );
  }

  // Persist all config
  const passwordHash = await hashPassword(password);

  const configs: { key: string; value: string }[] = [
    { key: "display_name", value: displayName },
    { key: "timezone", value: timezone },
    { key: "password_hash", value: passwordHash },
    { key: "ai_provider", value: aiProvider },
    { key: "onboarding_complete", value: "true" },
  ];

  // AI provider API key
  const apiKeyMap: Record<string, string> = {
    anthropic: "anthropic_api_key",
    perplexity: "perplexity_api_key",
    openai: "openai_api_key",
  };
  if (apiKey && apiKeyMap[aiProvider]) {
    configs.push({ key: apiKeyMap[aiProvider], value: apiKey });
  }
  if (ollamaBaseUrl) configs.push({ key: "ollama_base_url", value: ollamaBaseUrl });
  if (ollamaModel)   configs.push({ key: "ollama_model", value: ollamaModel });
  if (telegramBotToken) configs.push({ key: "telegram_bot_token", value: telegramBotToken });

  // Default notification preferences
  configs.push(
    { key: "notification_briefing", value: "true" },
    { key: "notification_deadlines", value: "true" },
    { key: "notification_habits", value: "true" },
    { key: "briefing_time", value: "08:00" }
  );

  // Upsert each config entry individually (createMany skipDuplicates has a TS quirk with SQLite)
  for (const cfg of configs) {
    await prisma.appConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: { key: cfg.key, value: cfg.value },
    });
  }

  // Set the AI provider key in process.env immediately (no restart needed)
  if (apiKey && apiKeyMap[aiProvider]) {
    process.env[apiKeyMap[aiProvider].toUpperCase()] = apiKey;
  }
  process.env.AI_PROVIDER = aiProvider;
  if (ollamaBaseUrl) process.env.OLLAMA_BASE_URL = ollamaBaseUrl;
  if (ollamaModel)   process.env.OLLAMA_MODEL = ollamaModel;

  // Invalidate config cache so next request picks up fresh values
  invalidateConfigCache();

  // Auto-login: create a session cookie
  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({ success: true });
}
