import type { SkillDefinition, ProcessingContext, SkillExtractionResult } from "../../types";
import prisma from "@/lib/db";

interface ExtractedMoodEntry {
  energy?: number | null;
  mood?: number | null;
  notes?: string;
  tags?: string[];
}

function clamp(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}

export const moodSkill: SkillDefinition = {
  name: "moodEntry",
  displayName: "Mood & Energy Journal",

  async buildSystemSection(): Promise<string> {
    const recent = await prisma.moodEntry.findMany({
      orderBy: { date: "desc" },
      take: 5,
    });

    const contextStr =
      recent.length > 0
        ? recent
            .map((e) => {
              const parts: string[] = [];
              if (e.energy != null) parts.push(`energy ${e.energy}/10`);
              if (e.mood != null) parts.push(`mood ${e.mood}/10`);
              if (e.notes) parts.push(e.notes);
              return `${new Date(e.date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}: ${parts.join(", ")}`;
            })
            .join(" · ")
        : "No recent entries";

    return `
MOOD & ENERGY JOURNAL:
Recent: ${contextStr}

If the user mentions how they're feeling, their energy level, mood, stress, or emotional state, add a "moodEntry" field to your JSON response (alongside the existing "response", "todos", "habits", "landmarks" fields):
"moodEntry": {
  "energy": <integer 1-10 or null>,
  "mood": <integer 1-10 or null>,
  "notes": "brief context (optional)",
  "tags": ["optional", "string", "tags"]
}
Only add "moodEntry" when the user explicitly mentions feelings or energy. Omit the field entirely if not mentioned.`;
  },

  async processExtractions(
    data: unknown,
    ctx: ProcessingContext
  ): Promise<SkillExtractionResult> {
    if (!data || typeof data !== "object") return { processed: 0 };

    const entry = data as ExtractedMoodEntry;
    const hasData = entry.energy != null || entry.mood != null || entry.notes;
    if (!hasData) return { processed: 0 };

    await prisma.moodEntry.create({
      data: {
        energy: entry.energy != null ? clamp(entry.energy) : null,
        mood: entry.mood != null ? clamp(entry.mood) : null,
        notes: entry.notes ?? null,
        tags: entry.tags ? JSON.stringify(entry.tags) : null,
        date: ctx.messageDate,
      },
    });

    return { processed: 1 };
  },
};
