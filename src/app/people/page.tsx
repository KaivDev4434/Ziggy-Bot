"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import Link from "next/link";

interface Interaction {
  id: string;
  summary: string;
  followUp: string | null;
  dueDate: string | null;
  date: string;
}

interface Person {
  id: string;
  name: string;
  relationship: string | null;
  notes: string | null;
  birthday: string | null;
  interactions: Interaction[];
}

interface FollowUp {
  id: string;
  summary: string;
  followUp: string;
  dueDate: string | null;
  person: { id: string; name: string };
}

const RELATIONSHIPS = ["friend", "family", "colleague", "other"];

function RelationshipBadge({ rel }: { rel: string | null }) {
  const colors: Record<string, string> = {
    friend: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    family: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    colleague: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    other: "bg-muted text-muted-foreground",
  };
  if (!rel) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${colors[rel] ?? colors.other}`}>{rel}</span>
  );
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"people" | "follow-ups">("people");

  // Add person form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRel, setNewRel] = useState("friend");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/skills/people");
      const data = await res.json();
      setPeople(data.people ?? []);
      setFollowUps(data.followUps ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/skills/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, relationship: newRel, notes: newNotes || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewName(""); setNewNotes(""); setShowAdd(false);
      toast.success(`${newName} added`);
      fetchData();
    } catch { toast.error("Failed to add person"); }
    finally { setSaving(false); }
  }

  async function handleDeletePerson(id: string, name: string) {
    if (!confirm(`Remove ${name} and all their interactions?`)) return;
    await fetch(`/api/skills/people/${id}`, { method: "DELETE" });
    toast.success(`${name} removed`);
    fetchData();
  }

  const overdueFollowUps = followUps.filter((f) => f.dueDate && new Date(f.dueDate) < new Date());

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">People</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Relationships & interactions</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "People", value: people.length },
            { label: "Follow-ups", value: followUps.length },
            { label: "Overdue", value: overdueFollowUps.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${label === "Overdue" && value > 0 ? "text-destructive" : ""}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {(["people", "follow-ups"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {v}
              {v === "follow-ups" && overdueFollowUps.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs">{overdueFollowUps.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : view === "people" ? (
          <>
            {people.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground text-sm">No people tracked yet. Mention someone in chat (e.g. &quot;called Mom today&quot;) and they&apos;ll appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {people.map((p) => (
                  <Link key={p.id} href={`/people/${p.id}`}
                    className="block bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          <RelationshipBadge rel={p.relationship} />
                        </div>
                        {p.interactions[0] && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Last: {p.interactions[0].summary} · {new Date(p.interactions[0].date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </p>
                        )}
                        {p.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.notes}</p>}
                      </div>
                      <button onClick={(e) => { e.preventDefault(); handleDeletePerson(p.id, p.name); }}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors text-xs">×</button>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <button onClick={() => setShowAdd(!showAdd)}
              className="w-full py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              + Add person manually
            </button>

            {showAdd && (
              <form onSubmit={handleAddPerson} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <select value={newRel} onChange={(e) => setNewRel(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="text" placeholder="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors">Cancel</button>
                  <button type="submit" disabled={saving || !newName} className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {saving ? "Adding..." : "Add"}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* Follow-ups tab */
          followUps.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-sm">No follow-ups pending. When you tell Ziggy &quot;call John next week&quot;, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {followUps.map((f) => {
                const isOverdue = f.dueDate && new Date(f.dueDate) < new Date();
                return (
                  <div key={f.id} className={`bg-card border rounded-xl p-4 ${isOverdue ? "border-destructive/50" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/people/${f.person.id}`} className="font-medium hover:underline">{f.person.name}</Link>
                          {isOverdue && <span className="text-xs text-destructive font-medium">Overdue</span>}
                        </div>
                        <p className="text-sm mt-0.5">{f.followUp}</p>
                        {f.dueDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due {new Date(f.dueDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}
