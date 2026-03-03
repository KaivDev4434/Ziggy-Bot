"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AppShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileText,
  Plus,
  Search,
  ArrowLeft,
  Save,
  Trash2,
  FolderOpen,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface Note {
  name: string;
  relativePath: string;
  modified: string;
  content?: string;
}

interface VaultStatus {
  configured: boolean;
  path: string | null;
  accessible: boolean;
  noteCount?: number;
}

export default function NotesPage() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [newNoteName, setNewNoteName] = useState("");
  const [showNewNote, setShowNewNote] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/notes/status");
      const data = await res.json();
      setStatus(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch vault status:", error);
      toast.error("Failed to check vault status");
      return null;
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes/list");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      toast.error("Failed to load notes");
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const vaultStatus = await fetchStatus();
      if (vaultStatus?.accessible) {
        await fetchNotes();
      }
      setLoading(false);
    }
    init();
  }, [fetchStatus, fetchNotes]);

  const handleSelectNote = async (note: Note) => {
    try {
      const res = await fetch(
        `/api/notes/read?path=${encodeURIComponent(note.relativePath)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedNote(data);
        setEditContent(data.content || "");
        setEditing(false);
      } else {
        toast.error("Failed to read note");
      }
    } catch (error) {
      console.error("Failed to read note:", error);
      toast.error("Failed to read note");
    }
  };

  const handleSave = async () => {
    if (!selectedNote) return;

    try {
      const res = await fetch("/api/notes/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedNote.relativePath,
          content: editContent,
        }),
      });

      if (res.ok) {
        toast.success("Note saved");
        setSelectedNote({ ...selectedNote, content: editContent });
        setEditing(false);
        await fetchNotes();
      } else {
        toast.error("Failed to save note");
      }
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;

    if (!confirm(`Delete "${selectedNote.name}"?`)) return;

    try {
      const res = await fetch("/api/notes/write", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedNote.relativePath }),
      });

      if (res.ok) {
        toast.success("Note deleted");
        setSelectedNote(null);
        await fetchNotes();
      } else {
        toast.error("Failed to delete note");
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteName.trim()) {
      toast.error("Please enter a note name");
      return;
    }

    const path = `${newNoteName.trim()}.md`;

    try {
      const res = await fetch("/api/notes/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          content: `# ${newNoteName.trim()}\n\n`,
        }),
      });

      if (res.ok) {
        toast.success("Note created");
        setNewNoteName("");
        setShowNewNote(false);
        await fetchNotes();
        // Open the new note
        handleSelectNote({ name: newNoteName.trim(), relativePath: path, modified: new Date().toISOString() });
      } else {
        toast.error("Failed to create note");
      }
    } catch (error) {
      console.error("Failed to create note:", error);
      toast.error("Failed to create note");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await fetchNotes();
      return;
    }

    try {
      const res = await fetch(
        `/api/notes/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch (error) {
      console.error("Failed to search notes:", error);
      toast.error("Failed to search notes");
    }
  };

  const filteredNotes = searchQuery
    ? notes.filter((n) =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  // Not configured state
  if (!loading && status && !status.configured) {
    return (
      <AppShell>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">📝 Notes</h1>
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={<FolderOpen className="w-8 h-8 text-muted-foreground" />}
                title="Obsidian Vault Not Configured"
                description="To use notes, add OBSIDIAN_VAULT_PATH to your .env file pointing to your vault directory."
              />
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-mono text-muted-foreground">
                  OBSIDIAN_VAULT_PATH=/path/to/your/vault
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Vault not accessible
  if (!loading && status && status.configured && !status.accessible) {
    return (
      <AppShell>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">📝 Notes</h1>
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={<AlertCircle className="w-8 h-8 text-destructive" />}
                title="Cannot Access Vault"
                description={`The configured vault path is not accessible: ${status.path}`}
              />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {selectedNote && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedNote(null);
                  setEditing(false);
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-2xl font-bold">
              {selectedNote ? selectedNote.name : "📝 Notes"}
            </h1>
          </div>

          {!selectedNote && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewNote(!showNewNote)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </Button>
              {status?.path && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Open vault in Obsidian
                    window.open(`obsidian://open?vault=${encodeURIComponent(status.path!.split("/").pop() || "")}`, "_blank");
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Obsidian
                </Button>
              )}
            </div>
          )}

          {selectedNote && (
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditing(false);
                    setEditContent(selectedNote.content || "");
                  }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* New Note Form */}
        <AnimatePresence>
          {showNewNote && !selectedNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Note name..."
                      value={newNoteName}
                      onChange={(e) => setNewNoteName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateNote()}
                    />
                    <Button onClick={handleCreateNote}>Create</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search (when not viewing a note) */}
        {!selectedNote && (
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              Search
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Notes List */}
        {!loading && !selectedNote && (
          <>
            {filteredNotes.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-muted-foreground" />}
                title={searchQuery ? "No notes found" : "No notes yet"}
                description={
                  searchQuery
                    ? "Try a different search term"
                    : "Create your first note to get started"
                }
                action={
                  !searchQuery
                    ? {
                        label: "New Note",
                        onClick: () => setShowNewNote(true),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {filteredNotes.map((note) => (
                    <motion.div
                      key={note.relativePath}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSelectNote(note)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            {note.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            {new Date(note.modified).toLocaleDateString()}
                          </p>
                          {note.relativePath.includes("/") && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📁 {note.relativePath.split("/").slice(0, -1).join("/")}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Note Detail View */}
        {selectedNote && (
          <Card>
            <CardContent className="pt-6">
              {editing ? (
                <textarea
                  className="w-full h-[60vh] p-4 rounded-lg bg-muted font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {selectedNote.content}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vault Info */}
        {!loading && status?.accessible && !selectedNote && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              {status.noteCount} notes in vault •{" "}
              <span className="font-mono text-xs">{status.path}</span>
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
