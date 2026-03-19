// Deadline Alert Job
// Checks for todos due in the next 24 hours and sends a Telegram alert.

import { sendHtml } from "../../lib/telegram/bot";

interface Todo {
  id: string;
  title: string;
  dueDate: string;
  priority: number | null;
}

export async function deadlineAlertJob(
  appUrl: string,
  apiToken: string,
  botToken: string,
  chatId: string
): Promise<void> {
  try {
    const res = await fetch(`${appUrl}/api/todos`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!res.ok) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    const todos: Todo[] = data.todos ?? [];

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueSoon = todos.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= in24h;
    });

    const overdue = todos.filter((t) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });

    if (dueSoon.length === 0 && overdue.length === 0) return;

    const lines: string[] = [`⏰ <b>Deadline reminder</b>`];

    if (overdue.length > 0) {
      lines.push(`\n🔴 <b>Overdue (${overdue.length}):</b>`);
      overdue.slice(0, 5).forEach((t) => lines.push(`• ${t.title}`));
    }

    if (dueSoon.length > 0) {
      lines.push(`\n🟡 <b>Due in the next 24h (${dueSoon.length}):</b>`);
      dueSoon.slice(0, 5).forEach((t) => lines.push(`• ${t.title}`));
    }

    await sendHtml({ botToken, chatId }, lines.join("\n"));
    console.log(`[deadlineAlert] Sent: ${overdue.length} overdue, ${dueSoon.length} due soon`);
  } catch (err) {
    console.error("[deadlineAlert] Failed:", err);
  }
}
