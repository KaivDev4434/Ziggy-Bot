import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { loadConfig } from "@/lib/configLoader";
import { setWebhook, deleteWebhook, getWebhookInfo } from "@/lib/telegram/bot";
import prisma from "@/lib/db";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;
  await loadConfig();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ configured: false });

  const info = await getWebhookInfo(botToken);
  return NextResponse.json({ configured: true, webhook: info });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;
  await loadConfig();

  const { appUrl } = await request.json().catch(() => ({}));

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Telegram bot token not configured" }, { status: 400 });
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  // Generate a webhook secret and persist it
  const webhookSecret = crypto.randomBytes(32).toString("hex");
  await prisma.appConfig.upsert({
    where: { key: "telegram_webhook_secret" },
    create: { key: "telegram_webhook_secret", value: webhookSecret },
    update: { value: webhookSecret },
  });
  process.env.TELEGRAM_WEBHOOK_SECRET = webhookSecret;

  await setWebhook(botToken, webhookUrl, webhookSecret);

  return NextResponse.json({ ok: true, webhookUrl });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;
  await loadConfig();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ ok: true });

  await deleteWebhook(botToken);
  return NextResponse.json({ ok: true });
}
