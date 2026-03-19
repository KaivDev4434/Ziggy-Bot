// Telegram Bot Helpers
// Thin wrapper around the Telegram Bot API for sending messages.
// Does NOT use grammy here — grammy is used only in the worker for the
// long-running bot instance. These helpers are safe to call from Next.js routes.

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

async function telegramPost(botToken: string, method: string, body: object): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Send a plain-text message to the configured chat. */
export async function sendMessage(config: TelegramConfig, text: string): Promise<void> {
  const res = await telegramPost(config.botToken, "sendMessage", {
    chat_id: config.chatId,
    text,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed: ${err}`);
  }
}

/** Send a Markdown-formatted message (Telegram MarkdownV2). */
export async function sendMarkdown(config: TelegramConfig, text: string): Promise<void> {
  // Escape special chars for MarkdownV2
  const escaped = text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
  const res = await telegramPost(config.botToken, "sendMessage", {
    chat_id: config.chatId,
    text: escaped,
    parse_mode: "MarkdownV2",
  });
  if (!res.ok) {
    // Fallback to plain text if markdown fails
    await sendMessage(config, text);
  }
}

/** Send a message with HTML formatting. */
export async function sendHtml(config: TelegramConfig, html: string): Promise<void> {
  const res = await telegramPost(config.botToken, "sendMessage", {
    chat_id: config.chatId,
    text: html,
    parse_mode: "HTML",
  });
  if (!res.ok) {
    const plain = html.replace(/<[^>]+>/g, "");
    await sendMessage(config, plain);
  }
}

/** Register a webhook URL with Telegram. */
export async function setWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<void> {
  const res = await telegramPost(botToken, "setWebhook", {
    url: webhookUrl,
    ...(secretToken ? { secret_token: secretToken } : {}),
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`setWebhook failed: ${err}`);
  }
}

/** Remove the webhook (switch back to polling). */
export async function deleteWebhook(botToken: string): Promise<void> {
  await telegramPost(botToken, "deleteWebhook", { drop_pending_updates: true });
}

/** Get info about the currently set webhook. */
export async function getWebhookInfo(botToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  return res.json() as Promise<Record<string, unknown>>;
}

/** Load Telegram config from process.env (populated by configLoader). */
export function getTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return null;
  return { botToken, chatId };
}
