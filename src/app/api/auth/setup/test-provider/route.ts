// ─── Provider Test (used by onboarding wizard) ────────────────────────────────
//
// POST /api/auth/setup/test-provider
// Sends a minimal test message to verify the API key works.
// No auth required — called before setup is complete.

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { provider, apiKey, ollamaBaseUrl, ollamaModel } = await request
    .json()
    .catch(() => ({}));

  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  try {
    switch (provider) {
      case "anthropic": {
        if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 10,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return NextResponse.json({ ok: true });
      }

      case "perplexity": {
        if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });
        const res = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "sonar",
            max_tokens: 10,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return NextResponse.json({ ok: true });
      }

      case "openai": {
        if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 10,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return NextResponse.json({ ok: true });
      }

      case "ollama": {
        const baseUrl = ollamaBaseUrl ?? "http://localhost:11434";
        const model = ollamaModel ?? "llama3.1";
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: "hi", stream: false }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
