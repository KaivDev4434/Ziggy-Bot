// Search Service
// Provides full-text search across messages, todos, habits, and memories

import prisma from "@/lib/db";

export interface SearchResult {
  type: "message" | "todo" | "habit" | "memory";
  id: string;
  title: string;
  snippet: string;
  date?: Date;
  metadata?: Record<string, unknown>;
}

export interface SearchResults {
  messages: SearchResult[];
  todos: SearchResult[];
  habits: SearchResult[];
  memories: SearchResult[];
  total: number;
}

/**
 * Highlight matching text in a string
 */
function createSnippet(text: string, query: string, maxLength = 100): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
  }

  // Get context around the match
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + query.length + 50);
  
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Search across messages
 */
export async function searchMessages(query: string, limit = 10): Promise<SearchResult[]> {
  const messages = await prisma.message.findMany({
    where: {
      content: {
        contains: query,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.map((m) => ({
    type: "message" as const,
    id: m.id,
    title: m.role === "user" ? "You" : "Ziggy",
    snippet: createSnippet(m.content, query),
    date: m.date,
    metadata: { role: m.role },
  }));
}

/**
 * Search across todos
 */
export async function searchTodos(query: string, limit = 10): Promise<SearchResult[]> {
  const todos = await prisma.todo.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { category: { contains: query } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return todos.map((t) => ({
    type: "todo" as const,
    id: t.id,
    title: t.title,
    snippet: t.description
      ? createSnippet(t.description, query)
      : t.category
      ? `Category: ${t.category}`
      : t.status,
    date: t.createdAt,
    metadata: { status: t.status, priority: t.priority, category: t.category },
  }));
}

/**
 * Search across habits
 */
export async function searchHabits(query: string, limit = 10): Promise<SearchResult[]> {
  const habits = await prisma.habit.findMany({
    where: {
      name: { contains: query },
      active: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return habits.map((h) => ({
    type: "habit" as const,
    id: h.id,
    title: h.name,
    snippet: `${h.frequency} habit`,
    date: h.createdAt,
    metadata: { frequency: h.frequency },
  }));
}

/**
 * Search across memories
 */
export async function searchMemories(query: string, limit = 10): Promise<SearchResult[]> {
  const memories = await prisma.memory.findMany({
    where: {
      fact: { contains: query },
      active: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return memories.map((m) => ({
    type: "memory" as const,
    id: m.id,
    title: m.category,
    snippet: createSnippet(m.fact, query),
    date: m.createdAt,
    metadata: { category: m.category, source: m.source },
  }));
}

/**
 * Search across all content types
 */
export async function searchAll(
  query: string,
  type?: "all" | "messages" | "todos" | "habits" | "memories"
): Promise<SearchResults> {
  const searchType = type || "all";

  const [messages, todos, habits, memories] = await Promise.all([
    searchType === "all" || searchType === "messages"
      ? searchMessages(query)
      : Promise.resolve([]),
    searchType === "all" || searchType === "todos"
      ? searchTodos(query)
      : Promise.resolve([]),
    searchType === "all" || searchType === "habits"
      ? searchHabits(query)
      : Promise.resolve([]),
    searchType === "all" || searchType === "memories"
      ? searchMemories(query)
      : Promise.resolve([]),
  ]);

  return {
    messages,
    todos,
    habits,
    memories,
    total: messages.length + todos.length + habits.length + memories.length,
  };
}
