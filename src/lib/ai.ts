// AI Chat Processing Service
// Handles message processing, system prompt building, and response parsing.
// Uses the AI provider registry for model-agnostic communication.

import { RECENT_MESSAGES_FOR_CONTEXT, UPCOMING_DEADLINE_DAYS } from "@/lib/constants";
import { chat } from "@/lib/ai/registry";
import { calculateStreak } from "@/lib/services/habitService";
import { buildMemoryContext } from "@/lib/services/memoryService";
import type { AIContext, ExtractedTodo, AIExtractions } from "@/types";

export type { AIContext, ExtractedTodo, ExtractedHabit, ExtractedLandmark, AIExtractions } from "@/types";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildSystemPrompt(context?: AIContext, memoryContext?: string): string {
  let contextSection = "";
  
  if (context) {
    const locationInfo = context.location 
      ? `- User's location: ${context.location.city ? `${context.location.city}, ` : ""}${context.location.country || "Unknown"}${context.location.lat ? ` (${context.location.lat.toFixed(2)}°, ${context.location.lon?.toFixed(2)}°)` : ""}`
      : "- User's location: Not available";

    contextSection = `

CURRENT CONTEXT (USE THIS TO ANSWER USER QUESTIONS):
- Current date and time: ${context.currentDateTime}
- Timezone: ${context.timezone}
${locationInfo}

IMPORTANT: When the user asks about time, date, or location, USE THE ABOVE INFORMATION. Do not say you cannot access their location or time - you have it!

PENDING TASKS (${context.pendingTodos.length} total):
${context.pendingTodos.length > 0 
  ? context.pendingTodos.map(t => 
      `- [ID: ${t.id}] "${t.title}"${t.category ? ` (${t.category})` : ""}${t.dueDate ? ` due: ${t.dueDate}` : ""}${t.priority ? ` priority: ${t.priority}` : ""}`
    ).join("\n")
  : "- No pending tasks"}

TODAY'S HABITS:
${context.todayHabits.length > 0
  ? context.todayHabits.map(h => 
      `- ${h.name}: ${h.completedToday ? "✓ Done" : "○ Not done"}${h.streak > 0 ? ` (${h.streak} day streak)` : ""}`
    ).join("\n")
  : "- No habits tracked yet"}

UPCOMING DEADLINES (this week):
${context.upcomingDeadlines.length > 0
  ? context.upcomingDeadlines.map(d => 
      `- "${d.title}" due ${d.dueDate} (${d.daysLeft} days left)`
    ).join("\n")
  : "- No upcoming deadlines"}
`;
  }

  return `You are Ziggy, a warm and friendly personal AI assistant. You help users organize their lives by understanding their messages and extracting actionable items.
${contextSection}${memoryContext || ""}
When users chat with you:
1. Respond conversationally in a helpful, encouraging tone
2. Extract any tasks, habits, or life landmarks mentioned
3. Be concise but friendly
4. When the user mentions completing, updating, or deleting a task, match it to existing tasks by title

Always respond with valid JSON in this exact format:
{
  "response": "Your conversational response to the user",
  "todos": [
    {
      "action": "create",
      "title": "Task title",
      "description": "Optional description",
      "priority": 2,
      "dueDate": "2025-12-15",
      "doDate": "2025-12-14",
      "category": "work"
    }
  ],
  "habits": [
    {
      "name": "Habit name",
      "frequency": "daily"
    }
  ],
  "landmarks": [
    {
      "title": "Life event title",
      "date": "2025-12-11",
      "notes": "Optional notes"
    }
  ]
}

TODO ACTION RULES:
- "action" must be one of: "create", "update", "complete", "delete"
- For "update", "complete", or "delete": include "id" field matching an existing task from PENDING TASKS
- If user says they finished/completed/done a task, use action: "complete"
- If user wants to change a task's details, use action: "update" with the new values
- If user wants to remove a task, use action: "delete"

OPTIONAL FIELDS (only include when clearly stated or implied):
- "priority": 1=urgent/high, 2=medium, 3=low (only if user indicates urgency)
- "dueDate": deadline in YYYY-MM-DD format (only if user mentions a deadline)
- "doDate": when to start working in YYYY-MM-DD format (only if user says "start on", "begin", etc.)
- "category": dynamically inferred from context. Common categories: "work", "personal", "chores", "groceries", "finance", "health", "projects", "errands", "shopping"
- Only set fields that are clearly stated or strongly implied. Omit fields if not mentioned.

DATE INTERPRETATION:
- "today" = ${context?.currentDateTime?.split(",")[0] || "current date"}
- "tomorrow" = next day
- "this Friday" = upcoming Friday
- "next week" = 7 days from now
- "by Monday" = deadline is Monday (dueDate)
- "starting Monday" = begin on Monday (doDate)

GENERAL RULES:
- Extract actionable tasks (things to do, calls to make, items to buy)
- Identify habits the user wants to track (exercise, meditation, reading)
- Recognize life landmarks (birthdays, anniversaries, achievements)
- If no clear items found, return empty arrays
- Keep your response warm and personable
- Reference the user's pending tasks and habits in your response when relevant`;
}

