// Weekly Review Job
// Calls the weekly-review API which generates an AI report of the past week
// and sends it via Telegram.

import { sendHtml } from "../../lib/telegram/bot";

export async function weeklyReviewJob(
  appUrl: string,
  apiToken: string,
  botToken: string,
  chatId: string
): Promise<void> {
  try {
    const res = await fetch(`${appUrl}/api/worker/weekly-review`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!res.ok) {
      console.error(`[weeklyReview] API returned ${res.status}`);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    const report: string = data.report ?? "No weekly review available.";

    await sendHtml({ botToken, chatId }, `📊 <b>Weekly Review</b>\n\n${report}`);
    console.log("[weeklyReview] Sent successfully");
  } catch (err) {
    console.error("[weeklyReview] Failed:", err);
  }
}
