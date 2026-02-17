// Memory Service
// Manages persistent key facts about the user that Ziggy remembers across conversations.

import prisma from "@/lib/db";
import { chat } from "@/lib/ai/registry";
import type { ChatMessage } from "@/lib/ai/types";

export interface Memory {
  id: string;
  fact: string;
  category: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

export type MemoryCategory =
  | "preference"
  | "goal"
  | "personal"
  | "work"
  | "relationship"
  | "health";

// --- Database Operations ---

export async function getActiveMemories(category?: string): Promise<Memory[]> {
  return prisma.memory.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveMemory(
  fact: string,
  category: MemoryCategory,
  source: string = "conversation"
): Promise<Memory> {
  // Check for duplicate/similar facts before saving
  const existing = await prisma.memory.findFirst({
    where: {
      fact: { equals: fact },
      active: true,
    },
  });

  if (existing) {
    // Update the timestamp to keep it fresh
    return prisma.memory.update({
      where: { id: existing.id },
      data: { updatedAt: new Date() },
    });
  }

  return prisma.memory.create({
    data: { fact, category, source },
  });
}

export async function deactivateMemory(id: string): Promise<Memory> {
  return prisma.memory.update({
    where: { id },
    data: { active: false },
  });
}

export async function updateMemory(
  id: string,
  fact: string,
  category?: MemoryCategory
): Promise<Memory> {
  return prisma.memory.update({
    where: { id },
    data: {
      fact,
      ...(category ? { category } : {}),
    },
  });
}

// --- Memory Extraction ---

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a conversation between a user and an AI assistant, extract any key facts worth remembering about the user.

Extract facts in these categories:
- "preference": Things the user likes, dislikes, or prefers (e.g., "prefers tea over coffee", "likes working in the morning")
- "goal": Goals, aspirations, or plans (e.g., "training for a marathon", "learning Spanish")
- "personal": Personal details (e.g., "sister's name is Maya", "lives in Bangalore")
- "work": Work-related facts (e.g., "works as a software engineer", "current project is a chatbot")
- "relationship": Info about people in their life (e.g., "best friend is Arjun", "mother's birthday is March 15")
- "health": Health-related facts (e.g., "allergic to peanuts", "trying to sleep earlier")

Rules:
- Only extract FACTS that would be useful to remember in future conversations
- Do NOT extract transient things (e.g., "user is hungry right now")
- Do NOT extract tasks or todos (those are handled separately)
- If there are no memorable facts, return an empty array
- Each fact should be a concise, standalone statement

Respond with a JSON array:
[
  { "fact": "User prefers morning workouts", "category": "preference" },
  { "fact": "Sister's birthday is March 15", "category": "relationship" }
]

If no facts to extract, respond with: []`;

/**
 * Extract memorable facts from a conversation turn.
 * Called after each AI response to capture any new information about the user.
 */
export async function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string
): Promise<{ fact: string; category: MemoryCategory }[]> {
  try {
    const messages: ChatMessage[] = [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: `User said: "${userMessage}"\nAssistant replied: "${assistantResponse}"`,
      },
    ];

    const result = await chat(messages, {
      maxTokens: 500,
      temperature: 0.1,
    });

    // Parse the JSON response
    let jsonContent = result.content.trim();
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const extracted = JSON.parse(jsonContent);

    if (!Array.isArray(extracted)) return [];

    return extracted.filter(
      (item: { fact?: string; category?: string }) =>
        item.fact && item.category
    );
  } catch (error) {
    // Memory extraction is non-critical -- don't break the chat flow
    console.error("Failed to extract memories:", error);
    return [];
  }
}

/**
 * Extract and save memories from a conversation turn.
 * This is the main entry point called after each chat exchange.
 */
export async function processAndSaveMemories(
  userMessage: string,
  assistantResponse: string
): Promise<number> {
  const extracted = await extractMemoriesFromConversation(
    userMessage,
    assistantResponse
  );

  let saved = 0;
  for (const item of extracted) {
    try {
      await saveMemory(item.fact, item.category);
      saved++;
    } catch (error) {
      console.error("Failed to save memory:", error);
    }
  }

  return saved;
}

// --- Context Building ---

/**
 * Build a memory context string to inject into the AI system prompt.
 * Returns a formatted section describing what Ziggy remembers about the user.
 */
export async function buildMemoryContext(): Promise<string> {
  const memories = await getActiveMemories();

  if (memories.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m.fact);
  }

  const sections: string[] = ["\nTHINGS I REMEMBER ABOUT YOU:"];
  
  const categoryLabels: Record<string, string> = {
    preference: "Preferences",
    goal: "Goals",
    personal: "Personal",
    work: "Work",
    relationship: "People",
    health: "Health",
  };

  for (const [category, facts] of Object.entries(grouped)) {
    const label = categoryLabels[category] || category;
    sections.push(`\n${label}:`);
    for (const fact of facts) {
      sections.push(`- ${fact}`);
    }
  }

  return sections.join("\n");
}