export async function processMessage(
  userMessage: string,
  recentMessages: { role: string; content: string }[],
  context?: AIContext
): Promise<AIExtractions> {
  // Load persistent memories to inject into context
  let memoryContext = "";
  try {
    memoryContext = await buildMemoryContext();
  } catch (error) {
    console.error("Failed to load memories:", error);
  }

  // Filter recent messages to ensure proper alternation (user/assistant/user/assistant...)
  const filteredMessages: Message[] = [];
  let lastRole: string | null = null;
  
  for (const m of recentMessages.slice(-RECENT_MESSAGES_FOR_CONTEXT)) {
    if (m.role === lastRole) continue;
    if (m.role === "user" && m.content === userMessage) continue;
    filteredMessages.push({
      role: m.role as "user" | "assistant",
      content: m.content,
    });
    lastRole = m.role;
  }
  
  while (filteredMessages.length > 0 && filteredMessages[0].role === "assistant") {
    filteredMessages.shift();
  }
  
  while (filteredMessages.length > 0 && filteredMessages[filteredMessages.length - 1].role === "user") {
    filteredMessages.pop();
  }

  const systemPrompt = buildSystemPrompt(context, memoryContext);

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...filteredMessages,
    { role: "user", content: userMessage },
  ];

  try {
    // Use the provider registry -- automatically selects the configured provider
    const result = await chat(messages);
    const content = result.content;

    // Parse the JSON response
    try {
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }
      
      const parsed = JSON.parse(jsonContent);
      
      const normalizedTodos = (parsed.todos || []).map((todo: ExtractedTodo) => ({
        ...todo,
        action: todo.action || "create",
      }));
      
      return {
        todos: normalizedTodos,
        habits: parsed.habits || [],
        landmarks: parsed.landmarks || [],
        conversationalResponse: parsed.response || "I understood your message!",
      };
    } catch {
      return {
        todos: [],
        habits: [],
        landmarks: [],
        conversationalResponse: content,
      };
    }
  } catch (error) {
    console.error("AI processing error:", error);
    return {
      todos: [],
      habits: [],
      landmarks: [],
      conversationalResponse: "I had trouble processing that. Could you try again?",
    };
  }
}

// --- Date helpers ---

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetweenLocal(from: Date, to: Date): number {
  const fromLocal = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toLocal = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toLocal.getTime() - fromLocal.getTime()) / (24 * 60 * 60 * 1000));
}

// --- Context Builder ---

export function buildAIContext(
  todos: {
    id: string;
    title: string;
    category: string | null;
    priority: number | null;
    dueDate: Date | null;
    doDate: Date | null;
    status: string;
  }[],
  habits: {
    name: string;
    records: { date: Date; completed: boolean }[];
  }[],
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lon?: number;
  }
): AIContext {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const pendingTodos = todos
    .filter((t) => t.status === "pending")
    .map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      dueDate: t.dueDate ? toLocalDateString(new Date(t.dueDate)) : null,
      doDate: t.doDate ? toLocalDateString(new Date(t.doDate)) : null,
    }));

  // Use shared streak calculation from habitService
  const todayHabits = habits.map((h) => {
    const { streak, completedToday } = calculateStreak(h.records, today);
    return {
      name: h.name,
      completedToday,
      streak,
    };
  });

  const upcomingDeadlines = todos
    .filter((t) => {
      if (t.status !== "pending" || !t.dueDate) return false;
      const daysLeft = daysBetweenLocal(today, new Date(t.dueDate));
      return daysLeft >= 0 && daysLeft <= UPCOMING_DEADLINE_DAYS;
    })
    .map((t) => ({
      title: t.title,
      dueDate: toLocalDateString(new Date(t.dueDate!)),
      daysLeft: daysBetweenLocal(today, new Date(t.dueDate!)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    currentDateTime: now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    timezone,
    location,
    pendingTodos,
    todayHabits,
    upcomingDeadlines,
  };
}
