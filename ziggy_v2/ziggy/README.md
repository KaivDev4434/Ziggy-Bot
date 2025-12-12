# Ziggy - AI Personal Assistant

A friendly AI-powered personal assistant built with Next.js 14, helping you organize your life, track habits, and achieve your goals.

## Features

- **💬 Conversational Chat** - Talk naturally with Ziggy about your tasks, goals, and life events
- **📋 Task Management** - Track todos with priorities and due dates
- **🔄 Habit Tracking** - Build daily habits with streak tracking and weekly views
- **📊 Dashboard** - See your progress at a glance with stats and visualizations
- **📱 PWA Ready** - Install on mobile devices for a native app experience

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
│   │   ├── page.tsx           # Chat (home)
│   │   ├── todos/page.tsx     # Task management
│   │   ├── habits/page.tsx    # Habit tracking
│   │   ├── dashboard/page.tsx # Overview dashboard
│   │   └── api/               # API routes
│   │       ├── chat/          # AI chat endpoint
│   │       ├── todos/         # CRUD for todos
│   │       ├── habits/        # CRUD for habits
│   │       └── dashboard/     # Dashboard data
│   ├── components/
│   │   ├── chat/              # Chat UI components
│   │   ├── todos/             # Todo components
│   │   ├── habits/            # Habit components
│   │   ├── ui/                # shadcn/ui components
│   │   └── BottomNav.tsx      # Navigation
│   └── lib/
│       ├── db.ts              # Prisma client
│       ├── ai.ts              # Perplexity API client
│       └── utils.ts           # Utilities
├── prisma/
│   └── schema.prisma          # Database schema
└── public/
    ├── manifest.json          # PWA manifest
    └── icons/                 # App icons
```

## API Endpoints

### Chat
- `POST /api/chat` - Send a message to Ziggy

### Messages
- `GET /api/messages` - Get chat history

### Todos
- `GET /api/todos` - List todos (with optional status filter)
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

## License

MIT
