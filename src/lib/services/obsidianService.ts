// Obsidian Vault Service
// Handles reading and writing notes to a local Obsidian vault

import { promises as fs } from "fs";
import path from "path";

// Get vault path from environment variable
function getVaultPath(): string | null {
  return process.env.OBSIDIAN_VAULT_PATH || null;
}

/**
 * Check if Obsidian vault is configured and accessible
 */
export async function isVaultConfigured(): Promise<boolean> {
  const vaultPath = getVaultPath();
  if (!vaultPath) return false;

  try {
    await fs.access(vaultPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get vault configuration info
 */
export async function getVaultInfo(): Promise<{
  configured: boolean;
  path: string | null;
  accessible: boolean;
  noteCount?: number;
}> {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return { configured: false, path: null, accessible: false };
  }

  try {
    await fs.access(vaultPath);
    const notes = await listNotes();
    return {
      configured: true,
      path: vaultPath,
      accessible: true,
      noteCount: notes.length,
    };
  } catch {
    return { configured: true, path: vaultPath, accessible: false };
  }
}

export interface Note {
  name: string;
  path: string;
  relativePath: string;
  modified: Date;
  content?: string;
}

/**
 * List all markdown notes in the vault
 */
export async function listNotes(subdir?: string): Promise<Note[]> {
  const vaultPath = getVaultPath();
  if (!vaultPath) return [];

  const targetPath = subdir ? path.join(vaultPath, subdir) : vaultPath;
  const notes: Note[] = [];

  try {
    await collectNotes(targetPath, vaultPath, notes);
    // Sort by modified date (newest first)
    notes.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    return notes;
  } catch (error) {
    console.error("Error listing notes:", error);
    return [];
  }
}

async function collectNotes(
  dir: string,
  vaultPath: string,
  notes: Note[]
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip hidden files and directories
    if (entry.name.startsWith(".")) continue;
    // Skip obsidian config folder
    if (entry.name === ".obsidian") continue;

    if (entry.isDirectory()) {
      await collectNotes(fullPath, vaultPath, notes);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const stat = await fs.stat(fullPath);
      notes.push({
        name: entry.name.replace(/\.md$/, ""),
        path: fullPath,
        relativePath: path.relative(vaultPath, fullPath),
        modified: stat.mtime,
      });
    }
  }
}

/**
 * Read a note's content
 */
export async function readNote(relativePath: string): Promise<Note | null> {
  const vaultPath = getVaultPath();
  if (!vaultPath) return null;

  // Ensure the path ends with .md
  const notePath = relativePath.endsWith(".md")
    ? relativePath
    : `${relativePath}.md`;
  const fullPath = path.join(vaultPath, notePath);

  // Security check: ensure we're still within the vault
  const normalizedPath = path.normalize(fullPath);
  if (!normalizedPath.startsWith(path.normalize(vaultPath))) {
    console.error("Security: Attempted to read outside vault");
    return null;
  }

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    const stat = await fs.stat(fullPath);
    return {
      name: path.basename(relativePath, ".md"),
      path: fullPath,
      relativePath: notePath,
      modified: stat.mtime,
      content,
    };
  } catch (error) {
    console.error("Error reading note:", error);
    return null;
  }
}

/**
 * Write or update a note
 */
export async function writeNote(
  relativePath: string,
  content: string
): Promise<boolean> {
  const vaultPath = getVaultPath();
  if (!vaultPath) return false;

  // Ensure the path ends with .md
  const notePath = relativePath.endsWith(".md")
    ? relativePath
    : `${relativePath}.md`;
  const fullPath = path.join(vaultPath, notePath);

  // Security check: ensure we're still within the vault
  const normalizedPath = path.normalize(fullPath);
  if (!normalizedPath.startsWith(path.normalize(vaultPath))) {
    console.error("Security: Attempted to write outside vault");
    return false;
  }

  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    await fs.writeFile(fullPath, content, "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing note:", error);
    return false;
  }
}

/**
 * Delete a note
 */
export async function deleteNote(relativePath: string): Promise<boolean> {
  const vaultPath = getVaultPath();
  if (!vaultPath) return false;

  // Ensure the path ends with .md
  const notePath = relativePath.endsWith(".md")
    ? relativePath
    : `${relativePath}.md`;
  const fullPath = path.join(vaultPath, notePath);

  // Security check: ensure we're still within the vault
  const normalizedPath = path.normalize(fullPath);
  if (!normalizedPath.startsWith(path.normalize(vaultPath))) {
    console.error("Security: Attempted to delete outside vault");
    return false;
  }

  try {
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    console.error("Error deleting note:", error);
    return false;
  }
}

/**
 * Search notes by content
 */
export async function searchNotes(query: string): Promise<Note[]> {
  const vaultPath = getVaultPath();
  if (!vaultPath || !query.trim()) return [];

  const allNotes = await listNotes();
  const results: Note[] = [];
  const lowerQuery = query.toLowerCase();

  for (const note of allNotes) {
    // First check name
    if (note.name.toLowerCase().includes(lowerQuery)) {
      const fullNote = await readNote(note.relativePath);
      if (fullNote) results.push(fullNote);
      continue;
    }

    // Then check content
    try {
      const content = await fs.readFile(note.path, "utf-8");
      if (content.toLowerCase().includes(lowerQuery)) {
        results.push({ ...note, content });
      }
    } catch {
      // Skip files we can't read
    }
  }

  return results.slice(0, 10); // Limit results
}

/**
 * Get recently modified notes for AI context
 */
export async function getRecentNotesContext(limit = 5): Promise<string> {
  const configured = await isVaultConfigured();
  if (!configured) return "";

  const notes = await listNotes();
  if (notes.length === 0) return "";

  const recentNotes = notes.slice(0, limit);
  const notesList = recentNotes
    .map((n) => `- ${n.name} (modified: ${n.modified.toLocaleDateString()})`)
    .join("\n");

  return `\nRECENT NOTES (Obsidian Vault):
${notesList}
(User can ask you to read, write, or search notes)`;
}

/**
 * Append content to an existing note (useful for daily notes, logs)
 */
export async function appendToNote(
  relativePath: string,
  content: string
): Promise<boolean> {
  const vaultPath = getVaultPath();
  if (!vaultPath) return false;

  const existingNote = await readNote(relativePath);

  if (existingNote && existingNote.content !== undefined) {
    // Append with a newline
    const newContent = existingNote.content + "\n" + content;
    return writeNote(relativePath, newContent);
  } else {
    // Create new note
    return writeNote(relativePath, content);
  }
}

/**
 * Create a daily note with Ziggy context
 */
export async function createDailyNote(
  content: string,
  folder = "Ziggy"
): Promise<boolean> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
  const relativePath = `${folder}/${dateStr}.md`;

  const header = `# Daily Note - ${today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}\n\n`;

  return appendToNote(relativePath, header + content);
}
