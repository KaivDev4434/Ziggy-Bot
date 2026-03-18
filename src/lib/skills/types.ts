// ─── Skill Plugin System ──────────────────────────────────────────────────────
//
// A skill is a self-contained module that extends Ziggy's AI capabilities.
//
// To add a new skill:
//   1. Create src/lib/skills/plugins/<name>/index.ts implementing SkillDefinition
//   2. Add the Prisma model and run: npx prisma migrate dev
//   3. Import and register() in src/lib/skills/registry.ts
//   4. Done — the skill auto-contributes to the AI prompt and handles extractions

export interface ProcessingContext {
  messageDate: Date;
}

export interface SkillExtractionResult {
  /** Number of items created/updated by this skill in the current message */
  processed: number;
}

export interface SkillDefinition {
  /**
   * Unique key. Also used as the JSON field name in AI responses.
   * Example: "transactions" → the AI returns `{ "transactions": [...] }`
   */
  name: string;

  /** Human-readable name for UI display */
  displayName: string;

  /**
   * Returns a markdown section appended to the AI system prompt.
   * Should include:
   *   - Relevant current data from the DB (context for the AI)
   *   - Extraction instructions (what to look for in user messages)
   *   - JSON output schema for this skill's extracted data
   *
   * Keep this focused — it directly affects token count per message.
   * Return an empty string if the skill has nothing relevant to add.
   */
  buildSystemSection(): Promise<string>;

  /**
   * Processes the extracted data from the AI response.
   * Called after every chat message — even when data is empty/null.
   * Must be idempotent and handle null/undefined gracefully.
   *
   * @param data  The value of aiResult[this.name] from the parsed AI JSON
   * @param ctx   Processing context (message date, etc.)
   */
  processExtractions(
    data: unknown,
    ctx: ProcessingContext
  ): Promise<SkillExtractionResult>;
}
