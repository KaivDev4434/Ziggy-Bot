"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsData {
  profile: { displayName: string; timezone: string };
  ai: {
    provider: string;
    keyConfigured: boolean;
    keyMasked: string | null;
    ollamaBaseUrl: string;
    ollamaModel: string;
  };
  notifications: {
    briefingTime: string;
    briefing: boolean;
    deadlines: boolean;
    habits: boolean;
  };
  telegram: { configured: boolean; chatIdConfigured: boolean };
  personality: {
    tone: "warm" | "professional" | "witty";
    brevity: "concise" | "balanced" | "thorough";
    userBio: string;
  };
  tokens: { id: string; name: string; createdAt: string; lastUsedAt: string | null }[];
}

type AIProvider = "anthropic" | "perplexity" | "openai" | "ollama";

const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic:  "Anthropic (Claude)",
  perplexity: "Perplexity",
  openai:     "OpenAI",
  ollama:     "Ollama (local)",
};

// ─── Reusable section wrapper ─────────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-base">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

function SaveButton({ loading, children = "Save changes" }: { loading: boolean; children?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
    >
      {loading ? "Saving..." : children}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Section-specific saving states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAI, setSavingAI] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");

  // AI
  const [aiProvider, setAiProvider] = useState<AIProvider>("anthropic");
  const [newApiKey, setNewApiKey] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [providerTestResult, setProviderTestResult] = useState<"ok" | "fail" | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Telegram
  const [telegramToken, setTelegramToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<string | null>(null);

  // Notifications
  const [briefingTime, setBriefingTime] = useState("08:00");
  const [notifBriefing, setNotifBriefing] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifHabits, setNotifHabits] = useState(true);

  // Personality
  const [personalityTone, setPersonalityTone] = useState<"warm" | "professional" | "witty">("warm");
  const [personalityBrevity, setPersonalityBrevity] = useState<"concise" | "balanced" | "thorough">("balanced");
  const [userBio, setUserBio] = useState("");
  const [savingPersonality, setSavingPersonality] = useState(false);

  // New token
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data: SettingsData = await res.json();
      setSettings(data);
      setDisplayName(data.profile.displayName);
      setTimezone(data.profile.timezone);
      setAiProvider(data.ai.provider as AIProvider);
      setOllamaBaseUrl(data.ai.ollamaBaseUrl);
      setOllamaModel(data.ai.ollamaModel);
      setBriefingTime(data.notifications.briefingTime);
      setNotifBriefing(data.notifications.briefing);
      setNotifDeadlines(data.notifications.deadlines);
      setNotifHabits(data.notifications.habits);
      if (data.personality) {
        setPersonalityTone(data.personality.tone);
        setPersonalityBrevity(data.personality.brevity);
        setUserBio(data.personality.userBio ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Save helpers ────────────────────────────────────────────────────────────

  async function patch(section: string, data: Record<string, unknown>) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, ...data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Save failed");
    }
    return res.json();
  }

  // ── Profile ─────────────────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await patch("profile", { displayName, timezone });
      toast.success("Profile updated");
      fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingProfile(false);
    }
  }

  // ── AI Provider ─────────────────────────────────────────────────────────────

  async function handleSaveAI(e: React.FormEvent) {
    e.preventDefault();
    setSavingAI(true);
    try {
      await patch("ai", {
        provider: aiProvider,
        ...(newApiKey ? { apiKey: newApiKey } : {}),
        ...(aiProvider === "ollama" ? { ollamaBaseUrl, ollamaModel } : {}),
      });
      setNewApiKey("");
      setProviderTestResult(null);
      toast.success("AI provider updated");
      fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingAI(false);
    }
  }

  async function testProvider() {
    setTestingProvider(true);
    setProviderTestResult(null);
    try {
      const body: Record<string, string> = { provider: aiProvider };
      if (aiProvider !== "ollama") {
        if (!newApiKey && !settings?.ai.keyConfigured) {
          toast.error("Enter an API key to test");
          return;
        }
        if (newApiKey) body.apiKey = newApiKey;
        else body.useStored = "true";
      } else {
        body.ollamaBaseUrl = ollamaBaseUrl;
        body.ollamaModel = ollamaModel;
      }
      const res = await fetch("/api/auth/setup/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setProviderTestResult(res.ok ? "ok" : "fail");
    } finally {
      setTestingProvider(false);
    }
  }

  // ── Password ────────────────────────────────────────────────────────────────

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await patch("password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingPassword(false);
    }
  }

  // ── Telegram ────────────────────────────────────────────────────────────────

  async function testTelegramToken() {
    if (!telegramToken) return;
    setTelegramTestResult(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${telegramToken}/getMe`);
      const data = await res.json();
      setTelegramTestResult(data.ok ? `@${data.result.username}` : "invalid");
    } catch {
      setTelegramTestResult("invalid");
    }
  }

  async function handleSaveTelegram(e: React.FormEvent) {
    e.preventDefault();
    setSavingTelegram(true);
    try {
      const result = await patch("telegram", { botToken: telegramToken });
      toast.success(`Telegram connected as @${result.botUsername}`);
      setTelegramToken("");
      setTelegramTestResult(null);
      fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingTelegram(false);
    }
  }

  // ── Notifications ───────────────────────────────────────────────────────────

  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setSavingNotifications(true);
    try {
      await patch("notifications", {
        briefingTime,
        briefing: notifBriefing,
        deadlines: notifDeadlines,
        habits: notifHabits,
      });
      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingNotifications(false);
    }
  }

  // ── Personality ─────────────────────────────────────────────────────────────

  async function handleSavePersonality(e: React.FormEvent) {
    e.preventDefault();
    setSavingPersonality(true);
    try {
      await patch("personality", { tone: personalityTone, brevity: personalityBrevity, userBio });
      toast.success("Personality settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingPersonality(false);
    }
  }

  // ── API Tokens ──────────────────────────────────────────────────────────────

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setCreatingToken(true);
    try {
      const res = await fetch("/api/auth/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create token");
      const data = await res.json();
      setCreatedToken(data.token);
      setNewTokenName("");
      fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreatingToken(false);
    }
  }

  async function revokeToken(id: string, name: string) {
    if (!confirm(`Revoke token "${name}"? This cannot be undone.`)) return;
    try {
      await fetch("/api/auth/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      toast.success(`Token "${name}" revoked`);
      fetchSettings();
    } catch {
      toast.error("Failed to revoke token");
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  const telegramConnected = settings?.telegram.configured;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your Ziggy configuration</p>
          </div>
          <ThemeToggle />
        </div>

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <Section title="Profile" description="Your display name and timezone.">
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <Field label="Display name">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
              />
            </Field>
            <Field label="Timezone">
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Kolkata"
                required
              />
              <p className="text-xs text-muted-foreground">Used for scheduling and date display.</p>
            </Field>
            <SaveButton loading={savingProfile} />
          </form>
        </Section>

        {/* ── Personality ──────────────────────────────────────────────────── */}
        <Section
          title="Personality"
          description="Customize how Ziggy communicates with you."
        >
          <form onSubmit={handleSavePersonality} className="space-y-4">
            <Field label="Tone">
              <div className="grid grid-cols-3 gap-2">
                {(["warm", "professional", "witty"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPersonalityTone(t)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors capitalize ${
                      personalityTone === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {t === "warm" ? "🤗 Warm" : t === "professional" ? "💼 Professional" : "😄 Witty"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {personalityTone === "warm" && "Friendly and encouraging, like a trusted friend."}
                {personalityTone === "professional" && "Precise and efficient. Structured, no-fluff responses."}
                {personalityTone === "witty" && "Warm with a touch of dry humor. Clever, not cheesy."}
              </p>
            </Field>

            <Field label="Response length">
              <div className="grid grid-cols-3 gap-2">
                {(["concise", "balanced", "thorough"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setPersonalityBrevity(b)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors capitalize ${
                      personalityBrevity === b
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {b === "concise" ? "⚡ Concise" : b === "balanced" ? "⚖️ Balanced" : "📖 Thorough"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {personalityBrevity === "concise" && "1–3 sentences max. Fast answers over depth."}
                {personalityBrevity === "balanced" && "Depth matched to complexity. No padding, no truncation."}
                {personalityBrevity === "thorough" && "Full explanations, related context, reasoning surfaced."}
              </p>
            </Field>

            <Field label="About you (optional)">
              <textarea
                value={userBio}
                onChange={(e) => setUserBio(e.target.value)}
                placeholder="e.g. I'm a software engineer in Mumbai. I prefer bullet points over paragraphs. I track my fitness goals seriously."
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground">Ziggy will use this context to personalize responses.</p>
            </Field>

            <SaveButton loading={savingPersonality} />
          </form>
        </Section>

        {/* ── AI Provider ─────────────────────────────────────────────────── */}
        <Section
          title="AI Provider"
          description="The LLM that powers Ziggy's responses and data extraction."
        >
          <form onSubmit={handleSaveAI} className="space-y-3">
            <Field label="Provider">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setAiProvider(p); setNewApiKey(""); setProviderTestResult(null); }}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors text-left ${
                      aiProvider === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    {PROVIDER_LABELS[p]}
                  </button>
                ))}
              </div>
            </Field>

            {aiProvider !== "ollama" && (
              <Field label="API Key">
                <Input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => { setNewApiKey(e.target.value); setProviderTestResult(null); }}
                  placeholder={
                    settings?.ai.keyConfigured && settings.ai.provider === aiProvider
                      ? settings.ai.keyMasked ?? "Enter new key to replace"
                      : "Paste your API key"
                  }
                />
                {settings?.ai.keyConfigured && settings.ai.provider === aiProvider && !newApiKey && (
                  <p className="text-xs text-muted-foreground">Leave blank to keep existing key.</p>
                )}
              </Field>
            )}

            {aiProvider === "ollama" && (
              <>
                <Field label="Ollama base URL">
                  <Input
                    value={ollamaBaseUrl}
                    onChange={(e) => setOllamaBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                  />
                </Field>
                <Field label="Model">
                  <Input
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3.1"
                  />
                </Field>
              </>
            )}

            {providerTestResult && (
              <p className={`text-sm ${providerTestResult === "ok" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {providerTestResult === "ok" ? "✓ Connection successful" : "✗ Connection failed — check your key"}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={testProvider}
                disabled={testingProvider}
                className="px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {testingProvider ? "Testing..." : "Test connection"}
              </button>
              <SaveButton loading={savingAI} />
            </div>
          </form>
        </Section>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <Section
          title="Notifications"
          description={
            telegramConnected
              ? "Configure when Ziggy proactively reaches out via Telegram."
              : "Connect Telegram below to enable proactive notifications."
          }
        >
          <form onSubmit={handleSaveNotifications} className="space-y-3">
            <Field label="Morning briefing time">
              <Input
                type="time"
                value={briefingTime}
                onChange={(e) => setBriefingTime(e.target.value)}
                disabled={!telegramConnected}
              />
            </Field>

            <div className="space-y-2">
              {[
                { label: "Daily morning briefing", value: notifBriefing, set: setNotifBriefing },
                { label: "Deadline alerts (24h before due)", value: notifDeadlines, set: setNotifDeadlines },
                { label: "Habit nudges (evening check-in)", value: notifHabits, set: setNotifHabits },
              ].map(({ label, value, set }) => (
                <label key={label} className={`flex items-center gap-3 cursor-pointer ${!telegramConnected ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <div
                    onClick={() => telegramConnected && set(!value)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      value && telegramConnected ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : ""}`} />
                  </div>
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            {!telegramConnected && (
              <p className="text-xs text-muted-foreground">
                Connect Telegram in the section below to activate notifications.
              </p>
            )}

            <SaveButton loading={savingNotifications} />
          </form>
        </Section>

        {/* ── Telegram ─────────────────────────────────────────────────────── */}
        <Section
          title="Telegram"
          description="Connect a Telegram bot to chat with Ziggy from your phone and receive notifications."
        >
          {telegramConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">✓ Bot connected</span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Disconnect Telegram? Notifications will stop.")) {
                      patch("telegram", { botToken: " " }).then(fetchSettings).catch(() => {});
                    }
                  }}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  Disconnect
                </button>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
                <p className="font-medium">Register Webhook</p>
                <p className="text-muted-foreground text-xs">Enter your public app URL (e.g. https://ziggy.yourdomain.com) to register the Telegram webhook so the bot can receive messages.</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://ziggy.yourdomain.com"
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    disabled={!webhookUrl || registeringWebhook}
                    onClick={async () => {
                      setRegisteringWebhook(true);
                      try {
                        const res = await fetch("/api/telegram/setup", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ appUrl: webhookUrl.replace(/\/$/, "") }),
                        });
                        if (!res.ok) throw new Error("Failed");
                        toast.success("Webhook registered!");
                        setWebhookUrl("");
                      } catch {
                        toast.error("Failed to register webhook");
                      } finally {
                        setRegisteringWebhook(false);
                      }
                    }}
                    className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {registeringWebhook ? "Registering…" : "Register"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveTelegram} className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1.5">
                <p className="font-medium">Setup steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Open Telegram → search <strong>@BotFather</strong></li>
                  <li>Send <code className="bg-muted px-1 rounded">/newbot</code> and follow prompts</li>
                  <li>Copy the bot token and paste below</li>
                  <li>Start a chat with your bot (so it can message you)</li>
                </ol>
              </div>

              <Field label="Bot Token">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => { setTelegramToken(e.target.value); setTelegramTestResult(null); }}
                    placeholder="123456789:ABCdef..."
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={testTelegramToken}
                    disabled={!telegramToken}
                    className="px-3 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    Test
                  </button>
                </div>
                {telegramTestResult && (
                  <p className={`text-xs mt-1 ${telegramTestResult === "invalid" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                    {telegramTestResult === "invalid" ? "Invalid token" : `✓ Connected as @${telegramTestResult}`}
                  </p>
                )}
              </Field>

              <SaveButton loading={savingTelegram}>Connect Telegram</SaveButton>
            </form>
          )}
        </Section>

        {/* ── Security: Password ────────────────────────────────────────────── */}
        <Section title="Change Password">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Field label="Current password">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                required
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
              />
            </Field>
            <SaveButton loading={savingPassword}>Change password</SaveButton>
          </form>
        </Section>

        {/* ── API Tokens ────────────────────────────────────────────────────── */}
        <Section
          title="API Tokens"
          description="Bearer tokens for external clients (Telegram bot, scripts, mobile apps). Shown once on creation."
        >
          <div className="space-y-3">
            {/* Token list */}
            {settings && settings.tokens.length > 0 ? (
              <div className="space-y-2">
                {settings.tokens.map((token) => (
                  <div key={token.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                    <div>
                      <p className="text-sm font-medium">{token.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(token.createdAt).toLocaleDateString()}
                        {token.lastUsedAt && ` · Last used ${new Date(token.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => revokeToken(token.id, token.name)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active tokens.</p>
            )}

            {/* New token reveal */}
            {createdToken && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Token created — copy it now, it won&apos;t be shown again:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all">{createdToken}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdToken);
                      toast.success("Copied to clipboard");
                    }}
                    className="shrink-0 px-2 py-1.5 text-xs rounded border border-input hover:bg-muted transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <button type="button" onClick={() => setCreatedToken(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  I&apos;ve saved it, dismiss
                </button>
              </div>
            )}

            {/* Create token form */}
            <form onSubmit={handleCreateToken} className="flex gap-2">
              <Input
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder='Token name (e.g. "telegram-bot")'
                required
              />
              <button
                type="submit"
                disabled={creatingToken || !newTokenName.trim()}
                className="px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted disabled:opacity-50 whitespace-nowrap transition-colors"
              >
                {creatingToken ? "Creating..." : "Create"}
              </button>
            </form>
          </div>
        </Section>

        {/* ── Sign out ──────────────────────────────────────────────────────── */}
        <Section title="Session">
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-md border border-destructive text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            Sign out
          </button>
        </Section>
      </div>
    </AppShell>
  );
}
