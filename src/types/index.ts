// ============================================================
// Shared TypeScript types for the Ziggy application
// Used across API routes, components, and services
// ============================================================

// --- Messages ---
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  date: Date | string;
  createdAt: Date | string;
}

// --- Todos ---
export type TodoStatus = "pending" | "done";
export type TodoPriority = 1 | 2 | 3;

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority | null;
  dueDate: Date | string | null;
  doDate: Date | string | null;
  category: string | null;
  createdAt: Date | string;
  completedAt: Date | string | null;
}

// Subset used for creating a new todo
export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: TodoPriority;
  dueDate?: string;
  doDate?: string;
  category?: string;
}

// Subset used for updating a todo
export interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  priority?: TodoPriority | null;
  dueDate?: string | null;
  doDate?: string | null;
  category?: string | null;
  status?: TodoStatus;
}

// --- Habits ---
export interface Habit {
  id: string;
  name: string;
  frequency: string;
  active: boolean;
  createdAt: Date | string;
  records: HabitRecord[];
}

export interface HabitRecord {
  id: string;
  habitId: string;
  date: Date | string;
  completed: boolean;
}

export interface CreateHabitInput {
  name: string;
  frequency?: string;
}

// --- Landmarks ---
export interface Landmark {
  id: string;
  title: string;
  date: Date | string;
  notes: string | null;
  createdAt: Date | string;
}

// --- Dashboard ---
export interface DashboardData {
  stats: {
    todayTodos: number;
    completedToday: number;
    pendingTotal: number;
    overdue: number;
    habitCompletionRate: number;
  };
  habits: {
    streaks: {
      name: string;
      streak: number;
      completedToday: boolean;
    }[];
  };
  deadlines: {
    title: string;
    dueDate: string;
    daysLeft: number;
    category: string | null;
  }[];
  landmarks: {
    id: string;
    title: string;
    date: string;
    notes: string | null;
  }[];
}

// --- Chat API ---
export interface ChatRequest {
  message: string;
  date?: string;
  location?: LocationInfo;
}

export interface ChatResponse {
  userMessage: Message;
  assistantMessage: Message;
  extractions: {
    todosCreated: number;
    todosUpdated: number;
    todosCompleted: number;
    todosDeleted: number;
    habits: number;
    landmarks: number;
  };
}

// --- Location ---
export interface LocationInfo {
  lat?: number;
  lon?: number;
  city?: string;
  country?: string;
}

// --- AI Extractions ---
export type TodoAction = "create" | "update" | "complete" | "delete";

export interface ExtractedTodo {
  action: TodoAction;
  id?: string;
  title: string;
  description?: string;
  priority?: number;
  dueDate?: string;
  doDate?: string;
  category?: string;
}

export interface ExtractedHabit {
  name: string;
  frequency: string;
}

export interface ExtractedLandmark {
  title: string;
  date: string;
  notes?: string;
}

export interface AIExtractions {
  todos: ExtractedTodo[];
  habits: ExtractedHabit[];
  landmarks: ExtractedLandmark[];
  conversationalResponse: string;
}

// --- AI Context ---
export interface AIContext {
  currentDateTime: string;
  timezone: string;
  location?: LocationInfo;
  pendingTodos: {
    id: string;
    title: string;
    category?: string | null;
    priority?: number | null;
    dueDate?: string | null;
    doDate?: string | null;
  }[];
  todayHabits: {
    name: string;
    completedToday: boolean;
    streak: number;
  }[];
  upcomingDeadlines: {
    title: string;
    dueDate: string;
    daysLeft: number;
  }[];
}
