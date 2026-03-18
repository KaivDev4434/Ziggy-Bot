import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/configLoader";
import { sendMessage, sendHtml } from "@/lib/telegram/bot";
import { processMessage, buildAIContext } from "@/lib/ai";
import { skillRegistry } from "@/lib/skills/registry";
import { buildMemoryContext, processAndSaveMemories } from "@/lib/services/memoryService";
import { buildCalendarContext } from "@/lib/services/calendarService";
import { getRecentNotesContext } from "@/lib/services/obsidianService";
import { cleanCitations } from "@/lib/utils";
import { processTodoAction } from "@/lib/services/todoService";
import prisma from "@/lib/db";
import { RECENT_MESSAGES_FOR_CONTEXT, HABIT_RECORDS_LOOKBACK } from "@/lib/constants";

interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name?: string };
  chat: { id: number };
  text?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export async function POST(request: NextRequest) {
  await loadConfig();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const allowedChatId = process.env.TELEGRAM_CHAT_ID;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!botToken) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 503 });
  }

  // Verify webhook secret header
  if (webhookSecret) {
    const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (headerSecret !== webhookSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const msg = update.message;
  if (!msg?.text) {
    return NextResponse.json({ ok: true }); // ignore non-text updates
  }

  const chatId = String(msg.chat.id);

  // Chat ID whitelist — only the registered owner chat can use the bot
  if (allowedChatId && chatId !== allowedChatId) {
    await sendMessage(
      { botToken, chatId },
      "Sorry, this bot is private. You are not authorized to use it."
    );
    return NextResponse.json({ ok: true });
  }

  const userText = msg.text;

  // Handle /start and /help commands
  if (userText === "/start" || userText === "/help") {
    await sendMessage(
      { botToken, chatId },
      "👋 Hi! I'm Ziggy, your personal AI assistant.\n\nJust chat with me normally — I'll track your tasks, habits, mood, finances, and more.\n\nType anything to get started!"
    );

    // Save the chat ID if not already saved (first-time user)
    if (!allowedChatId) {
      await prisma.appConfig.upsert({
        where: { key: "telegram_chat_id" },
        create: { key: "telegram_chat_id", value: chatId },
        update: { value: chatId },
      });
      process.env.TELEGRAM_CHAT_ID = chatId;
    }

    return NextResponse.json({ ok: true });
  }

  // Process the message through the full AI pipeline
  try {
    const messageDate = new Date();
    messageDate.setHours(0, 0, 0, 0);

    // Save user message
    await prisma.message.create({
      data: { role: "user", content: userText, date: messageDate },
    });

    // Fetch context
    const dayEnd = new Date(messageDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [recentMessages, allTodos, allHabits, memoryContext, calendarContext, notesContext, skillContext] =
      await Promise.all([
        prisma.message.findMany({
          where: { date: { gte: messageDate, lt: dayEnd } },
          orderBy: { createdAt: "desc" },
          take: RECENT_MESSAGES_FOR_CONTEXT,
        }),
        prisma.todo.findMany({
          select: { id: true, title: true, category: true, priority: true, dueDate: true, doDate: true, status: true },
        }),
        prisma.habit.findMany({
          where: { active: true },
          include: { records: { orderBy: { date: "desc" }, take: HABIT_RECORDS_LOOKBACK } },
        }),
        buildMemoryContext(),
        buildCalendarContext(),
        getRecentNotesContext(),
        skillRegistry.buildAdditionalContext(),
      ]);

    const aiContext = buildAIContext(
      allTodos,
      allHabits.map((h) => ({ name: h.name, records: h.records.map((r) => ({ date: r.date, completed: r.completed })) }))
    );

    const aiResult = await processMessage(
      userText,
      recentMessages.reverse().map((m) => ({ role: m.role, content: m.content })),
      aiContext,
      memoryContext + calendarContext + notesContext + skillContext
    );

    // Process todos
    for (const todo of aiResult.todos) {
      await processTodoAction(todo, allTodos).catch(() => {});
    }

    // Save extracted habits
    for (const habit of aiResult.habits) {
      const exists = await prisma.habit.findFirst({ where: { name: habit.name, active: true } });
      if (!exists) {
        await prisma.habit.create({ data: { name: habit.name, frequency: habit.frequency } });
      }
    }

    // Dispatch skill extractions
    skillRegistry.processAllExtractions(aiResult.skillData, { messageDate }).catch(() => {});

    const cleanedResponse = cleanCitations(aiResult.conversationalResponse);

    // Save assistant message
    await prisma.message.create({
      data: { role: "assistant", content: cleanedResponse, date: messageDate },
    });

    // Background memory extraction
    processAndSaveMemories(userText, cleanedResponse).catch(() => {});

    // Send response back via Telegram
    await sendHtml({ botToken, chatId }, cleanedResponse);
  } catch (err) {
    console.error("Telegram webhook processing error:", err);
    await sendMessage({ botToken, chatId }, "Sorry, I ran into an error. Please try again.");
  }

  return NextResponse.json({ ok: true });
}
