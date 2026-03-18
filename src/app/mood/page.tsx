"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

interface MoodEntry {
  id: string;
  energy: number | null;
  mood: number | null;
  notes: string | null;
  tags: string | null;
  date: string;
}

function ScoreDot({ value, color }: { value: number | null; color: string }) {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white ${color}`}>
      {value}
    </span>
  );
}

function moodColor(v: number): string {
  if (v >= 8) return "bg-green-500";
  if (v >= 6) return "bg-lime-500";
  if (v >= 4) return "bg-yellow-500";
  if (v >= 2) return "bg-orange-500";
  return "bg-red-500";
}

function avgOf(entries: MoodEntry[], key: "mood" | "energy"): string {
  const vals = entries.map((e) => e[key]).filter((v): v is number => v != null);
  if (vals.length === 0) return "—";
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

export default function MoodPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // Quick-add form
  const [energy, setEnergy] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/skills/mood?days=${days}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/skills/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energy: energy ? parseInt(energy) : null,
          mood: mood ? parseInt(mood) : null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setEnergy(""); setMood(""); setNotes("");
      toast.success("Entry logged");
      fetchEntries();
    } catch {
      toast.error("Failed to log entry");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch("/api/skills/mood", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchEntries();
  }

  const avgMood = avgOf(entries, "mood");
  const avgEnergy = avgOf(entries, "energy");

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mood & Energy</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Extracted from your chats + manual entries</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Avg Mood", value: avgMood, suffix: "/10" },
            { label: "Avg Energy", value: avgEnergy, suffix: "/10" },
            { label: "Entries", value: String(entries.length), suffix: "" },
          ].map(({ label, value, suffix }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{value}<span className="text-sm text-muted-foreground font-normal">{suffix}</span></p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick add */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-3">Log manually</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Energy (1–10)</label>
                <input type="number" min="1" max="10" value={energy}
                  onChange={(e) => setEnergy(e.target.value)}
                  placeholder="7"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Mood (1–10)</label>
                <input type="number" min="1" max="10" value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="8"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes... (optional)"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" disabled={adding || (!energy && !mood)}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {adding ? "Logging..." : "Log entry"}
            </button>
          </form>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show last</span>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${days === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
              {d}d
            </button>
          ))}
        </div>

        {/* Entries */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">No entries yet. Chat with Ziggy about how you&apos;re feeling and entries will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const tags = entry.tags ? JSON.parse(entry.tags) as string[] : [];
              return (
                <div key={entry.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
                  <div className="flex gap-2 shrink-0">
                    <div className="text-center">
                      <ScoreDot value={entry.mood} color={entry.mood ? moodColor(entry.mood) : ""} />
                      <p className="text-xs text-muted-foreground mt-0.5">mood</p>
                    </div>
                    <div className="text-center">
                      <ScoreDot value={entry.energy} color={entry.energy ? moodColor(entry.energy) : ""} />
                      <p className="text-xs text-muted-foreground mt-0.5">energy</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    {entry.notes && <p className="text-sm mt-0.5">{entry.notes}</p>}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.map((tag: string) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(entry.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors text-xs">
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
