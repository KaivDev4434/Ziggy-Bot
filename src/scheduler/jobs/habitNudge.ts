// Habit Nudge Job
// Checks which habits haven't been completed today and sends an evening reminder.

import { sendHtml } from "../../lib/telegram/bot";

interface HabitStatus {
  name: string;
  completedToday: boolean;
  streak: number;
}

export async function habitNudgeJob(
  appUrl: string,
  apiToken: string,
  botToken: string,
  chatId: string
): Promise<void> {
  try {
    const res = await fetch(`${appUrl}/api/worker/habit-status`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!res.ok) return;

    const data = await res.json();
    const habits: HabitStatus[] = data.habits ?? [];

    const pending = habits.filter((h) => !h.completedToday);
    if (pending.length === 0) {
      // All done — send a congratulations
      await sendHtml({ botToken, chatId }, "🎉 <b>All habits done today!</b> Awesome streak going! 🔥");
      return;
    }

    const lines: string[] = [`🔔 <b>Evening habit check-in</b>\n`];
    lines.push(`You still have <b>${pending.length}</b> habit${pending.length > 1 ? "s" : ""} to do:`);
    pending.forEach((h) => {
      const streak = h.streak > 0 ? ` — ${h.streak}🔥 streak` : "";
      lines.push(`• ${h.name}${streak}`);
    });
    lines.push(`\nJust let me know when you're done! 💪`);

    await sendHtml({ botToken, chatId }, lines.join("\n"));
    console.log(`[habitNudge] Sent nudge for ${pending.length} habits`);
  } catch (err) {
    console.error("[habitNudge] Failed:", err);
  }
}
