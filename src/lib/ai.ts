// AI Service for Perplexity API integration

import { AI_CONFIG, RECENT_MESSAGES_FOR_CONTEXT, MAX_STREAK_DAYS, UPCOMING_DEADLINE_DAYS } from "@/lib/constants";
import type { AIContext, ExtractedTodo, AIExtractions } from "@/types";

export type { AIContext, ExtractedTodo, ExtractedHabit, ExtractedLandmark, AIExtractions } from "@/types";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

function buildSystemPrompt(context?: AIContext): string {
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
${contextSection}
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
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    // Return a fallback response when API key is not configured
    return {
      todos: [],
      habits: [],
      landmarks: [],
      conversationalResponse:
        "I'm not fully configured yet! Please add your Perplexity API key to the .env file to enable AI features. In the meantime, I can still help you track your tasks manually.",
    };
  }

  // Filter recent messages to ensure proper alternation (user/assistant/user/assistant...)
  // Perplexity API requires messages to alternate after the system prompt
  const filteredMessages: Message[] = [];
  let lastRole: string | null = null;
  
  for (const m of recentMessages.slice(-RECENT_MESSAGES_FOR_CONTEXT)) {
    // Skip if same role as previous (to ensure alternation)
    if (m.role === lastRole) continue;
    // Skip the current user message if it's in recent messages (we'll add it at the end)
    if (m.role === "user" && m.content === userMessage) continue;
    filteredMessages.push({
      role: m.role as "user" | "assistant",
      content: m.content,
    });
    lastRole = m.role;
  }
  
  // Ensure we start with a user message after system (remove leading assistant messages)
  while (filteredMessages.length > 0 && filteredMessages[0].role === "assistant") {
    filteredMessages.shift();
  }
  
  // Ensure the last message before new user message is from assistant (not user)
  // If last is user, remove it to avoid user-user sequence
  while (filteredMessages.length > 0 && filteredMessages[filteredMessages.length - 1].role === "user") {
    filteredMessages.pop();
  }

  const systemPrompt = buildSystemPrompt(context);

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...filteredMessages,
    { role: "user", content: userMessage },
  ];

  try {
    const response = await fetch(AI_CONFIG.PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.DEFAULT_MODEL,
        messages,
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorBody}`);
    }

    const data: PerplexityResponse = await response.json();
    const content = data.choices[0]?.message?.content || "";

    // Parse the JSON response
    try {
      // Handle potential markdown code blocks in response
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }
      
      const parsed = JSON.parse(jsonContent);
      
      // Normalize todos to ensure action field exists
      const normalizedTodos = (parsed.todos || []).map((todo: ExtractedTodo) => ({
        ...todo,
        action: todo.action || "create", // default to create for backwards compatibility
      }));
      
      return {
        todos: normalizedTodos,
        habits: parsed.habits || [],
        landmarks: parsed.landmarks || [],
        conversationalResponse:
          parsed.response || "I understood your message!",
      };
    } catch {
      // If parsing fails, treat the whole response as conversational
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
      conversationalResponse:
        "I had trouble processing that. Could you try again?",
    };
  }
}

// Helper to format date to local YYYY-MM-DD without timezone shift
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to check if two dates are the same day (local)
function isSameLocalDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Calculate days between two dates using local time
function daysBetweenLocal(from: Date, to: Date): number {
  const fromLocal = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toLocal = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toLocal.getTime() - fromLocal.getTime()) / (24 * 60 * 60 * 1000));
}

// Helper to build AI context from database data
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

  // Pending todos - use local date formatting
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

  // Today's habits with streak calculation
  const todayHabits = habits.map((h) => {
    const todayRecord = h.records.find((r) => 
      isSameLocalDay(new Date(r.date), today)
    );

    // Calculate streak
    let streak = 0;
    const sortedDates = h.records
      .filter((r) => r.completed)
      .map((r) => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .sort((a, b) => b - a);

    const checkDate = new Date(today);
    if (!todayRecord?.completed) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    checkDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < MAX_STREAK_DAYS; i++) {
      if (sortedDates.includes(checkDate.getTime())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      name: h.name,
      completedToday: !!todayRecord?.completed,
      streak,
    };
  });

  // Upcoming deadlines - use local date comparison
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

  // Get timezone
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

