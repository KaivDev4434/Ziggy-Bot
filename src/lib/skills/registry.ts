// ─── Skill Registry ───────────────────────────────────────────────────────────
//
// Singleton registry that aggregates all registered skills.
// The chat route calls:
//   1. registry.buildAdditionalContext()  → appends to AI system prompt
//   2. registry.processAllExtractions()  → dispatches AI output to each skill

import type { SkillDefinition, ProcessingContext } from "./types";

class SkillRegistry {
  private skills: SkillDefinition[] = [];

  register(skill: SkillDefinition): void {
    this.skills.push(skill);
  }

  getSkills(): ReadonlyArray<SkillDefinition> {
    return this.skills;
  }

  /**
   * Collects context sections from all skills and returns them joined.
   * Output is appended to the AI system prompt on every chat request.
   * Errors in individual skills are caught so one bad skill can't break chat.
   */
  async buildAdditionalContext(): Promise<string> {
    if (this.skills.length === 0) return "";

    const results = await Promise.allSettled(
      this.skills.map((s) => s.buildSystemSection())
    );

    return results
      .map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        console.error(`[skill:${this.skills[i].name}] buildSystemSection failed:`, r.reason);
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  /**
   * Dispatches AI extraction results to all registered skills.
   * Errors per-skill are logged but never propagate to the caller.
   *
   * @param aiData  The full parsed AI JSON response object
   * @param ctx     Processing context (message date)
   */
  async processAllExtractions(
    aiData: Record<string, unknown>,
    ctx: ProcessingContext
  ): Promise<void> {
    if (this.skills.length === 0) return;

    await Promise.allSettled(
      this.skills.map((s) =>
        s.processExtractions(aiData[s.name], ctx).catch((err) =>
          console.error(`[skill:${s.name}] processExtractions failed:`, err)
        )
      )
    );
  }
}

// Singleton instance
export const skillRegistry = new SkillRegistry();

// ─── Phase 2 Skills ───────────────────────────────────────────────────────────
import { moodSkill }    from "./plugins/mood";
import { financeSkill } from "./plugins/finance";
import { peopleSkill }  from "./plugins/people";
import { mediaSkill }   from "./plugins/media";

skillRegistry.register(moodSkill);
skillRegistry.register(financeSkill);
skillRegistry.register(peopleSkill);
skillRegistry.register(mediaSkill);
