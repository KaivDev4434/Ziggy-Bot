"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  title: string;
  type: "book" | "movie" | "series";
  status: "want" | "in_progress" | "done";
  rating: number | null;
  notes: string | null;
  author: string | null;
  updatedAt: string;
}

const TYPES = ["book", "movie", "series"] as const;
const STATUSES = ["want", "in_progress", "done"] as const;

const STATUS_LABELS: Record<string, string> = {
  want: "Want",
  in_progress: "In Progress",
  done: "Done",
};

const TYPE_LABELS: Record<string, string> = {
  book: "Books",
  movie: "Movies",
  series: "Series",
};

const TYPE_ICONS: Record<string, string> = {
  book: "📚",
  movie: "🎬",
  series: "📺",
};

function StarRating({ rating, onRate }: { rating: number | null; onRate?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onRate?.(s)}
          className={`text-sm transition-colors ${s <= (rating ?? 0) ? "text-yellow-400" : "text-muted-foreground/40"} ${onRate ? "hover:text-yellow-400 cursor-pointer" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    want: "bg-muted text-muted-foreground",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? colors.want}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"book" | "movie" | "series" | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"want" | "in_progress" | "done" | "all">("all");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"book" | "movie" | "series">("book");
  const [newStatus, setNewStatus] = useState<"want" | "in_progress" | "done">("want");
  const [newAuthor, setNewAuthor] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/skills/media?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/skills/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          type: newType,
          status: newStatus,
          author: newAuthor || null,
          notes: newNotes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewTitle(""); setNewAuthor(""); setNewNotes("");
      setShowAdd(false);
      toast.success(`"${newTitle}" added`);
      fetchItems();
    } catch { toast.error("Failed to add item"); }
    finally { setSaving(false); }
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/skills/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchItems();
  }

  async function handleRate(id: string, rating: number) {
    await fetch(`/api/skills/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    fetchItems();
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Remove "${title}"?`)) return;
    await fetch(`/api/skills/media/${id}`, { method: "DELETE" });
    toast.success(`"${title}" removed`);
    fetchItems();
  }

  // Stats by type
  const countByType = (type: string) => items.filter((i) => i.type === type).length;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Media</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Books, movies & series tracker</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
              className={`bg-card border rounded-xl p-4 text-center transition-colors ${typeFilter === t ? "border-primary" : "border-border"}`}>
              <p className="text-xl">{TYPE_ICONS[t]}</p>
              <p className="text-2xl font-bold mt-1">{countByType(t)}</p>
              <p className="text-xs text-muted-foreground mt-1">{TYPE_LABELS[t]}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {(["all", ...STATUSES] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {s === "all" ? "All" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No items yet. Tell Ziggy &quot;I want to read Atomic Habits&quot; or &quot;just finished watching Dune&quot; and it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        {item.author && <p className="text-xs text-muted-foreground truncate">{item.author}</p>}
                      </div>
                      <button onClick={() => handleDelete(item.id, item.title)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors text-xs">×</button>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <StatusBadge status={item.status} />
                      <StarRating rating={item.rating} onRate={(r) => handleRate(item.id, r)} />
                    </div>

                    {/* Status change buttons */}
                    <div className="flex gap-1 mt-2">
                      {STATUSES.filter((s) => s !== item.status).map((s) => (
                        <button key={s} onClick={() => handleStatusChange(item.id, s)}
                          className="text-xs px-2 py-0.5 rounded border border-input hover:bg-muted transition-colors">
                          → {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>

                    {item.notes && <p className="text-xs text-muted-foreground mt-1.5 truncate">{item.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add button */}
        <button onClick={() => setShowAdd(!showAdd)}
          className="w-full py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          + Add manually
        </button>

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <input type="text" placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-2">
              <select value={newType} onChange={(e) => setNewType(e.target.value as typeof newType)}
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t].slice(0, -1)}</option>)}
              </select>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as typeof newStatus)}
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            {(newType === "book") && (
              <input type="text" placeholder="Author (optional)" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            )}
            <input type="text" placeholder="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={saving || !newTitle}
                className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
