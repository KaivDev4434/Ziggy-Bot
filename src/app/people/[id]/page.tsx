"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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

const RELATIONSHIPS = ["friend", "family", "colleague", "other"];

const REL_COLORS: Record<string, string> = {
  friend: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  family: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  colleague: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  other: "bg-muted text-muted-foreground",
};

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRel, setEditRel] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Add interaction
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [intSummary, setIntSummary] = useState("");
  const [intFollowUp, setIntFollowUp] = useState("");
  const [intDueDate, setIntDueDate] = useState("");
  const [savingInt, setSavingInt] = useState(false);

  const fetchPerson = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/skills/people/${id}`);
      if (!res.ok) { router.push("/people"); return; }
      const data = await res.json();
      setPerson(data);
      setEditName(data.name);
      setEditRel(data.relationship ?? "friend");
      setEditNotes(data.notes ?? "");
      setEditBirthday(data.birthday ? data.birthday.split("T")[0] : "");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchPerson(); }, [fetchPerson]);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/skills/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          relationship: editRel,
          notes: editNotes || null,
          birthday: editBirthday || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditing(false);
      toast.success("Updated");
      fetchPerson();
    } catch { toast.error("Failed to update"); }
    finally { setSavingEdit(false); }
  }

  async function handleAddInteraction(e: React.FormEvent) {
    e.preventDefault();
    setSavingInt(true);
    try {
      const res = await fetch(`/api/skills/people/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: intSummary,
          followUp: intFollowUp || null,
          dueDate: intDueDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setIntSummary(""); setIntFollowUp(""); setIntDueDate("");
      setShowAddInteraction(false);
      toast.success("Interaction logged");
      fetchPerson();
    } catch { toast.error("Failed to log interaction"); }
    finally { setSavingInt(false); }
  }

  async function handleDeleteInteraction(interactionId: string) {
    await fetch(`/api/skills/people/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interactionId }),
    });
    fetchPerson();
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
        </div>
      </AppShell>
    );
  }

  if (!person) return null;

  const relColor = REL_COLORS[person.relationship ?? "other"] ?? REL_COLORS.other;
  const overdueInteractions = person.interactions.filter(
    (i) => i.dueDate && new Date(i.dueDate) < new Date() && i.followUp
  );

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/people" className="text-muted-foreground hover:text-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{person.name}</h1>
              {person.relationship && (
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${relColor}`}>{person.relationship}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(!editing)}
              className="text-sm px-3 py-1.5 rounded-lg border border-input hover:bg-muted transition-colors">
              {editing ? "Cancel" : "Edit"}
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <form onSubmit={handleSaveEdit} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required placeholder="Name"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <select value={editRel} onChange={(e) => setEditRel(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes (optional)"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Birthday (optional)</label>
              <input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={savingEdit || !editName}
                className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}

        {/* Notes / Birthday */}
        {(person.notes || person.birthday) && !editing && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            {person.notes && <p className="text-sm text-muted-foreground">{person.notes}</p>}
            {person.birthday && (
              <p className="text-xs text-muted-foreground">
                🎂 {new Date(person.birthday).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
              </p>
            )}
          </div>
        )}

        {/* Overdue follow-ups */}
        {overdueInteractions.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <p className="text-sm font-medium text-destructive mb-2">Overdue follow-ups</p>
            {overdueInteractions.map((i) => (
              <div key={i.id} className="text-sm">
                <span>{i.followUp}</span>
                {i.dueDate && (
                  <span className="text-xs text-muted-foreground ml-2">
                    was due {new Date(i.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Interactions */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Interactions ({person.interactions.length})</h2>
        </div>

        {person.interactions.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No interactions logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {person.interactions.map((interaction) => {
              const hasOverdueFollowUp = interaction.followUp && interaction.dueDate && new Date(interaction.dueDate) < new Date();
              return (
                <div key={interaction.id}
                  className={`bg-card border rounded-xl p-4 ${hasOverdueFollowUp ? "border-destructive/40" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{interaction.summary}</p>
                      {interaction.followUp && (
                        <p className={`text-xs mt-1 ${hasOverdueFollowUp ? "text-destructive" : "text-muted-foreground"}`}>
                          Follow-up: {interaction.followUp}
                          {interaction.dueDate && (
                            <span className="ml-1">
                              · {new Date(interaction.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(interaction.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteInteraction(interaction.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors text-xs">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add interaction */}
        <button onClick={() => setShowAddInteraction(!showAddInteraction)}
          className="w-full py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          + Log interaction
        </button>

        {showAddInteraction && (
          <form onSubmit={handleAddInteraction} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <input type="text" placeholder="What happened? (e.g. had coffee, called about job)" value={intSummary}
              onChange={(e) => setIntSummary(e.target.value)} required
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="text" placeholder="Follow-up action (optional)" value={intFollowUp}
              onChange={(e) => setIntFollowUp(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {intFollowUp && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Due date (optional)</label>
                <input type="date" value={intDueDate} onChange={(e) => setIntDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddInteraction(false)}
                className="flex-1 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={savingInt || !intSummary}
                className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {savingInt ? "Logging..." : "Log"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
