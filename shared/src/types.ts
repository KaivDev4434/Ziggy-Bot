import { z } from 'zod';

// Task-related types
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM = 5,
  HIGH = 8,
  URGENT = 10
}

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.number().min(1).max(10),
  deadline: z.date().optional(),
  status: z.nativeEnum(TaskStatus),
  context: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  estimatedTime: z.number().min(0).optional(), // in minutes
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string()
});

export type Task = z.infer<typeof TaskSchema>;

// User-related types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  preferences: z.object({
    timezone: z.string().default('UTC'),
    workingHours: z.object({
      start: z.string().default('09:00'),
      end: z.string().default('17:00')
    }),
    defaultTaskDuration: z.number().min(5).max(480).default(30), // in minutes
    priorityWeights: z.object({
      deadline: z.number().min(0).max(1).default(0.4),
      context: z.number().min(0).max(1).default(0.3),
      dependencies: z.number().min(0).max(1).default(0.3)
    })
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type User = z.infer<typeof UserSchema>;

// Chat/Message types
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export const MessageSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(MessageRole),
  content: z.string(),
  timestamp: z.date(),
  userId: z.string(),
  conversationId: z.string(),
  metadata: z.object({
    taskIds: z.array(z.string()).optional(),
    aiService: z.enum(['perplexity', 'local-llm']).optional(),
    processingTime: z.number().optional()
  }).optional()
});

export type Message = z.infer<typeof MessageSchema>;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// NLP Processing types
export interface TaskExtraction {
  intent: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'QUERY_TASK' | 'UNKNOWN';
  entities: {
    action?: string;
    target?: string;
    deadline?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    estimatedTime?: number;
    context?: string;
  };
  confidence: number;
}

// AI Service types
export interface AIServiceResponse {
  content: string;
  taskExtraction?: TaskExtraction;
  suggestions?: string[];
  confidence: number;
  service: 'perplexity' | 'local-llm';
} 