// Short-Term Context Service
// Summarizes each day's conversation into a compact narrative stored in ShortTermContext.
// These summaries are injected into the AI system prompt as "RECENT WEEK" context,
// giving Ziggy continuity across sessions without exploding token count.

import prisma from "@/lib/db";
import { chat } from "@/lib/ai/registry";
import type { ChatMessage } from "@/lib/ai/types";

const SUMMARY_PROMPT = `You are a summarization assistant. Given a day's conversation between a user and their AI assistant Ziggy, write a concise 2-4 sentence summary of what happened that day.

Focus on:
- Key topics discussed
- Tasks created, completed, or mentioned
- Any personal context shared (mood, events, decisions)
- Follow-ups or plans mentioned

Write in third person about the user (e.g. "User discussed...", "They completed...").
Keep it under 150 words. Plain text only, no markdown.`;

/** Generate and store a summary for the given date. Idempotent — upserts. */
export async function summarizeDay(date: Date): Promise<string | null> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const messages = await prisma.message.findMany({
    where: { date: { gte: dayStart, lt: dayEnd } },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length < 2) return null; // not enough to summarize

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Ziggy"}: ${m.content}`)
    .join("\n");

  const aiMessages: ChatMessage[] = [
    { role: "system", content: SUMMARY_PROMPT },
    { role: "user", content: transcript },
  ];

  try {
    const result = await chat(aiMessages, { maxTokens: 200, temperature: 0.2 });
    const summary = result.content.trim();

    await prisma.shortTermContext.upsert({
      where: { date: dayStart },
      create: { date: dayStart, summary },
      update: { summary },
    });

    // Prune entries older than 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    await prisma.shortTermContext.deleteMany({ where: { date: { lt: cutoff } } });

    return summary;
  } catch (err) {
    console.error("[shortTermContext] summarizeDay failed:", err);
    return null;
  }
}

/** Build the RECENT WEEK context string for injection into the AI prompt. */
export async function buildShortTermContext(): Promise<string> {
  const entries = await prisma.shortTermContext.findMany({
    orderBy: { date: "desc" },
    take: 7,
  });

  if (entries.length === 0) return "";

  const lines = entries
    .reverse()
    .map((e) => {
      const label = e.date.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
      return `${label}: ${e.summary}`;
    });

  return `\nRECENT WEEK (what we discussed):\n${lines.join("\n")}\n`;
}
