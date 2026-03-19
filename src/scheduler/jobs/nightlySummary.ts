// Nightly Summary Job
// Calls the nightly-summary API endpoint which summarizes today's messages
// into a ShortTermContext row, giving Ziggy rolling 7-day memory.

export async function nightlySummaryJob(
  appUrl: string,
  apiToken: string
): Promise<void> {
  try {
    const res = await fetch(`${appUrl}/api/worker/nightly-summary`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!res.ok) {
      console.error(`[nightlySummary] API returned ${res.status}: ${await res.text()}`);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    if (data.summary) {
      console.log(`[nightlySummary] Summarized: "${data.summary.slice(0, 80)}..."`);
    } else {
      console.log("[nightlySummary] No messages to summarize today");
    }
  } catch (err) {
    console.error("[nightlySummary] Failed:", err);
  }
}
