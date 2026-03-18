"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Step = "welcome" | "security" | "ai-provider" | "telegram" | "done";

const STEPS: Step[] = ["welcome", "security", "ai-provider", "telegram", "done"];

type AIProvider = "anthropic" | "perplexity" | "openai" | "ollama";

const PROVIDER_INFO: Record<AIProvider, { label: string; keyLabel: string; keyPlaceholder: string; hasKey: boolean }> = {
  anthropic:  { label: "Anthropic (Claude)",  keyLabel: "Anthropic API Key",   keyPlaceholder: "sk-ant-...",            hasKey: true  },
  perplexity: { label: "Perplexity",           keyLabel: "Perplexity API Key",  keyPlaceholder: "pplx-...",              hasKey: true  },
  openai:     { label: "OpenAI (GPT)",         keyLabel: "OpenAI API Key",      keyPlaceholder: "sk-...",                hasKey: true  },
  ollama:     { label: "Ollama (local)",        keyLabel: "",                    keyPlaceholder: "",                      hasKey: false },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [submitting, setSubmitting] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerTestResult, setProviderTestResult] = useState<"ok" | "fail" | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [aiProvider, setAiProvider] = useState<AIProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.1");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramResult, setTelegramResult] = useState<string | null>(null);

  // Detect browser timezone on mount
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setTimezone(tz);
  }, []);

  // If already set up, redirect to home
  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((data) => { if (data.setupComplete) router.replace("/"); })
      .catch(() => {});
  }, [router]);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function nextStep() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function prevStep() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  // ── Step handlers ────────────────────────────────────────────────────────

  function handleWelcomeNext(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    nextStep();
  }

  function handleSecurityNext(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    nextStep();
  }

  async function testProvider() {
    setTestingProvider(true);
    setProviderTestResult(null);
    try {
      const body: Record<string, string> = { provider: aiProvider };
      if (aiProvider !== "ollama") body.apiKey = apiKey;
      if (aiProvider === "ollama") { body.ollamaBaseUrl = ollamaBaseUrl; body.ollamaModel = ollamaModel; }

      const res = await fetch("/api/auth/setup/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setProviderTestResult(res.ok ? "ok" : "fail");
    } catch {
      setProviderTestResult("fail");
    } finally {
      setTestingProvider(false);
    }
  }

  function handleProviderNext(e: FormEvent) {
    e.preventDefault();
    if (aiProvider !== "ollama" && !apiKey.trim()) return;
    nextStep();
  }

  async function testTelegramToken() {
    if (!telegramBotToken.trim()) return;
    setTestingTelegram(true);
    setTelegramResult(null);
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${telegramBotToken.trim()}/getMe`
      );
      const data = await res.json();
      if (data.ok) {
        setTelegramResult(`Connected as @${data.result.username}`);
      } else {
        setTelegramResult("Invalid token — please check and try again");
      }
    } catch {
      setTelegramResult("Could not connect to Telegram");
    } finally {
      setTestingTelegram(false);
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    try {
      const body: Record<string, string | undefined> = {
        displayName: displayName.trim(),
        timezone,
        password,
        aiProvider,
      };

      if (aiProvider !== "ollama") body.apiKey = apiKey;
      if (aiProvider === "ollama") {
        body.ollamaBaseUrl = ollamaBaseUrl;
        body.ollamaModel = ollamaModel;
      }
      if (telegramBotToken.trim()) body.telegramBotToken = telegramBotToken.trim();

      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.replace("/");
      } else {
        const err = await res.json();
        alert(`Setup failed: ${err.error}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Ziggy</h1>
          <p className="text-muted-foreground mt-2">Let&apos;s get you set up in a few steps</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {stepIndex + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">

          {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
          {step === "welcome" && (
            <form onSubmit={handleWelcomeNext} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold mb-1">About you</h2>
                <p className="text-sm text-muted-foreground">Ziggy will use your name to personalize responses.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="displayName">
                  Your name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Kaivalya"
                  autoFocus
                  required
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="timezone">
                  Timezone
                </label>
                <input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Kolkata"
                  required
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-detected from your browser</p>
              </div>

              <button type="submit" disabled={!displayName.trim()}
                className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Continue
              </button>
            </form>
          )}

          {/* ── Step 2: Security ──────────────────────────────────────────── */}
          {step === "security" && (
            <form onSubmit={handleSecurityNext} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold mb-1">Set a password</h2>
                <p className="text-sm text-muted-foreground">
                  This password protects your Ziggy instance. Since it&apos;s self-hosted,
                  only you need to remember it.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoFocus
                  required
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={prevStep}
                  className="flex-1 px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
                  Back
                </button>
                <button type="submit" disabled={!password || !confirmPassword}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: AI Provider ───────────────────────────────────────── */}
          {step === "ai-provider" && (
            <form onSubmit={handleProviderNext} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold mb-1">AI provider</h2>
                <p className="text-sm text-muted-foreground">
                  Choose which AI powers Ziggy. Anthropic (Claude) is recommended.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setAiProvider(p); setApiKey(""); setProviderTestResult(null); }}
                      className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                        aiProvider === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      {PROVIDER_INFO[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {PROVIDER_INFO[aiProvider].hasKey && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="apiKey">
                    {PROVIDER_INFO[aiProvider].keyLabel}
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setProviderTestResult(null); }}
                    placeholder={PROVIDER_INFO[aiProvider].keyPlaceholder}
                    required
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {aiProvider === "ollama" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Ollama Base URL</label>
                    <input type="text" value={ollamaBaseUrl}
                      onChange={(e) => setOllamaBaseUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Model</label>
                    <input type="text" value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="llama3.1"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </>
              )}

              {providerTestResult && (
                <p className={`text-sm ${providerTestResult === "ok" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                  {providerTestResult === "ok" ? "✓ Connection successful" : "✗ Connection failed — check your key"}
                </p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={prevStep}
                  className="flex-1 px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
                  Back
                </button>
                <button type="button" onClick={testProvider}
                  disabled={testingProvider || (PROVIDER_INFO[aiProvider].hasKey && !apiKey)}
                  className="px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors">
                  {testingProvider ? "Testing..." : "Test"}
                </button>
                <button type="submit"
                  disabled={PROVIDER_INFO[aiProvider].hasKey && !apiKey.trim()}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* ── Step 4: Telegram ──────────────────────────────────────────── */}
          {step === "telegram" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold mb-1">Telegram (optional)</h2>
                <p className="text-sm text-muted-foreground">
                  Connect Telegram to chat with Ziggy from your phone and receive
                  proactive notifications (briefings, reminders, weekly reviews).
                  You can skip this and set it up later in Settings.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">How to create a Telegram bot:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Open Telegram and search for <strong>@BotFather</strong></li>
                  <li>Send <code className="bg-muted px-1 rounded">/newbot</code> and follow the prompts</li>
                  <li>Copy the bot token BotFather gives you</li>
                  <li>Start a conversation with your new bot</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="telegramToken">
                  Bot Token
                </label>
                <div className="flex gap-2">
                  <input
                    id="telegramToken"
                    type="text"
                    value={telegramBotToken}
                    onChange={(e) => { setTelegramBotToken(e.target.value); setTelegramResult(null); }}
                    placeholder="123456789:ABCdef..."
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button type="button" onClick={testTelegramToken}
                    disabled={testingTelegram || !telegramBotToken.trim()}
                    className="px-3 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors">
                    {testingTelegram ? "..." : "Test"}
                  </button>
                </div>
                {telegramResult && (
                  <p className={`text-sm mt-1.5 ${telegramResult.startsWith("Connected") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {telegramResult}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={prevStep}
                  className="flex-1 px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
                  Back
                </button>
                <button type="button" onClick={nextStep}
                  className="px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
                  Skip
                </button>
                <button type="button" onClick={nextStep}
                  disabled={!!telegramBotToken && !telegramResult?.startsWith("Connected")}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Done ──────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="space-y-5 text-center">
              <div className="text-5xl">✓</div>
              <div>
                <h2 className="text-xl font-semibold mb-1">You&apos;re all set, {displayName}!</h2>
                <p className="text-sm text-muted-foreground">
                  Ziggy is ready. You can change any of these settings later.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI provider</span>
                  <span className="font-medium">{PROVIDER_INFO[aiProvider].label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-medium">{timezone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram</span>
                  <span className="font-medium">{telegramBotToken ? "Connected" : "Not configured"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Setting up..." : "Start using Ziggy"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
