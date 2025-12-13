# Ziggy - AI Personal Assistant

A friendly AI-powered personal assistant built with Next.js 14, helping you organize your life, track habits, and achieve your goals.

## Features

- **Conversational Chat** - Talk naturally with Ziggy about your tasks, goals, and life events
- **Smart Task Management** - Track todos with priorities, due dates, start dates, and auto-categorization
- **Habit Tracking** - Build daily habits with streak tracking, weekly views, and GitHub-style contribution graphs
- **Calendar-Based Chats** - Each day has its own chat session with a mini calendar for navigation
- **Daily Briefings** - Start each day with weather, tasks, deadlines, and habit reminders
- **Dashboard** - See your progress at a glance with stats and visualizations
- **PWA Ready** - Install on mobile devices for a native app experience

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite with Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: Perplexity API
- **PWA**: next-pwa

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Add your Perplexity API key to `.env`:
   ```
   DATABASE_URL="file:./ziggy.db"
   PERPLEXITY_API_KEY="your-api-key-here"
   ```

3. Initialize the database:
   ```bash
   npx prisma migrate dev
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ziggy/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Chat (home) with calendar
│   │   ├── todos/page.tsx     # Task management with categories
│   │   ├── habits/page.tsx    # Habit tracking with graphs
│   │   ├── dashboard/page.tsx # Overview dashboard
│   │   └── api/               # API routes
│   │       ├── chat/          # AI chat endpoint
│   │       ├── briefing/      # Daily briefing generator
│   │       ├── todos/         # CRUD for todos
│   │       ├── habits/        # CRUD for habits
│   │       └── dashboard/     # Dashboard data
│   ├── components/
│   │   ├── chat/              # Chat UI components
│   │   ├── todos/             # Todo components
│   │   ├── habits/            # Habit components with graphs
│   │   ├── ui/                # shadcn/ui components
│   │   └── BottomNav.tsx      # Navigation
│   └── lib/
│       ├── db.ts              # Prisma client
│       ├── ai.ts              # Perplexity API client with context
│       ├── briefing.ts        # Daily briefing generator
│       └── utils.ts           # Utilities
├── prisma/
│   └── schema.prisma          # Database schema
└── public/
    ├── manifest.json          # PWA manifest
    └── icons/                 # App icons
```

## API Endpoints

### Chat
- `POST /api/chat` - Send a message to Ziggy (with date for session grouping)

### Briefing
- `POST /api/briefing` - Generate daily briefing for a date

### Messages
- `GET /api/messages` - Get chat history (with optional date filter)

### Todos
- `GET /api/todos` - List todos (with optional status/category filter)
- `POST /api/todos` - Create a todo
- `PATCH /api/todos/[id]` - Update a todo
- `DELETE /api/todos/[id]` - Delete a todo

### Habits
- `GET /api/habits` - List active habits with records
- `POST /api/habits` - Create a habit
- `PATCH /api/habits/[id]` - Update a habit
- `DELETE /api/habits/[id]` - Soft delete a habit
- `POST /api/habits/[id]/record` - Log a habit completion

### Dashboard
- `GET /api/dashboard` - Get aggregated stats

---

## Version Roadmap

### v1.0 (Current) - Core Experience
- [x] Bug fixes (task updates, AI context sync)
- [x] Smart auto-tagging (priority, dueDate, doDate, category)
- [x] Dynamic category filtering for todos
- [x] Calendar-based daily chats
- [x] Daily briefing (weather, todos, deadlines)
- [x] Habit contribution graphs

### v1.1 - Polish and UX
- [ ] Dark mode support
- [ ] Smooth animations (Framer Motion)
- [ ] Improved mobile PWA experience

### v1.2 - Content Integration
- [ ] Daily briefing: RSS feed links (last 24h)
- [ ] Daily briefing: YouTube subscription highlights

### v1.3 - Personal Tracking
- [ ] Basic budget tracking (income, expenses, categories)
- [ ] Mood tracking via sentiment analysis
- [ ] Journaling with photo sharing

### v1.4 - Meal Planning
- [ ] Meal planning and recipe suggestions
- [ ] Based on personal preferences and journal context/memory
- [ ] Grocery list generation from meal plans

### v1.5 - User Accounts
- [ ] User authentication (NextAuth)
- [ ] Multi-device sync
- [ ] Data export/import

### v1.6 - Advanced Features
- [ ] Multiple AI agents/personas
- [ ] Entertainment tracking (books, movies, podcasts)
- [ ] World map / cities visited

### v2.0 - Integrations and PKM
- [ ] Voice mode (Web Speech API)
- [ ] Todoist, Google Calendar integration
- [ ] Banking app connections (via Plaid)
- [ ] Personal Knowledge Management (insights, tagging, search)

---

## License

MIT
