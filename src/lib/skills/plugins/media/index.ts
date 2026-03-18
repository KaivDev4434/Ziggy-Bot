import type { SkillDefinition, ProcessingContext, SkillExtractionResult } from "../../types";
import prisma from "@/lib/db";

interface ExtractedMediaItem {
  action: "add" | "update" | "rate";
  title: string;
  type: "book" | "movie" | "series";
  status?: "want" | "in_progress" | "done";
  rating?: number; // 1-5
  notes?: string;
  author?: string;
}

/** Case-insensitive title+type match */
async function findMediaItem(title: string, type: string): Promise<string | null> {
  // SQLite doesn't support mode: 'insensitive', filter in memory instead
  const items = await prisma.mediaItem.findMany({ where: { type }, select: { id: true, title: true } });
  const match = items.find((i) => i.title.toLowerCase().includes(title.toLowerCase()));
  return match?.id ?? null;
}

export const mediaSkill: SkillDefinition = {
  name: "media",
  displayName: "Media Tracker",

  async buildSystemSection(): Promise<string> {
    const inProgress = await prisma.mediaItem.findMany({
      where: { status: "in_progress" },
      orderBy: { updatedAt: "desc" },
      take: 8,
    });

    const wantList = await prisma.mediaItem.findMany({
      where: { status: "want" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const inProgressStr = inProgress.length > 0
      ? inProgress.map((m) => `"${m.title}" (${m.type})`).join(", ")
      : "None";

    const wantStr = wantList.length > 0
      ? wantList.map((m) => `"${m.title}" (${m.type})`).join(", ")
      : "None";

    return `
MEDIA TRACKER:
Currently reading/watching: ${inProgressStr}
Want list: ${wantStr}

If the user mentions a book, movie, or TV series (reading, watching, want to watch, finished, recommending, rating), add a "media" field to your JSON response:
"media": [
  {
    "action": "add",
    "title": "Title of the book/movie/series",
    "type": "book|movie|series",
    "status": "want|in_progress|done",
    "rating": null,
    "notes": "optional",
    "author": "author name (books only, optional)"
  }
]
action "add" = new entry, "update" = change status of existing, "rate" = add rating to finished item.
Only add "media" when a specific title is mentioned. Omit if not mentioned.`;
  },

  async processExtractions(
    data: unknown,
    _ctx: ProcessingContext  // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<SkillExtractionResult> {
    if (!Array.isArray(data) || data.length === 0) return { processed: 0 };

    const items = (data as unknown[]).filter(
      (m): m is ExtractedMediaItem =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as ExtractedMediaItem).title === "string"
    );

    if (items.length === 0) return { processed: 0 };

    let count = 0;
    for (const item of items) {
      const type = ["book", "movie", "series"].includes(item.type) ? item.type : "movie";
      const status = ["want", "in_progress", "done"].includes(item.status ?? "")
        ? item.status!
        : "want";

      if (item.action === "update" || item.action === "rate") {
        const existingId = await findMediaItem(item.title, type);
        if (existingId) {
          await prisma.mediaItem.update({
            where: { id: existingId },
            data: {
              ...(item.status ? { status } : {}),
              ...(item.rating ? { rating: Math.max(1, Math.min(5, item.rating)) } : {}),
              ...(item.notes ? { notes: item.notes } : {}),
            },
          });
          count++;
          continue;
        }
      }

      // add (or fallback for update when not found)
      const existingId = await findMediaItem(item.title, type);
      if (existingId) {
        await prisma.mediaItem.update({
          where: { id: existingId },
          data: {
            status,
            ...(item.rating ? { rating: Math.max(1, Math.min(5, item.rating)) } : {}),
            ...(item.notes ? { notes: item.notes } : {}),
          },
        });
      } else {
        await prisma.mediaItem.create({
          data: {
            title: item.title,
            type,
            status,
            rating: item.rating ? Math.max(1, Math.min(5, item.rating)) : null,
            notes: item.notes ?? null,
            author: item.author ?? null,
          },
        });
      }
      count++;
    }

    return { processed: count };
  },
};
