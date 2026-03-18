// Morning Briefing Job
// Fetches today's briefing from the Next.js API and sends it via Telegram.

import { sendHtml } from "../../lib/telegram/bot";

export async function morningBriefingJob(
  appUrl: string,
  apiToken: string,
  botToken: string,
  chatId: string
): Promise<void> {
  try {
    const res = await fetch(`${appUrl}/api/briefing`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!res.ok) {
      console.error(`[morningBriefing] API returned ${res.status}`);
      return;
    }

    const data = await res.json();

    // Build the briefing message
    const lines: string[] = [];
    lines.push(`🌅 <b>Good morning!</b>`);

    if (data.weather) {
      lines.push(`\n☁️ <b>Weather:</b> ${data.weather.description}, ${data.weather.temperature}°C${data.weather.location ? ` in ${data.weather.location}` : ""}`);
    }

    if (data.todaysTodos?.length > 0) {
      lines.push(`\n📋 <b>Today's tasks (${data.todaysTodos.length}):</b>`);
      data.todaysTodos.slice(0, 5).forEach((t: { title: string }) => {
        lines.push(`• ${t.title}`);
      });
      if (data.todaysTodos.length > 5) lines.push(`  …and ${data.todaysTodos.length - 5} more`);
    }

    if (data.upcomingDeadlines?.length > 0) {
      lines.push(`\n⏰ <b>Upcoming deadlines:</b>`);
      data.upcomingDeadlines.slice(0, 3).forEach((d: { todo: { title: string }; daysLeft: number }) => {
        const when = d.daysLeft === 0 ? "today" : d.daysLeft === 1 ? "tomorrow" : `in ${d.daysLeft} days`;
        lines.push(`• ${d.todo.title} — <i>${when}</i>`);
      });
    }

    if (data.habits?.length > 0) {
      const pending = data.habits.filter((h: { completedToday: boolean }) => !h.completedToday);
      if (pending.length > 0) {
        lines.push(`\n🔥 <b>Habits to do today:</b>`);
        pending.slice(0, 4).forEach((h: { name: string; streak: number }) => {
          const streak = h.streak > 0 ? ` (${h.streak}🔥)` : "";
          lines.push(`• ${h.name}${streak}`);
        });
      }
    }

    lines.push(`\nHave a great day! 🌟`);

    await sendHtml({ botToken, chatId }, lines.join("\n"));
    console.log("[morningBriefing] Sent successfully");
  } catch (err) {
    console.error("[morningBriefing] Failed:", err);
  }
}
