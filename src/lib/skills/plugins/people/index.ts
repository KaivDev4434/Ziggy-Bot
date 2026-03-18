import type { SkillDefinition, ProcessingContext, SkillExtractionResult } from "../../types";
import prisma from "@/lib/db";

interface ExtractedPersonEntry {
  name: string;
  summary: string;
  followUp?: string;
  followUpDate?: string; // YYYY-MM-DD
  relationship?: string;
}

/** Case-insensitive name match against known persons */
async function findOrCreatePerson(name: string, relationship?: string): Promise<string> {
  // SQLite doesn't support mode: 'insensitive', so fetch all and filter in memory
  const all = await prisma.person.findMany({ select: { id: true, name: true } });
  const existing = all.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  const created = await prisma.person.create({
    data: { name, relationship: relationship ?? null },
  });
  return created.id;
}

export const peopleSkill: SkillDefinition = {
  name: "people",
  displayName: "People & Relationships",

  async buildSystemSection(): Promise<string> {
    const people = await prisma.person.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const pendingFollowUps = await prisma.interaction.findMany({
      where: { followUp: { not: null }, dueDate: { gte: new Date() } },
      include: { person: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    const knownNames = people.length > 0
      ? people.map((p) => `${p.name}${p.relationship ? ` (${p.relationship})` : ""}`).join(", ")
      : "None yet";

    const followUpStr = pendingFollowUps.length > 0
      ? pendingFollowUps
          .map((i) => `${i.person.name}: "${i.followUp}" by ${i.dueDate ? new Date(i.dueDate).toLocaleDateString("en-IN") : "soon"}`)
          .join("; ")
      : "None";

    return `
PEOPLE & RELATIONSHIPS:
Known people: ${knownNames}
Pending follow-ups: ${followUpStr}

If the user mentions an interaction with a specific person (calling, meeting, texting, etc.) or wants to remember to follow up with someone, add a "people" field to your JSON response:
"people": [
  {
    "name": "Person's name",
    "summary": "What happened or what was discussed",
    "followUp": "optional follow-up task description",
    "followUpDate": "YYYY-MM-DD (optional)",
    "relationship": "friend|family|colleague|other (only for new people)"
  }
]
Only add "people" when a real person is explicitly mentioned with context. Omit if not mentioned.`;
  },

  async processExtractions(
    data: unknown,
    ctx: ProcessingContext
  ): Promise<SkillExtractionResult> {
    if (!Array.isArray(data) || data.length === 0) return { processed: 0 };

    const entries = (data as unknown[]).filter(
      (e): e is ExtractedPersonEntry =>
        typeof e === "object" && e !== null && typeof (e as ExtractedPersonEntry).name === "string"
    );

    if (entries.length === 0) return { processed: 0 };

    let count = 0;
    for (const entry of entries) {
      const personId = await findOrCreatePerson(entry.name, entry.relationship);

      const dueDate = entry.followUpDate ? new Date(entry.followUpDate) : null;

      await prisma.interaction.create({
        data: {
          personId,
          summary: entry.summary,
          followUp: entry.followUp ?? null,
          dueDate,
          date: ctx.messageDate,
        },
      });

      // If there's a follow-up, also create a Todo for it
      if (entry.followUp) {
        await prisma.todo.create({
          data: {
            title: `Follow up with ${entry.name}: ${entry.followUp}`,
            category: "personal",
            dueDate,
          },
        });
      }

      count++;
    }

    return { processed: count };
  },
};
