// ─── Settings API ─────────────────────────────────────────────────────────────
//
// GET   /api/settings  — read all user-configurable settings
// PATCH /api/settings  — update a settings section

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { hashPassword, verifyPassword, getPasswordHash, setConfig, getConfig } from "@/lib/auth";
import { invalidateConfigCache } from "@/lib/configLoader";
import prisma from "@/lib/db";

// ─── GET: Read settings ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const keys = [
    "display_name", "timezone",
    "ai_provider",
    "anthropic_api_key", "perplexity_api_key", "openai_api_key",
    "ollama_base_url", "ollama_model",
    "telegram_bot_token", "telegram_chat_id",
    "notification_briefing", "notification_deadlines", "notification_habits",
    "briefing_time",
    "personality_tone", "personality_brevity", "user_bio",
  ];

  const configs = await prisma.appConfig.findMany({ where: { key: { in: keys } } });
  const c = new Map(configs.map((r) => [r.key, r.value]));

  const provider = c.get("ai_provider") ?? process.env.AI_PROVIDER ?? "perplexity";

  // Mask API keys — show only first 8 chars + dots
  function maskKey(key: string | undefined): string | null {
    if (!key) return null;
    return key.length > 8 ? `${key.slice(0, 8)}${"•".repeat(12)}` : "•".repeat(key.length);
  }

  const providerKeyMap: Record<string, string> = {
    anthropic: "anthropic_api_key",
    perplexity: "perplexity_api_key",
    openai: "openai_api_key",
  };
  const currentKey = c.get(providerKeyMap[provider] ?? "") ?? process.env[`${provider.toUpperCase()}_API_KEY`];

  // API tokens (names + metadata only, no hashes)
  const tokens = await prisma.apiToken.findMany({
    where: { active: true },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    profile: {
      displayName: c.get("display_name") ?? "",
      timezone: c.get("timezone") ?? "UTC",
    },
    ai: {
      provider,
      keyConfigured: !!currentKey,
      keyMasked: maskKey(currentKey),
      ollamaBaseUrl: c.get("ollama_base_url") ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
      ollamaModel: c.get("ollama_model") ?? process.env.OLLAMA_MODEL ?? "llama3.1",
    },
    notifications: {
      briefingTime: c.get("briefing_time") ?? "08:00",
      briefing: c.get("notification_briefing") !== "false",
      deadlines: c.get("notification_deadlines") !== "false",
      habits: c.get("notification_habits") !== "false",
    },
    telegram: {
      configured: !!c.get("telegram_bot_token"),
      chatIdConfigured: !!c.get("telegram_chat_id"),
    },
    personality: {
      tone: (c.get("personality_tone") ?? "warm") as "warm" | "professional" | "witty",
      brevity: (c.get("personality_brevity") ?? "balanced") as "concise" | "balanced" | "thorough",
      userBio: c.get("user_bio") ?? "",
    },
    tokens,
  });
}

// ─── PATCH: Update settings ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { section, ...data } = body as { section: string; [key: string]: unknown };

  switch (section) {
    // ── Profile ──────────────────────────────────────────────────────────────
    case "profile": {
      const { displayName, timezone } = data as { displayName?: string; timezone?: string };
      if (displayName) await setConfig("display_name", displayName.trim());
      if (timezone)    await setConfig("timezone", timezone.trim());
      return NextResponse.json({ success: true });
    }

    // ── AI Provider ───────────────────────────────────────────────────────────
    case "ai": {
      const { provider, apiKey, ollamaBaseUrl, ollamaModel } = data as {
        provider?: string;
        apiKey?: string;
        ollamaBaseUrl?: string;
        ollamaModel?: string;
      };

      if (provider) {
        await setConfig("ai_provider", provider);
        process.env.AI_PROVIDER = provider;
      }

      const keyMap: Record<string, string> = {
        anthropic: "anthropic_api_key",
        perplexity: "perplexity_api_key",
        openai: "openai_api_key",
      };

      if (apiKey && provider && keyMap[provider]) {
        await setConfig(keyMap[provider], apiKey);
        process.env[`${provider.toUpperCase()}_API_KEY`] = apiKey;
      }

      if (ollamaBaseUrl) {
        await setConfig("ollama_base_url", ollamaBaseUrl);
        process.env.OLLAMA_BASE_URL = ollamaBaseUrl;
      }
      if (ollamaModel) {
        await setConfig("ollama_model", ollamaModel);
        process.env.OLLAMA_MODEL = ollamaModel;
      }

      invalidateConfigCache();
      return NextResponse.json({ success: true });
    }

    // ── Password ──────────────────────────────────────────────────────────────
    case "password": {
      const { currentPassword, newPassword } = data as { currentPassword?: string; newPassword?: string };
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }
      const hash = await getPasswordHash();
      if (!hash || !(await verifyPassword(currentPassword, hash))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      }
      const newHash = await hashPassword(newPassword);
      await setConfig("password_hash", newHash);
      return NextResponse.json({ success: true });
    }

    // ── Telegram ──────────────────────────────────────────────────────────────
    case "telegram": {
      const { botToken } = data as { botToken?: string };
      if (!botToken) {
        return NextResponse.json({ error: "botToken is required" }, { status: 400 });
      }
      // Verify token with Telegram before saving
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const telegramData = await res.json();
      if (!telegramData.ok) {
        return NextResponse.json({ error: "Invalid Telegram bot token" }, { status: 400 });
      }
      await setConfig("telegram_bot_token", botToken);
      return NextResponse.json({ success: true, botUsername: telegramData.result.username });
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    case "notifications": {
      const { briefingTime, briefing, deadlines, habits } = data as {
        briefingTime?: string;
        briefing?: boolean;
        deadlines?: boolean;
        habits?: boolean;
      };
      if (briefingTime !== undefined) await setConfig("briefing_time", briefingTime);
      if (briefing  !== undefined) await setConfig("notification_briefing", String(briefing));
      if (deadlines !== undefined) await setConfig("notification_deadlines", String(deadlines));
      if (habits    !== undefined) await setConfig("notification_habits", String(habits));
      return NextResponse.json({ success: true });
    }

    // ── Personality ───────────────────────────────────────────────────────────
    case "personality": {
      const { tone, brevity, userBio } = data as { tone?: string; brevity?: string; userBio?: string };
      const validTones = ["warm", "professional", "witty"];
      const validBrevities = ["concise", "balanced", "thorough"];
      if (tone && validTones.includes(tone)) {
        await setConfig("personality_tone", tone);
        process.env.ZIGGY_PERSONALITY_TONE = tone;
      }
      if (brevity && validBrevities.includes(brevity)) {
        await setConfig("personality_brevity", brevity);
        process.env.ZIGGY_PERSONALITY_BREVITY = brevity;
      }
      if (userBio !== undefined) {
        await setConfig("user_bio", userBio);
        process.env.ZIGGY_USER_BIO = userBio;
      }
      invalidateConfigCache();
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  }
}
