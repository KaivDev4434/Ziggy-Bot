# Ziggy AI Assistant - LLM-Driven Development Plan

## Overview for LLM Development
This plan is designed for completion by LLMs with minimal human intervention. Each task is atomic, self-contained, and includes all necessary context, specifications, and acceptance criteria.

## Project Context (For Every Task)
**Project Name**: Ziggy Personal AI Assistant
**Goal**: Natural language journal-based task management system with GTD principles
**Tech Stack**: Go (Gin) + React (TypeScript) + SQLite + Perplexity API + Ollama
**Target**: Single-user home server deployment, no authentication needed initially

## Development Phases

---

## PHASE 1: PROJECT FOUNDATION

### Task 1.1: Initialize Go Backend Project
**Objective**: Create basic Go project structure with dependencies
**Context**: This is the first task - create everything from scratch
**Deliverables**:
```
ziggy-backend/
├── main.go
├── go.mod
├── go.sum
├── config/
├── models/
├── handlers/
├── services/
└── database/
```

**Requirements**:
- Initialize Go module: `go mod init ziggy`
- Add dependencies: gin, gorm, sqlite driver, cors
- Create basic main.go with gin server on port 8080
- Add CORS middleware for frontend integration
- Create basic folder structure
- Add basic health check endpoint: GET /health

**Acceptance Criteria**:
- Server starts without errors
- Health endpoint returns 200 with JSON: `{"status": "ok"}`
- All folders created
- Dependencies properly imported

**Code Template**:
```go
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

func main() {
    r := gin.Default()
    r.Use(cors.Default())
    
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok"})
    })
    
    r.Run(":8080")
}
```

---

### Task 1.2: Create Database Models
**Objective**: Define all database models using GORM
**Context**: These models support GTD principles and flexible list management
**Dependencies**: Task 1.1 completed

**Models to Create**:
1. `JournalEntry` - stores daily journal inputs
2. `Task` - GTD-compliant task model
3. `List` - flexible list system (movies, books, grocery)
4. `ListItem` - items within lists
5. `Category` - for task categorization
6. `Habit` - for habit tracking
7. `HabitRecord` - daily habit completions

**File**: `models/models.go`

**Specifications**:
```go
type JournalEntry struct {
    ID        uint      `gorm:"primaryKey"`
    Content   string    `gorm:"type:text;not null"`
    CreatedAt time.Time
    UpdatedAt time.Time
    Processed bool `gorm:"default:false"` // whether AI has processed this entry
}

type Task struct {
    ID          uint      `gorm:"primaryKey"`
    Title       string    `gorm:"not null"`
    Description string    `gorm:"type:text"`
    Status      string    `gorm:"default:'inbox'"` // inbox, next_action, waiting, someday_maybe, done
    Priority    int       `gorm:"default:2"`       // 1=high, 2=medium, 3=low
    Context     string    // @home, @office, @errands
    ProjectName string    // project this task belongs to
    DoDate      *time.Time // when to start
    DueDate     *time.Time // when it's due
    Energy      string     // high, medium, low
    Tags        string     // comma-separated tags
    CreatedAt   time.Time
    UpdatedAt   time.Time
    CompletedAt *time.Time
}

type List struct {
    ID        uint      `gorm:"primaryKey"`
    Name      string    `gorm:"not null"`
    Type      string    `gorm:"not null"` // movies, books, grocery, custom
    CreatedAt time.Time
    Items     []ListItem `gorm:"foreignKey:ListID"`
}

type ListItem struct {
    ID        uint      `gorm:"primaryKey"`
    ListID    uint      `gorm:"not null"`
    Content   string    `gorm:"not null"`
    Metadata  string    `gorm:"type:json"` // flexible JSON storage
    Completed bool      `gorm:"default:false"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

type Category struct {
    ID          uint   `gorm:"primaryKey"`
    Name        string `gorm:"unique;not null"`
    Description string
    Color       string `gorm:"default:'#3B82F6'"` // hex color for UI
}

type Habit struct {
    ID          uint      `gorm:"primaryKey"`
    Name        string    `gorm:"not null"`
    Description string
    Frequency   string    `gorm:"default:'daily'"` // daily, weekly, monthly
    Target      int       `gorm:"default:1"`       // target completions
    Active      bool      `gorm:"default:true"`
    CreatedAt   time.Time
    Records     []HabitRecord `gorm:"foreignKey:HabitID"`
}

type HabitRecord struct {
    ID        uint      `gorm:"primaryKey"`
    HabitID   uint      `gorm:"not null"`
    Date      time.Time `gorm:"not null"`
    Completed bool      `gorm:"default:false"`
    Notes     string
}
```

**Acceptance Criteria**:
- All models defined with proper GORM tags
- Relationships properly established
- File compiles without errors
- Models support all planned features

---

### Task 1.3: Database Connection and Migration
**Objective**: Set up SQLite database with auto-migration
**Context**: Create database connection and ensure tables are created
**Dependencies**: Task 1.2 completed

**File**: `database/database.go`

**Requirements**:
- Create SQLite database connection
- Auto-migrate all models
- Create database initialization function
- Handle connection errors gracefully
- Database file: `ziggy.db`

**Code Structure**:
```go
package database

import (
    "gorm.io/gorm"
    "gorm.io/driver/sqlite"
    "ziggy/models"
)

var DB *gorm.DB

func InitDatabase() error {
    // Implementation here
    // Connect to SQLite
    // Auto-migrate all models
    // Return error if any issues
}
```

**Acceptance Criteria**:
- Database connects successfully
- All tables created with correct schema
- Function can be called from main.go
- Error handling implemented
- Database file created in project root

---

### Task 1.4: Basic API Endpoints - Journal
**Objective**: Create CRUD endpoints for journal entries
**Context**: First set of API endpoints to test database integration
**Dependencies**: Task 1.3 completed

**File**: `handlers/journal.go`

**Endpoints Required**:
- POST /api/journal - Create new journal entry
- GET /api/journal - Get all journal entries (paginated)
- GET /api/journal/:id - Get specific journal entry
- PUT /api/journal/:id - Update journal entry
- DELETE /api/journal/:id - Delete journal entry

**Request/Response Format**:
```json
// POST request body
{
    "content": "Today I need to buy groceries and finish the project report. Also want to watch Inception later."
}

