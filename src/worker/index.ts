// Ziggy Worker — Cron Scheduler + Telegram Bot
// Runs as a separate Node.js process alongside the Next.js app.
// Communicates with the app only via HTTP (bearer token auth).
// Never accesses the SQLite DB directly.

import cron from "node-cron";
import { morningBriefingJob } from "./jobs/morningBriefing";
import { deadlineAlertJob } from "./jobs/deadlineAlert";
import { habitNudgeJob } from "./jobs/habitNudge";
import { nightlySummaryJob } from "./jobs/nightlySummary";
import { weeklyReviewJob } from "./jobs/weeklyReview";

// ── Config ────────────────────────────────────────────────────────────────────

const APP_URL = process.env.ZIGGY_APP_URL ?? "http://localhost:3000";
const API_TOKEN = process.env.SCHEDULER_API_TOKEN ?? "";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const TIMEZONE = process.env.TZ ?? "Asia/Kolkata";

if (!API_TOKEN) {
  console.error("[worker] SCHEDULER_API_TOKEN is not set — worker will not start");
  process.exit(1);
}

console.log(`[worker] Starting Ziggy Worker`);
console.log(`[worker] App URL: ${APP_URL}`);
console.log(`[worker] Timezone: ${TIMEZONE}`);
console.log(`[worker] Telegram configured: ${!!(BOT_TOKEN && CHAT_ID)}`);

// ── Cron Jobs ─────────────────────────────────────────────────────────────────

// Morning briefing: 8:00am daily
cron.schedule("0 8 * * *", async () => {
  console.log("[worker] Running morning briefing...");
  if (BOT_TOKEN && CHAT_ID) {
    await morningBriefingJob(APP_URL, API_TOKEN, BOT_TOKEN, CHAT_ID);
  }
}, { timezone: TIMEZONE });

// Deadline alert: 9:00am daily
cron.schedule("0 9 * * *", async () => {
  console.log("[worker] Running deadline alert...");
  if (BOT_TOKEN && CHAT_ID) {
    await deadlineAlertJob(APP_URL, API_TOKEN, BOT_TOKEN, CHAT_ID);
  }
}, { timezone: TIMEZONE });

// Habit nudge: 8:00pm daily
cron.schedule("0 20 * * *", async () => {
  console.log("[worker] Running habit nudge...");
  if (BOT_TOKEN && CHAT_ID) {
    await habitNudgeJob(APP_URL, API_TOKEN, BOT_TOKEN, CHAT_ID);
  }
}, { timezone: TIMEZONE });

// Nightly summary: 11:55pm daily
cron.schedule("55 23 * * *", async () => {
  console.log("[worker] Running nightly summary...");
  await nightlySummaryJob(APP_URL, API_TOKEN);
}, { timezone: TIMEZONE });

// Weekly review: Sunday 10:00am
cron.schedule("0 10 * * 0", async () => {
  console.log("[worker] Running weekly review...");
  if (BOT_TOKEN && CHAT_ID) {
    await weeklyReviewJob(APP_URL, API_TOKEN, BOT_TOKEN, CHAT_ID);
  }
}, { timezone: TIMEZONE });

console.log("[worker] All cron jobs scheduled:");
console.log("  08:00 daily  — morning briefing");
console.log("  09:00 daily  — deadline alert");
console.log("  20:00 daily  — habit nudge");
console.log("  23:55 daily  — nightly summary");
console.log("  10:00 Sunday — weekly review");
console.log("[worker] Worker is running. Press Ctrl+C to stop.");

// Keep the process alive
process.on("SIGTERM", () => {
  console.log("[worker] SIGTERM received, shutting down gracefully");
  process.exit(0);
});
