// ─── Config Loader ────────────────────────────────────────────────────────────
//
// Loads user-configured values from AppConfig (DB) into process.env at runtime.
// This allows API keys set during onboarding to be picked up by the AI providers
// without requiring a container restart after first-time setup.
//
// Env vars always take precedence over DB values (so .env.production overrides work).
// Call loadConfig() once at the start of any API route that uses AI providers.

import prisma from "@/lib/db";

// Map of DB keys → environment variable names
const CONFIG_MAPPINGS: { dbKey: string; envKey: string }[] = [
  { dbKey: "ai_provider",        envKey: "AI_PROVIDER" },
  { dbKey: "anthropic_api_key",  envKey: "ANTHROPIC_API_KEY" },
  { dbKey: "perplexity_api_key", envKey: "PERPLEXITY_API_KEY" },
  { dbKey: "openai_api_key",     envKey: "OPENAI_API_KEY" },
  { dbKey: "openai_base_url",    envKey: "OPENAI_BASE_URL" },
  { dbKey: "ollama_base_url",    envKey: "OLLAMA_BASE_URL" },
  { dbKey: "ollama_model",       envKey: "OLLAMA_MODEL" },
  { dbKey: "telegram_bot_token", envKey: "TELEGRAM_BOT_TOKEN" },
  { dbKey: "telegram_chat_id",   envKey: "TELEGRAM_CHAT_ID" },
  { dbKey: "telegram_webhook_secret", envKey: "TELEGRAM_WEBHOOK_SECRET" },
  { dbKey: "display_name",       envKey: "ZIGGY_DISPLAY_NAME" },
  { dbKey: "timezone",           envKey: "ZIGGY_TIMEZONE" },
  { dbKey: "personality_tone",   envKey: "ZIGGY_PERSONALITY_TONE" },
  { dbKey: "personality_brevity",envKey: "ZIGGY_PERSONALITY_BREVITY" },
  { dbKey: "user_bio",           envKey: "ZIGGY_USER_BIO" },
];

let loaded = false;

export async function loadConfig(): Promise<void> {
  if (loaded) return;

  try {
    const configs = await prisma.appConfig.findMany({
      where: { key: { in: CONFIG_MAPPINGS.map((m) => m.dbKey) } },
    });

    const dbValues = new Map(configs.map((c) => [c.key, c.value]));

    for (const { dbKey, envKey } of CONFIG_MAPPINGS) {
      // Env var takes precedence — only set from DB if not already in env
      if (process.env[envKey]) continue;
      const dbValue = dbValues.get(dbKey);
      if (dbValue) {
        process.env[envKey] = dbValue;
      }
    }

    loaded = true;
  } catch {
    // AppConfig table may not exist yet (pre-migration). Safe to ignore.
  }
}

/**
 * Force reload on next call (useful after onboarding saves new config values).
 */
export function invalidateConfigCache(): void {
  loaded = false;
}