// Response
{
    "id": 1,
    "content": "Today I need to buy groceries...",
    "created_at": "2025-08-18T10:00:00Z",
    "updated_at": "2025-08-18T10:00:00Z",
    "processed": false
}
```

**Implementation Requirements**:
- Use Gin framework
- Proper error handling with HTTP status codes
- Input validation
- JSON response format
- Database operations using GORM

**Acceptance Criteria**:
- All endpoints work correctly
- Proper HTTP status codes returned
- Data persists to database
- Error responses are JSON formatted
- Endpoints can be tested with curl/Postman

---

### Task 1.5: Initialize React Frontend
**Objective**: Create React TypeScript project with Tailwind CSS
**Context**: Frontend foundation for the chat interface
**Dependencies**: None (parallel to backend tasks)

**Deliverables**:
```
ziggy-frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── types/
│   └── utils/
├── public/
└── package.json
```

**Requirements**:
- Create React app with TypeScript template
- Install and configure Tailwind CSS
- Install additional dependencies: React Query, React Router, Axios
- Set up basic folder structure
- Configure TypeScript for strict mode
- Set up Tailwind config with custom colors
- Create basic App.tsx with routing

**Dependencies to Install**:
```json
{
  "@tanstack/react-query": "latest",
  "react-router-dom": "latest",
  "axios": "latest",
  "@headlessui/react": "latest",
  "@heroicons/react": "latest",
  "date-fns": "latest"
}
```

**Acceptance Criteria**:
- Project builds without errors: `npm start`
- Tailwind CSS working (test with basic classes)
- TypeScript strict mode enabled
- All dependencies installed
- Basic routing structure in place

---

### Task 1.6: Basic Chat Interface
**Objective**: Create chat UI component for journal input
**Context**: Main user interface - conversational journal entry
**Dependencies**: Task 1.5 completed

**Files to Create**:
- `src/components/Chat/ChatInterface.tsx`
- `src/components/Chat/MessageBubble.tsx`
- `src/components/Chat/InputArea.tsx`
- `src/types/index.ts`

**Features Required**:
- Chat-like interface with message bubbles
- Input area with send button
- Message history display
- Responsive design
- Modern, pleasant morning-friendly design
- Auto-scroll to latest message
- Loading states

**Design Requirements**:
- Light, airy feel suitable for morning use
- Clean typography
- Soft colors (consider light blues, whites, soft grays)
- Mobile-responsive
- Smooth animations

**TypeScript Types**:
```typescript
interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}
```

**Acceptance Criteria**:
- Chat interface renders correctly
- Messages display in bubbles (different styles for user/assistant)
- Input field accepts text and sends on Enter/button click
- Responsive on mobile devices
- Loading states work properly
- TypeScript types are properly defined

---

### Task 1.7: Connect Frontend to Backend
**Objective**: Set up API service and connect chat to journal endpoints
**Context**: Enable frontend to save journal entries to backend
**Dependencies**: Tasks 1.4 and 1.6 completed

**Files to Create**:
- `src/services/api.ts`
- `src/services/journalService.ts`
- `src/hooks/useJournal.ts`

**Requirements**:
- Axios configuration with base URL
- React Query setup for API state management
- Journal service functions
- Custom hook for journal operations
- Error handling and loading states
- Environment variable for API URL

**API Service Structure**:
```typescript
// api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// journalService.ts
export interface JournalEntry {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  processed: boolean;
}

export const journalService = {
  createEntry: (content: string) => Promise<JournalEntry>,
  getEntries: () => Promise<JournalEntry[]>,
  // ... other methods
};
```

**Integration Requirements**:
- When user sends message in chat, save as journal entry
- Display confirmation or assistant response
- Handle API errors gracefully
- Show loading states during API calls

**Acceptance Criteria**:
- Chat interface successfully saves messages to backend
- API errors are handled and displayed to user
- Loading states work correctly
- Journal entries persist in database
- Frontend and backend communicate successfully

---

## PHASE 2: AI INTEGRATION & PARSING

### Task 2.1: Perplexity API Integration
**Objective**: Set up Perplexity API service for natural language processing
**Context**: Primary AI service for parsing journal entries into structured data
**Dependencies**: Phase 1 completed

**File**: `services/ai.go`

**Requirements**:
- Create Perplexity API client
- Implement structured prompt for task extraction
- Handle API responses and errors
- Rate limiting and timeout handling
- Environment variable for API key

**Prompt Engineering**:
Design prompt that extracts:
- Tasks vs. journal entries vs. list items
- Priority levels
- Due dates and do dates
- Categories/projects
- Context tags
- Completion status updates

**Expected Input/Output**:
```
Input: "Today I need to buy groceries, finish the project report by Friday, and I want to watch Inception later. Oh and I completed the laundry task from yesterday."

