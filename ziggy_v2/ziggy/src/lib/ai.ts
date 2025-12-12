// AI Service for Perplexity API integration

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

// Extracted data structures
export interface ExtractedTodo {
  title: string;
  description?: string;
  priority: number;
  dueDate?: string;
}

export interface ExtractedHabit {
  name: string;
  frequency: string;
}

export interface ExtractedLandmark {
  title: string;
  date: string;
  notes?: string;
}

export interface AIExtractions {
  todos: ExtractedTodo[];
  habits: ExtractedHabit[];
  landmarks: ExtractedLandmark[];
  conversationalResponse: string;
}

const SYSTEM_PROMPT = `You are Ziggy, a warm and friendly personal AI assistant. You help users organize their lives by understanding their messages and extracting actionable items.

When users chat with you:
1. Respond conversationally in a helpful, encouraging tone
2. Extract any tasks, habits, or life landmarks mentioned
3. Be concise but friendly

Always respond with valid JSON in this exact format:
{
  "response": "Your conversational response to the user",
  "todos": [
    {
      "title": "Task title",
      "description": "Optional description",
      "priority": 2,
      "dueDate": "2025-12-15"
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

Rules:
- Extract actionable tasks (things to do, calls to make, items to buy)
- Identify habits the user wants to track (exercise, meditation, reading)
- Recognize life landmarks (birthdays, anniversaries, achievements)
- Set priority: 1=urgent/important, 2=normal, 3=low
- Extract due dates from phrases like "by Friday", "tomorrow", "next week"
- If no clear items found, return empty arrays
- Keep your response warm and personable`;

export async function processMessage(
  userMessage: string,
  recentMessages: { role: string; content: string }[]
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
  
  for (const m of recentMessages.slice(-10)) {
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

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...filteredMessages,
    { role: "user", content: userMessage },
  ];

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages,
        max_tokens: 1000,
        temperature: 0.3,
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
      const parsed = JSON.parse(content);
      return {
        todos: parsed.todos || [],
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
