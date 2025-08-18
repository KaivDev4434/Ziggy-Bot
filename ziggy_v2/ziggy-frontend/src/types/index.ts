// Core types for the Ziggy AI Assistant frontend

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export interface JournalEntry {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  processed: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'inbox' | 'next_action' | 'waiting' | 'someday_maybe' | 'done';
  priority: 1 | 2 | 3; // 1=high, 2=medium, 3=low
  context: string; // @home, @office, @errands
  project_name: string;
  do_date?: string;
  due_date?: string;
  energy: 'high' | 'medium' | 'low';
  tags: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface List {
  id: number;
  name: string;
  type: 'movies' | 'books' | 'grocery' | 'custom';
  created_at: string;
  items: ListItem[];
}

export interface ListItem {
  id: number;
  list_id: number;
  content: string;
  metadata: string; // JSON string
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
}

export interface Habit {
  id: number;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target: number;
  active: boolean;
  created_at: string;
  records: HabitRecord[];
}

export interface HabitRecord {
  id: number;
  habit_id: number;
  date: string;
  completed: boolean;
  notes: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  message: string;
}

// Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Development configuration
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