Output JSON:
{
  "tasks": [
    {
      "title": "Buy groceries",
      "type": "task",
      "category": "personal",
      "priority": 2,
      "context": "@errands"
    },
    {
      "title": "Finish project report",
      "type": "task",
      "category": "work",
      "priority": 1,
      "due_date": "2025-08-22",
      "context": "@office"
    }
  ],
  "list_items": [
    {
      "title": "Inception",
      "list_type": "movies"
    }
  ],
  "completions": [
    {
      "task_title": "laundry",
      "completed": true
    }
  ]
}
```

**Acceptance Criteria**:
- API client connects successfully
- Structured JSON responses received
- Error handling for API failures
- Rate limiting implemented
- Prompt produces consistent results

---

### Task 2.2: Ollama Local Integration
**Objective**: Set up Ollama as fallback AI service
**Context**: Backup AI service when Perplexity API is unavailable
**Dependencies**: Task 2.1 completed

**File**: `services/ollama.go`

**Requirements**:
- HTTP client for Ollama API (default localhost:11434)
- Same structured prompt as Perplexity
- Fallback logic implementation
- Model selection (recommend llama3.1 or similar)

**Implementation Strategy**:
- Try Perplexity first
- On failure/timeout, switch to Ollama
- Log which service was used
- Maintain same response format

**Acceptance Criteria**:
- Ollama client works with local installation
- Same JSON structure as Perplexity
- Fallback logic triggers correctly
- Response times are acceptable
- Error handling for Ollama unavailability

---

### Task 2.3: Journal Processing Service
**Objective**: Create service to process journal entries and extract structured data
**Context**: Core AI processing pipeline that turns natural language into tasks/lists
**Dependencies**: Tasks 2.1 and 2.2 completed

**File**: `services/processor.go`

**Requirements**:
- Process unprocessed journal entries
- Use AI service to extract structured data
- Create/update tasks based on AI response
- Create/update list items
- Handle task completions
- Mark journal entries as processed

**Processing Pipeline**:
1. Get unprocessed journal entries
2. Send to AI service for parsing
3. Process AI response:
   - Create new tasks
   - Update existing tasks
   - Add items to lists
   - Mark tasks as completed
   - Handle priority/due date updates
4. Mark journal entry as processed
5. Log processing results

**Database Operations**:
- CRUD operations for tasks
- CRUD operations for list items
- Task status updates
- Duplicate detection and merging

**Error Handling**:
- AI service failures
- Invalid AI responses
- Database operation failures
- Partial processing recovery

**Acceptance Criteria**:
- Journal entries are processed automatically
- Tasks are created correctly from natural language
- List items are categorized properly
- Task completions are detected
- Processing errors are handled gracefully
- Processed entries are marked correctly

---

### Task 2.4: Background Processing Job
**Objective**: Implement background service to automatically process journal entries
**Context**: Automatic processing of entries without user intervention
**Dependencies**: Task 2.3 completed

**File**: `services/background.go`

**Requirements**:
- Goroutine-based background processor
- Configurable processing intervals
- Process queue management
- Graceful shutdown handling
- Processing statistics and logging

**Features**:
- Run every 30 seconds to check for unprocessed entries
- Batch processing for multiple entries
- Rate limiting for AI API calls
- Retry logic for failed processing
- Health monitoring

**Implementation Structure**:
```go
type BackgroundProcessor struct {
    interval time.Duration
    quit     chan bool
    // other fields
}

func (bp *BackgroundProcessor) Start() {
    // Implementation
}

func (bp *BackgroundProcessor) Stop() {
    // Graceful shutdown
}

func (bp *BackgroundProcessor) processEntries() {
    // Core processing logic
}
```

**Acceptance Criteria**:
- Background service starts with main application
- Processes entries automatically
- Handles shutdown gracefully
- Logs processing activities
- Doesn't block main application
- Rate limiting works correctly

---

### Task 2.5: Task Management API Endpoints
**Objective**: Create comprehensive API for task management
**Context**: Enable frontend to display and manage tasks
**Dependencies**: Task 2.4 completed

**File**: `handlers/tasks.go`

**Endpoints Required**:
- GET /api/tasks - Get all tasks with filtering
- GET /api/tasks/:id - Get specific task
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task
- POST /api/tasks/:id/complete - Mark task complete
- GET /api/tasks/contexts - Get all unique contexts
- GET /api/tasks/projects - Get all unique projects

**Query Parameters for GET /api/tasks**:
- status (inbox, next_action, waiting, someday_maybe, done)
- priority (1, 2, 3)
- context (@home, @office, @errands)
- project (project name)
- due_date (before, after, today)
- limit, offset (pagination)

**Response Format**:
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Buy groceries",
      "description": "",
      "status": "next_action",
      "priority": 2,
      "context": "@errands",
      "project_name": "personal",
      "do_date": null,
      "due_date": "2025-08-20T00:00:00Z",
      "energy": "medium",
      "tags": "shopping,food",
      "created_at": "2025-08-18T10:00:00Z",
      "updated_at": "2025-08-18T10:00:00Z",
      "completed_at": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

**Acceptance Criteria**:
- All endpoints work correctly
- Filtering and pagination implemented
- Proper HTTP status codes
- Error handling
- Data validation
- Task updates persist correctly

---

## PHASE 3: FRONTEND TASK MANAGEMENT

### Task 3.1: Task Display Components
**Objective**: Create UI components to display and manage tasks
**Context**: Visual representation of tasks with GTD organization
**Dependencies**: Task 2.5 completed

**Files to Create**:
- `src/components/Tasks/TaskList.tsx`
- `src/components/Tasks/TaskCard.tsx`
- `src/components/Tasks/TaskFilters.tsx`
- `src/components/Tasks/TaskStatusBadge.tsx`

**TaskCard Features**:
- Task title and description
- Priority indicator (color-coded)
- Status badge
- Context and project tags
- Due date display (with urgency styling)
- Completion checkbox
- Edit/delete actions
- Energy level indicator

**TaskList Features**:
- Grouped by status (Inbox, Next Actions, Waiting, Someday/Maybe)
- Sortable by priority, due date, created date
- Drag and drop for status changes
- Bulk actions
- Empty states

**TaskFilters Features**:
- Filter by status, priority, context, project
- Search functionality
- Clear filters option
- Active filter indicators

**Design Requirements**:
- GTD-compliant organization
- Clean, scannable layout
- Color-coded priorities
- Responsive design
- Smooth animations
- Accessibility compliance

**Acceptance Criteria**:
- Tasks display correctly in organized groups
- Filtering works for all criteria
- Task cards show all relevant information
- Responsive on mobile devices
- Actions (complete, edit, delete) work correctly
- Loading and empty states handled

---

### Task 3.2: Task Interaction Hooks
**Objective**: Create React hooks for task management operations
**Context**: State management for task operations
**Dependencies**: Task 3.1 completed

**Files to Create**:
- `src/hooks/useTasks.ts`
- `src/hooks/useTaskFilters.ts`
- `src/hooks/useTaskActions.ts`

**useTasks Hook**:
- Fetch tasks with filtering
- Real-time updates
- Caching with React Query
- Pagination handling

**useTaskFilters Hook**:
- Filter state management
- URL synchronization
- Filter persistence
- Search functionality

**useTaskActions Hook**:
- Complete/uncomplete tasks
- Update task properties
- Delete tasks
- Bulk operations
- Optimistic updates

**Implementation Example**:
```typescript
export const useTasks = (filters: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskService.getTasks(filters),
    staleTime: 30000,
  });
};

