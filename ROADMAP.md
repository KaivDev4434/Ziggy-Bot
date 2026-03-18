# Ziggy Evolution Roadmap

## Overview

Ziggy is evolving from a single Next.js web app into a headless-ready personal manager.
The backend stays as a Next.js app (it's already a clean REST API). The "headless" goal
is achieved by adding a second Docker container for proactive scheduling/notifications and
by making every client (web UI, Telegram, future mobile) authenticate via API tokens.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Clients                                          │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Web UI   │  │ Telegram Bot │  │ Future apps │ │
│  └────┬─────┘  └──────┬───────┘  └──────┬──────┘ │
└───────┼───────────────┼─────────────────┼────────┘
        │               │                 │
        │   JWT cookie  │  Bearer token   │
        ▼               ▼                 ▼
┌──────────────────────────────────────────────────┐
│  Next.js App (API + Web UI)                       │
│  ┌──────────────────────────────────────────────┐ │
│  │  src/middleware.ts  — auth gate               │ │
│  │  src/app/api/       — REST endpoints          │ │
│  │  src/lib/skills/    — skill plugin system     │ │
│  │  src/lib/services/  — business logic          │ │
│  └──────────────────────────────────────────────┘ │
│                    │                              │
│              Prisma + SQLite                      │
└──────────────────────────────────────────────────┘
        ▲
        │ HTTP calls (API token)
┌──────────────────────────────────────────────────┐
│  Worker Container (scheduler + Telegram bot)      │
│  ┌──────────────────────────────────────────────┐ │
│  │  node-cron jobs:                             │ │
│  │  • 8:00am  — morning briefing → Telegram      │ │
│  │  • 9:00am  — deadline scan → Telegram alerts  │ │
│  │  • 8:00pm  — habit nudge → Telegram           │ │
│  │  • 11:55pm — summarize day → ShortTermContext │ │
│  │  • Sun 10am — weekly review → Telegram        │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Key decision:** Next.js stays as the single backend. No separate Express server.
SQLite is single-writer; the worker only talks to the main app via HTTP, never SQLite directly.

---

## Skill Plugin System

Every new capability is a `SkillDefinition` object:

```typescript
interface SkillDefinition {
  name: string;          // JSON extraction key in AI response
  displayName: string;

  buildSystemSection(): Promise<string>;
  // → Returns markdown injected into the AI system prompt
  //   (context from DB + extraction instructions + JSON schema)

  processExtractions(data: unknown, ctx: ProcessingContext): Promise<SkillExtractionResult>;
  // → Called after every AI response to persist extracted data
}
```

**Adding a skill:**
1. Create `src/lib/skills/plugins/<name>/index.ts` implementing `SkillDefinition`
2. Add the Prisma model and run `prisma migrate dev`
3. Import and `register()` in `src/lib/skills/registry.ts`
4. That's it — the skill automatically contributes to the AI prompt and processes extractions

---

## Phase 1 — Foundation (Current)

**Goal:** Auth, onboarding, and skill registry infrastructure.
Everything existing keeps working.

### Deliverables
- [x] `AppConfig` model — key-value store for user settings and API keys
- [x] `ApiToken` model — bearer tokens for Telegram and future clients
- [x] `ShortTermContext` model — rolling 7-day narrative memory
- [x] `src/lib/configLoader.ts` — loads AppConfig into process.env on startup
- [x] `src/lib/skills/types.ts` — SkillDefinition interface
- [x] `src/lib/skills/registry.ts` — skill registry singleton
- [x] `src/lib/auth/index.ts` — JWT and bcrypt helpers
- [x] `src/lib/auth/guard.ts` — requireAuth() for API routes
- [x] `src/middleware.ts` — Next.js middleware (JWT cookie gate)
- [x] `src/app/api/auth/` — login, setup, tokens, session routes
- [x] `src/app/login/` — login page
- [x] `src/app/onboarding/` — 5-step setup wizard

### Auth Design
- **Web sessions:** bcrypt password hash in AppConfig, JWT in httpOnly cookie (`ziggy_session`)
- **API clients:** SHA-256 hashed bearer tokens in `ApiToken` table
- **Dev bypass:** Set `SKIP_AUTH=true` in env to disable all auth checks
- **JWT secret:** Stored in `AppConfig.jwt_secret`. Falls back to `process.env.JWT_SECRET`.
- **Calendar OAuth:** `/api/calendar/callback` is whitelisted from auth checks

---

## Phase 2 — New Skills

**Goal:** Finance tracker, mood journal, people CRM, media tracker.

### Skills
| Skill | DB Models | Extraction Key | Complexity |
|---|---|---|---|
| Mood/Energy Journal | `MoodEntry` | `moodEntry` | Low |
| Finance Tracker | `Transaction`, `Budget` | `transactions` | Medium |
| People/CRM | `Person`, `Interaction` | `people` | High |
| Media Tracker | `MediaItem` | `media` | Low-Medium |

### Phase 2 DB Models

```prisma
model Transaction {
  id          String   @id @default(cuid())
  amount      Float
  type        String   // "expense" | "income"
  category    String
  description String?
  date        DateTime @default(now())
  createdAt   DateTime @default(now())
  @@index([date])
  @@index([category])
}

model Budget {
  id        String  @id @default(cuid())
  category  String  @unique
  amount    Float
  period    String  @default("monthly")
  createdAt DateTime @default(now())
}

model MoodEntry {
  id        String   @id @default(cuid())
  energy    Int?     // 1-10
  mood      Int?     // 1-10
  notes     String?
  tags      String?  // JSON array
  date      DateTime @default(now())
  @@index([date])
}

model Person {
  id           String        @id @default(cuid())
  name         String
  relationship String?
  notes        String?
  birthday     DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  interactions Interaction[]
}

model Interaction {
  id        String   @id @default(cuid())
  personId  String
  summary   String
  followUp  String?
  dueDate   DateTime?
  date      DateTime @default(now())
  person    Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
}

model MediaItem {
  id        String   @id @default(cuid())
  title     String
  type      String   // "book" | "movie" | "series"
  status    String   @default("want") // "want" | "in_progress" | "done"
  rating    Int?     // 1-5
  notes     String?
  author    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([type, status])
}
```

---

## Phase 3 — Telegram + Proactivity

**Goal:** Telegram bot, worker container, cron-based proactive notifications.

### Deliverables
- `grammy` Telegram bot library
- `Dockerfile.worker` — lightweight Node.js container
- `src/worker/index.ts` — cron job runner
- `src/lib/telegram/bot.ts` — bot setup and webhook handler
- `src/app/api/telegram/webhook/route.ts` — receives Telegram updates
- Worker service in `docker-compose.yml`

### Telegram Security
1. Webhook mode (not polling) — Cloudflare Tunnel provides stable HTTPS
2. Telegram webhook secret header — verified on every incoming update
3. Chat ID whitelist — only the registered `telegram_chat_id` from AppConfig can use the bot
4. API token for worker → main app communication

### Cron Schedule (defaults, configurable via AppConfig)
| Job | Schedule | Action |
|---|---|---|
| Morning briefing | 8:00am | Generate briefing → send via Telegram |
| Deadline alert | 9:00am | Todos due in 24h → Telegram alert |
| Habit nudge | 8:00pm | Incomplete habits today → Telegram nudge |
| Nightly summary | 11:55pm | Summarize today's messages → ShortTermContext |
| Weekly review | Sunday 10:00am | Aggregate week data → AI report → Telegram |

### Short-Term Memory
`ShortTermContext` stores one AI-generated day summary per day (rolling 7 days).
These are injected into every AI prompt as a "RECENT WEEK" section, giving Ziggy
continuity of context across conversations without blowing up token count.

---

## Phase 4 — Weekly Review + Polish

**Goal:** WeeklySummary model, settings page, dashboard enhancements.

### Deliverables
- `WeeklySummary` model and generation logic
- `/settings` page — manage tokens, change password, notification toggles
- Dashboard panels for mood trends, spending summary, relationship follow-ups
- Media "currently watching/reading" widget

---

## File Structure (new additions only)

```
src/
├── lib/
│   ├── skills/
│   │   ├── types.ts          ← SkillDefinition interface
│   │   ├── registry.ts       ← skill registry singleton
│   │   └── plugins/          ← new skills go here
│   │       ├── finance/
│   │       ├── mood/
│   │       ├── people/
│   │       └── media/
│   ├── auth/
│   │   ├── index.ts          ← JWT + bcrypt helpers
│   │   └── guard.ts          ← requireAuth() for API routes
│   ├── configLoader.ts       ← loads AppConfig into process.env
│   └── telegram/             ← Phase 3
│       └── bot.ts
├── middleware.ts              ← Next.js auth middleware
├── worker/                   ← Phase 3
│   └── index.ts
└── app/
    ├── login/
    │   └── page.tsx
    ├── onboarding/
    │   └── page.tsx
    └── api/
        ├── auth/
        │   ├── login/route.ts
        │   ├── setup/route.ts
        │   ├── tokens/route.ts
        │   └── session/route.ts
        └── telegram/         ← Phase 3
            └── webhook/route.ts
```

---

## Migration Notes

- All DB changes are strictly additive — no existing tables altered
- The skill registry starts empty in Phase 1 — zero behavior change
- `SKIP_AUTH=true` in env disables auth entirely for local dev
- After Phase 1 deploy: navigate to `/onboarding` on first run