export const useTaskActions = () => {
  const queryClient = useQueryClient();
  
  const completeMutation = useMutation({
    mutationFn: taskService.completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    },
  });
  
  return {
    complete: completeMutation.mutate,
    // ... other actions
  };
};
```

**Acceptance Criteria**:
- Hooks provide clean API for components
- React Query caching works correctly
- Optimistic updates provide good UX
- Error states are handled
- TypeScript types are properly defined
- Real-time updates work

---

### Task 3.3: Daily Planning Dashboard
**Objective**: Create dashboard showing daily task recommendations
**Context**: AI-generated daily todo list based on all user data
**Dependencies**: Task 3.2 completed

**Files to Create**:
- `src/components/Dashboard/DailyOverview.tsx`
- `src/components/Dashboard/TaskSummary.tsx`
- `src/components/Dashboard/TodaysList.tsx`
- `src/pages/Dashboard.tsx`

**DailyOverview Features**:
- Today's date and greeting
- Weather-like overview of the day's tasks
- Quick stats (total tasks, high priority, overdue)
- Motivational message based on progress

**TodaysList Features**:
- AI-recommended tasks for today
- Prioritized ordering
- Time estimates if available
- Context groupings (@home, @office, @errands)
- Quick complete actions

**TaskSummary Features**:
- Visual progress indicators
- Completion percentage
- Streak information
- Weekly/monthly trends

**Backend Endpoint Required**:
- GET /api/daily-plan - Get AI-generated daily recommendations

**Daily Planning Logic**:
- High priority tasks
- Tasks with due dates today/soon
- Tasks matching current context (day of week, time)
- Energy level considerations
- Workload balancing

**Acceptance Criteria**:
- Dashboard loads quickly
- Daily recommendations are relevant
- Progress indicators work correctly
- Responsive design
- Interactive elements function properly
- Data updates in real-time

---

### Task 3.4: List Management Interface
**Objective**: Create UI for managing various lists (movies, books, grocery, custom)
**Context**: Beyond tasks - manage personal lists and get recommendations
**Dependencies**: Task 3.3 completed

**Files to Create**:
- `src/components/Lists/ListManager.tsx`
- `src/components/Lists/MovieList.tsx`
- `src/components/Lists/BookList.tsx`
- `src/components/Lists/GroceryList.tsx`
- `src/components/Lists/CustomList.tsx`
- `src/hooks/useLists.ts`

**Backend Endpoints Required**:
- GET /api/lists - Get all lists
- POST /api/lists - Create new list
- GET /api/lists/:id/items - Get list items
- POST /api/lists/:id/items - Add item to list
- PUT /api/lists/:id/items/:itemId - Update item
- DELETE /api/lists/:id/items/:itemId - Delete item
- GET /api/recommendations/:listType - Get recommendations from personal lists

**List Features by Type**:

**MovieList**:
- Movie title, year, genre (from metadata)
- Watched/unwatched status
- Rating after watching
- Recommendation engine from personal list

**BookList**:
- Title, author, pages (from metadata)
- Reading status (want to read, reading, finished)
- Progress tracking
- Personal recommendations

**GroceryList**:
- Item name, quantity, category
- Check off items
- Smart categorization (produce, dairy, etc.)
- Recurring items detection

**CustomList**:
- Generic list with custom fields
- User-defined categories
- Flexible item structure

**Acceptance Criteria**:
- All list types display correctly
- Items can be added/edited/deleted
- Recommendations work from personal lists
- List-specific features function properly
- Mobile-friendly interface
- Data persists correctly

---

## PHASE 4: SMART FEATURES & HABITS

### Task 4.1: Habit Tracking Backend
**Objective**: Implement habit detection and tracking system
**Context**: Automatically detect habits from journal entries and track progress
**Dependencies**: Phase 3 completed

**Files to Create**:
- `handlers/habits.go`
- `services/habit_tracker.go`

**Endpoints Required**:
- GET /api/habits - Get all habits
- POST /api/habits - Create new habit
- PUT /api/habits/:id - Update habit
- DELETE /api/habits/:id - Delete habit
- POST /api/habits/:id/record - Record habit completion
- GET /api/habits/:id/stats - Get habit statistics

**Habit Detection Logic**:
- Pattern recognition in journal entries
- Frequency analysis (daily, weekly patterns)
- Automatic habit suggestion
- Manual habit creation

**Habit Tracking Features**:
- Streak calculation
- Success rate tracking
- Progress visualization data
- Habit stacking suggestions
- Reminder system (future enhancement)

**Statistics Calculation**:
- Current streak
- Longest streak
- Success percentage
- Weekly/monthly trends
- Habit correlation analysis

**AI Enhancement**:
- Detect habit mentions in journal entries
- Automatically record completions
- Suggest habit improvements
- Identify habit patterns

**Acceptance Criteria**:
- Habits can be created and managed
- Progress tracking works correctly
- Statistics are calculated accurately
- AI detection finds habit mentions
- Streak calculations are correct

---

### Task 4.2: Habit Tracking Frontend
**Objective**: Create UI for habit management and progress visualization
**Context**: Visual habit tracking with progress indicators and analytics
**Dependencies**: Task 4.1 completed

**Files to Create**:
- `src/components/Habits/HabitTracker.tsx`
- `src/components/Habits/HabitCard.tsx`
- `src/components/Habits/HabitStats.tsx`
- `src/components/Habits/HabitCalendar.tsx`
- `src/hooks/useHabits.ts`

**HabitCard Features**:
- Habit name and description
- Current streak display
- Quick completion button
- Progress bar (for frequency-based habits)
- Edit/delete actions
- Visual success indicators

**HabitCalendar Features**:
- Monthly calendar view
- Color-coded completion days
- Streak visualization
- Interactive day selection
- Success pattern recognition

**HabitStats Features**:
- Charts for progress over time
- Success rate indicators
- Streak records (current, longest)
- Habit comparison
- Weekly/monthly summaries

**HabitTracker Features**:
- List of all active habits
- Quick completion interface
- Habit creation form
- Progress overview
- Habit suggestions from AI

**Visualization Requirements**:
- Use charts (consider recharts library)
- Color-coded progress indicators
- Responsive design
- Smooth animations
- Mobile-optimized interface

**Acceptance Criteria**:
- Habits display with correct progress
- Completion actions work immediately
- Statistics charts render correctly
- Calendar view shows accurate data
- Mobile interface is usable
- Real-time updates function properly

---

### Task 4.3: Smart Task Management Features
**Objective**: Implement intelligent task management features
**Context**: AI-powered task organization, priority adjustment, and recommendations
**Dependencies**: Task 4.2 completed

**Backend Features to Add**:
- Automatic priority adjustment based on due dates
- Task dependency detection
- Smart task suggestions
- Context-aware task recommendations
- Workload balancing
- Task pattern analysis

**Files to Enhance**:
- `services/smart_tasks.go` (new)
- `handlers/tasks.go` (enhance existing)
- `services/processor.go` (enhance existing)

**Smart Features Implementation**:

**Priority Adjustment**:
- Increase priority as due date approaches
- Consider task importance and urgency
- Factor in available time and energy
- Adjust based on completion patterns

**Dependency Detection**:
- Identify blocking tasks
- Suggest task ordering
- Highlight prerequisite tasks
- Automatic status updates

**Smart Recommendations**:
- Suggest next actions based on context
- Recommend task grouping
- Identify optimal work sessions
- Energy-based task matching

**Pattern Analysis**:
- Track completion patterns
- Identify productive contexts
- Suggest optimal scheduling
- Detect procrastination patterns

**New Endpoints**:
- GET /api/tasks/recommendations - Get smart task suggestions
- PUT /api/tasks/batch-update - Bulk task updates
- GET /api/insights/patterns - Get user patterns and insights
- POST /api/tasks/reorder - AI-suggested task reordering

**Acceptance Criteria**:
- Priority adjustments happen automatically
- Task recommendations are relevant
- Dependencies are detected correctly
- Pattern analysis provides useful insights
- Bulk operations work efficiently
- Performance remains good with smart features

---

### Task 4.4: Weekly Review System
**Objective**: Implement GTD weekly review functionality
**Context**: Automated weekly review generation with insights and planning
**Dependencies**: Task 4.3 completed

**Files to Create**:
- `services/weekly_review.go`
- `handlers/review.go`
- `src/components/Review/WeeklyReview.tsx`
- `src/components/Review/ReviewInsights.tsx`

**Weekly Review Components**:

**Completed Tasks Review**:
- List of tasks completed this week
- Achievement highlights
- Progress towards goals
- Success patterns identified

**Incomplete Tasks Analysis**:
- Overdue tasks with reasons
- Stalled projects identification
- Priority reassessment
- Context analysis (what's blocking progress)

**Habit Review**:
- Weekly habit performance
- Streak status updates
- Habit success rate analysis
- Suggestions for improvement

**Insights Generation**:
- Most productive contexts
- Energy pattern analysis
- Peak performance times
- Distraction identification

**Next Week Planning**:
- Priority task recommendations
- Context-based scheduling suggestions
- Energy-level task matching
- Goal setting for upcoming week
- Habit adjustment recommendations

**Backend Implementation**:
```go
type WeeklyReview struct {
    WeekStart      time.Time     `json:"week_start"`
    WeekEnd        time.Time     `json:"week_end"`
    CompletedTasks []Task        `json:"completed_tasks"`
    OverdueTasks   []Task        `json:"overdue_tasks"`
    HabitSummary   HabitSummary  `json:"habit_summary"`
    Insights       []Insight     `json:"insights"`
    Recommendations []string     `json:"recommendations"`
}

type Insight struct {
    Category    string `json:"category"`    // productivity, habits, patterns
    Title       string `json:"title"`
    Description string `json:"description"`
    Score       float64 `json:"score"`      // 0-100 confidence
}
```

**API Endpoints**:
- GET /api/review/weekly - Generate current week review
- GET /api/review/weekly/:date - Get review for specific week
- POST /api/review/weekly/:date/feedback - Save user feedback on review

**Frontend Features**:
- Interactive review dashboard
- Insights visualization
- Progress charts and metrics
- Action item generation
- Review history navigation
- Export/share functionality

**AI Integration**:
- Generate personalized insights
- Suggest improvements
- Pattern recognition
- Goal adjustment recommendations
- Natural language review summaries

**Acceptance Criteria**:
- Weekly reviews generate automatically
- Insights are relevant and actionable
- Progress tracking is accurate
- Recommendations are personalized
- Review interface is intuitive
- Data exports work correctly

---

## PHASE 5: PERSONAL FINANCE INTEGRATION

### Task 5.1: Finance Data Models
**Objective**: Create database models for personal finance tracking
**Context**: Add expense/income tracking parsed from natural language
**Dependencies**: Task 4.4 completed

**Files to Create/Update**:
- `models/finance.go`
- Update `database/database.go` for new models

**Models Required**:
```go
type Transaction struct {
    ID          uint      `gorm:"primaryKey"`
    Amount      float64   `gorm:"not null"`
    Type        string    `gorm:"not null"` // income, expense
    Category    string    `gorm:"not null"` // groceries, entertainment, salary, etc.
    Description string    `gorm:"not null"`
    Date        time.Time `gorm:"not null"`
    Source      string    // journal, manual, import
    Tags        string    // comma-separated
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

type Budget struct {
    ID          uint      `gorm:"primaryKey"`
    Category    string    `gorm:"unique;not null"`
    MonthlyLimit float64  `gorm:"not null"`
    CurrentSpent float64  `gorm:"default:0"`
    Active      bool      `gorm:"default:true"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

type FinanceGoal struct {
    ID          uint      `gorm:"primaryKey"`
    Name        string    `gorm:"not null"`
    Type        string    `gorm:"not null"` // savings, debt_payoff, budget
    TargetAmount float64  `gorm:"not null"`
    CurrentAmount float64 `gorm:"default:0"`
    TargetDate  time.Time
    Status      string    `gorm:"default:'active'"` // active, completed, paused
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

type FinanceInsight struct {
    ID          uint      `gorm:"primaryKey"`
    Type        string    `gorm:"not null"` // spending_pattern, budget_alert, goal_progress
    Title       string    `gorm:"not null"`
    Description string    `gorm:"type:text"`
    Severity    string    `gorm:"default:'info'"` // info, warning, critical
    Data        string    `gorm:"type:json"` // additional structured data
    ReadAt      *time.Time
    CreatedAt   time.Time
}
```

**Finance Categories**:
- Income: salary, freelance, investment, gift, other
- Expenses: groceries, dining, entertainment, transportation, utilities, healthcare, shopping, education, other

**Acceptance Criteria**:
- All finance models defined correctly
- Database migration works
- Models support required functionality
- Relationships properly established
- JSON fields work for flexible data

---

### Task 5.2: Finance AI Processing
**Objective**: Enhance AI processing to detect and categorize financial transactions
**Context**: Parse financial mentions from journal entries
**Dependencies**: Task 5.1 completed

**Files to Update**:
- `services/processor.go` (enhance)
- `services/ai.go` (enhance prompts)

**AI Enhancement for Finance**:
- Detect expense mentions ("spent $50 on groceries")
- Identify income mentions ("got paid $2000")
- Categorize transactions automatically
- Extract amounts, dates, descriptions
- Handle different currency formats
- Detect recurring transactions

**Enhanced Prompt Structure**:
```
Input: "Today I spent $45 at whole foods for groceries, got my salary of $3000, and paid $120 for the electric bill"

Expected Output:
{
  "tasks": [],
  "list_items": [],
  "transactions": [
    {
      "amount": 45.00,
      "type": "expense",
      "category": "groceries",
      "description": "Whole foods groceries",
      "merchant": "Whole Foods"
    },
    {
      "amount": 3000.00,
      "type": "income",
      "category": "salary",
      "description": "Monthly salary"
    },
    {
      "amount": 120.00,
      "type": "expense",
      "category": "utilities",
      "description": "Electric bill payment"
    }
  ],
  "completions": []
}
```

**Transaction Processing Logic**:
- Validate extracted amounts
- Auto-categorize based on keywords/merchants
- Handle partial information
- Detect duplicate transactions
- Update budget tracking
- Generate insights

**Budget Integration**:
- Update budget spent amounts
- Generate budget alerts
- Track category trends
- Identify over-budget categories

**Acceptance Criteria**:
- Financial transactions detected accurately
- Categories assigned correctly
- Amounts parsed properly
- Budget updates work automatically
- Duplicate detection prevents errors
- Edge cases handled gracefully

---

### Task 5.3: Finance API Endpoints
**Objective**: Create comprehensive API for finance management
**Context**: Enable frontend to display and manage financial data
**Dependencies**: Task 5.2 completed

**Files to Create**:
- `handlers/finance.go`
- `handlers/budget.go`

**Transaction Endpoints**:
- GET /api/transactions - Get all transactions with filtering
- POST /api/transactions - Create manual transaction
- PUT /api/transactions/:id - Update transaction
- DELETE /api/transactions/:id - Delete transaction
- GET /api/transactions/summary - Get spending summary
- GET /api/transactions/categories - Get spending by category

**Budget Endpoints**:
- GET /api/budgets - Get all budgets
- POST /api/budgets - Create/update budget
- PUT /api/budgets/:id - Update budget limit
- DELETE /api/budgets/:id - Delete budget
- GET /api/budgets/status - Get current budget status

**Goals Endpoints**:
- GET /api/finance-goals - Get all financial goals
- POST /api/finance-goals - Create new goal
- PUT /api/finance-goals/:id - Update goal
- DELETE /api/finance-goals/:id - Delete goal
- POST /api/finance-goals/:id/progress - Update goal progress

**Analytics Endpoints**:
- GET /api/finance/insights - Get AI-generated insights
- GET /api/finance/trends - Get spending trends
- GET /api/finance/reports/:period - Get periodic reports

**Query Parameters**:
- Date ranges (start_date, end_date)
- Categories, transaction types
- Amount ranges
- Pagination (limit, offset)

**Response Formats**:
```json
// Transaction summary
{
  "total_income": 5000.00,
  "total_expenses": 3200.00,
  "net_income": 1800.00,
  "by_category": {
    "groceries": 450.00,
    "dining": 280.00,
    "utilities": 220.00
  },
  "budget_status": {
    "groceries": {"spent": 450.00, "limit": 500.00, "remaining": 50.00},
    "dining": {"spent": 280.00, "limit": 200.00, "over_budget": 80.00}
  }
}
```

**Acceptance Criteria**:
- All endpoints work correctly
- Filtering and pagination implemented
- Financial calculations are accurate
- Budget tracking functions properly
- Analytics data is meaningful
- Error handling is comprehensive

---

### Task 5.4: Finance Dashboard Frontend
**Objective**: Create comprehensive finance management interface
**Context**: Visual dashboard for expenses, budgets, and financial goals
**Dependencies**: Task 5.3 completed

**Files to Create**:
- `src/components/Finance/FinanceDashboard.tsx`
- `src/components/Finance/TransactionList.tsx`
- `src/components/Finance/BudgetOverview.tsx`
- `src/components/Finance/SpendingChart.tsx`
- `src/components/Finance/FinanceGoals.tsx`
- `src/hooks/useFinance.ts`

**FinanceDashboard Features**:
- Monthly spending overview
- Budget status indicators
- Recent transactions
- Goal progress displays
- Quick insights panel
- Spending trends chart

**TransactionList Features**:
- Filterable transaction history
- Category-based grouping
- Search functionality
- Manual transaction entry
- Edit/delete capabilities
- Export functionality

**BudgetOverview Features**:
- Visual budget progress bars
- Over-budget alerts
- Category comparisons
- Budget vs. actual spending
- Monthly/yearly views
- Budget adjustment interface

**SpendingChart Features**:
- Monthly spending trends
- Category breakdowns
- Income vs. expenses
- Interactive charts (recharts)
- Period comparisons
- Drill-down capabilities

**FinanceGoals Features**:
- Goal progress visualization
- Milestone tracking
- Goal creation/editing
- Achievement celebrations
- Progress projections
- Recommendation system

**Design Requirements**:
- Clean, professional financial UI
- Color-coded budget status (green/yellow/red)
- Responsive charts and graphs
- Mobile-optimized interface
- Accessible design
- Export capabilities (CSV, PDF)

**Acceptance Criteria**:
- Dashboard loads financial data correctly
- Charts render accurately
- Budget status updates in real-time
- Transaction management works smoothly
- Goals tracking functions properly
- Mobile interface is fully usable

---

## PHASE 6: POLISH & DEPLOYMENT

### Task 6.1: Error Handling & Logging
**Objective**: Implement comprehensive error handling and logging system
**Context**: Production-ready error management and monitoring
**Dependencies**: Phase 5 completed

**Files to Create/Update**:
- `middleware/logging.go`
- `middleware/error_handler.go`
- `utils/logger.go`
- Update all handlers for consistent error responses

**Logging Requirements**:
- Structured logging (JSON format)
- Different log levels (DEBUG, INFO, WARN, ERROR)
- Request/response logging
- Database query logging
- AI API call logging
- Performance metrics logging

**Error Handling Requirements**:
- Consistent error response format
- Proper HTTP status codes
- Client-friendly error messages
- Internal error logging
- Error recovery mechanisms
- Graceful degradation

**Error Response Format**:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "The provided task data is invalid",
    "details": {
      "field": "due_date",
      "reason": "Date format must be ISO 8601"
    },
    "timestamp": "2025-08-18T10:00:00Z",
    "request_id": "req_123456"
  }
}
```

**Logging Configuration**:
- Log rotation
- Different outputs (file, console)
- Configurable verbosity
- Performance impact monitoring
- Log aggregation ready

**Frontend Error Handling**:
- Global error boundary
- API error interceptors
- User-friendly error messages
- Retry mechanisms
- Offline handling
- Error reporting

**Acceptance Criteria**:
- All errors are logged appropriately
- Error responses are consistent
- Frontend handles all error scenarios
- Log files are manageable
- Performance isn't significantly impacted
- Production debugging is feasible

---

### Task 6.2: Performance Optimization
**Objective**: Optimize application performance for production use
**Context**: Ensure fast response times and efficient resource usage
**Dependencies**: Task 6.1 completed

**Backend Optimizations**:
- Database query optimization
- API response caching
- Background job optimization
- Memory usage optimization
- Connection pooling
- Static file serving

**Database Optimizations**:
- Add necessary indexes
- Optimize query patterns
- Implement query result caching
- Database connection pooling
- Query execution time monitoring

**Caching Strategy**:
- Redis integration (optional)
- In-memory caching for frequent queries
- API response caching
- Static asset caching
- Cache invalidation strategies

**Frontend Optimizations**:
- Code splitting
- Lazy loading
- Image optimization
- Bundle size optimization
- React Query caching optimization
- Virtual scrolling for large lists

**Performance Monitoring**:
- Response time tracking
- Memory usage monitoring
- Database query performance
- API call metrics
- Frontend performance metrics

**Files to Create/Update**:
- `middleware/cache.go`
- `utils/performance.go`
- Update React components for optimization
- Add performance monitoring

**Acceptance Criteria**:
- API response times under 200ms for most endpoints
- Frontend initial load under 3 seconds
- Database queries optimized
- Memory usage is reasonable
- Large lists handle smoothly
- Performance metrics are tracked

---

### Task 6.3: Data Backup & Export System
**Objective**: Implement data backup and export functionality
**Context**: Ensure user data is safe and exportable
**Dependencies**: Task 6.2 completed

**Files to Create**:
- `services/backup.go`
- `handlers/export.go`
- `src/components/Settings/DataManagement.tsx`

**Backup Features**:
- Automatic daily backups
- Manual backup trigger
- Incremental backups
- Backup compression
- Backup retention policies
- Backup integrity verification

**Export Features**:
- Full data export (JSON)
- Selective data export
- CSV exports for specific data types
- Journal entries export (Markdown)
- Task export (various formats)
- Finance data export

**Data Import Features** (Future-proofing):
- Import from backup files
- Data migration utilities
- Duplicate detection on import
- Data validation on import

**API Endpoints**:
- POST /api/backup/create - Create backup
- GET /api/backup/list - List available backups
- GET /api/backup/download/:id - Download backup
- POST /api/export/:type - Export specific data type
- GET /api/export/status/:id - Check export status

**Frontend Features**:
- Settings page for data management
- Backup scheduling interface
- Export options and formats
- Download management
- Import interface (future)

**Security Considerations**:
- Backup encryption
- Secure download links
- Access control
- Data anonymization options

**Acceptance Criteria**:
- Backups create automatically
- Manual backups work correctly
- Exports generate in requested formats
- Downloads are secure
- Data integrity is maintained
- Settings interface is intuitive

---

### Task 6.4: Mobile PWA Enhancement
**Objective**: Enhance mobile experience with PWA features
**Context**: Optimize for mobile usage and add offline capabilities
**Dependencies**: Task 6.3 completed

**Files to Create/Update**:
- `public/manifest.json`
- `public/sw.js` (Service Worker)
- `src/hooks/useOffline.ts`
- Update `public/index.html`

**PWA Features**:
- Installable app
- Offline functionality
- Push notifications (future)
- Background sync
- App-like navigation
- Splash screen

**Offline Capabilities**:
- Cache journal entries for offline writing
- Cache task data for offline viewing
- Queue actions for when online
- Offline indicator
- Sync when connection restored

**Mobile Optimizations**:
- Touch-friendly interface
- Swipe gestures
- Mobile-optimized forms
- Thumb-friendly navigation
- Haptic feedback (where supported)

**Service Worker Features**:
- Cache strategy implementation
- Background sync for journal entries
- Update notifications
- Offline page handling
- Resource caching

**Mobile UI Enhancements**:
- Bottom navigation for mobile
- Pull-to-refresh functionality
- Infinite scroll optimizations
- Mobile-specific modals/sheets
- Gesture controls

**Manifest Configuration**:
```json
{
  "name": "Ziggy Personal Assistant",
  "short_name": "Ziggy",
  "description": "Your personal AI-powered task and life management assistant",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#FFFFFF",
  "icons": [
    // Various sizes
  ]
}
```

**Acceptance Criteria**:
- App is installable on mobile devices
- Offline functionality works correctly
- Mobile interface is fully optimized
- PWA features are properly implemented
- Performance on mobile is excellent
- App behaves like a native mobile app

---

### Task 6.5: Production Deployment Setup
**Objective**: Create production deployment configuration
**Context**: Deploy to home server with proper configuration
**Dependencies**: Task 6.4 completed

**Files to Create**:
- `Dockerfile` (backend)
- `Dockerfile.frontend`
- `docker-compose.yml`
- `deploy/nginx.conf`
- `deploy/deploy.sh`
- `.env.example`
- `README.md`

**Docker Configuration**:
- Multi-stage build for frontend
- Optimized Go binary build
- Production-ready containers
- Volume mounts for data persistence
- Environment variable configuration

**Docker Compose Services**:
- Ziggy backend service
- Ziggy frontend service (Nginx)
- SQLite volume mount
- Optional Redis cache
- Reverse proxy configuration

**Nginx Configuration**:
- Frontend static file serving
- API proxy to backend
- SSL termination (Let's Encrypt ready)
- Compression and caching
- Security headers

**Deployment Script Features**:
- Automated deployment
- Database migration handling
- Zero-downtime deployment
- Rollback capabilities
- Health checks

**Environment Configuration**:
- Separate configs for dev/prod
- Secure secret management
- Database path configuration
- API key management
- Logging configuration

**Example docker-compose.yml**:
```yaml
version: '3.8'
services:
  ziggy-backend:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      - ENV=production
      - DATABASE_PATH=/app/data/ziggy.db
    
  ziggy-frontend:
    build: -f Dockerfile.frontend .
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - ziggy-backend
```

**Documentation Requirements**:
- Installation instructions
- Configuration guide
- API documentation
- Troubleshooting guide
- Development setup guide

**Acceptance Criteria**:
- Application deploys successfully with Docker
- All services start correctly
- Database persists between restarts
- Nginx serves frontend and proxies API
- Environment variables work properly
- Documentation is comprehensive

---

### Task 6.6: Final Testing & Documentation
**Objective**: Comprehensive testing and complete documentation
**Context**: Ensure production readiness and maintainability
**Dependencies**: Task 6.5 completed

**Testing Requirements**:
- API endpoint testing
- Frontend component testing
- Integration testing
- Performance testing
- Mobile testing
- Cross-browser testing

**Files to Create**:
- `tests/` directory structure
- `docs/` directory with documentation
- `CHANGELOG.md`
- Update `README.md` with complete setup

**Backend Testing**:
- Unit tests for core services
- Integration tests for API endpoints
- Database operation tests
- AI integration tests
- Error handling tests

**Frontend Testing**:
- Component unit tests
- Integration tests
- E2E tests with key user flows
- Mobile responsiveness tests
- Accessibility tests

**Documentation Structure**:
```
docs/
├── installation.md
├── configuration.md
├── api-reference.md
├── user-guide.md
├── development.md
├── troubleshooting.md
├── architecture.md
└── changelog.md
```

**User Guide Sections**:
- Getting started
- Daily usage patterns
- Task management workflows
- List management
- Habit tracking
- Finance tracking
- Weekly reviews
- Tips and best practices

**Developer Documentation**:
- Architecture overview
- API documentation
- Database schema
- AI integration details
- Deployment procedures
- Contributing guidelines

**Final Checklist**:
- [ ] All core features working
- [ ] Mobile experience optimized
- [ ] Performance targets met
- [ ] Security considerations addressed
- [ ] Data backup/export working
- [ ] Documentation complete
- [ ] Deployment tested
- [ ] Error handling comprehensive

**Acceptance Criteria**:
- All tests pass successfully
- Documentation covers all features
- Installation process is smooth
- Performance meets requirements
- Security is properly implemented
- Mobile experience is excellent

---

## IMPLEMENTATION NOTES FOR LLM DEVELOPMENT

### Task Execution Guidelines

**Before Starting Each Task**:
1. Read the task objective and context carefully
2. Check dependencies are completed
3. Review acceptance criteria
4. Understand the deliverables required

**During Task Execution**:
1. Follow the specified file structure
2. Use the provided code templates as starting points
3. Implement error handling for all operations
4. Add appropriate logging and comments
5. Test each component as you build it

**After Completing Each Task**:
1. Verify all acceptance criteria are met
2. Test the functionality thoroughly
3. Update any related documentation
4. Prepare context for the next task

### Code Quality Standards

- Use consistent naming conventions
- Add comprehensive error handling
- Include appropriate logging
- Write clean, readable code
- Add comments for complex logic
- Follow security best practices
- Optimize for performance

### Integration Points

- Always test integration between frontend and backend
- Verify API endpoints work correctly
- Ensure database operations are successful
- Test AI service integration thoroughly
- Validate user interface responsiveness

### Development Environment Setup

```bash
# Backend setup
cd ziggy-backend
go mod init ziggy
go mod tidy
go run main.go

# Frontend setup
cd ziggy-frontend
npm install
npm start

# Test API connectivity
curl http://localhost:8080/health
```

This plan provides a complete roadmap for building Ziggy with LLM assistance. Each task is self-contained, well-specified, and includes all necessary context for successful completion.