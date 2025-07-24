import axios, { AxiosInstance, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear invalid token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: {
    timezone: string;
    workingHours: { start: string; end: string };
    defaultTaskDuration: number;
    priorityWeights: { deadline: number; context: number; dependencies: number };
    notifications: { email: boolean; push: boolean; desktop: boolean; reminderMinutes: number };
    ui: { theme: string; language: string; compactView: boolean };
  };
  isEmailVerified: boolean;
  lastLogin: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: number;
  deadline?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  context?: string;
  estimatedTime?: number;
  actualTime?: number;
  tags?: string[];
  dependencies?: string[];
  parentTask?: string;
  userId: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  messageCount: number;
  lastMessageAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  nlpResult?: {
    intent: string;
    confidence: number;
    entities: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
    tasks: Task[];
  };
}

// Auth API calls
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data),

  logout: () =>
    apiClient.post<ApiResponse>('/auth/logout'),

  getProfile: () =>
    apiClient.get<ApiResponse<{ user: User }>>('/auth/profile'),

  updateProfile: (data: Partial<User>) =>
    apiClient.put<ApiResponse<{ user: User }>>('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put<ApiResponse>('/auth/change-password', data),

  deleteAccount: (data: { password: string }) =>
    apiClient.delete<ApiResponse>('/auth/delete-account', { data }),

  refreshToken: () =>
    apiClient.post<ApiResponse<{ token: string }>>('/auth/refresh'),
};

// Task API calls
export const taskApi = {
  getTasks: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }) =>
    apiClient.get<ApiResponse<{ tasks: Task[]; pagination: { total: number; page: number; pages: number } }>>('/tasks', { params }),

  getTask: (id: string) =>
    apiClient.get<ApiResponse<{ task: Task }>>(`/tasks/${id}`),

  createTask: (data: Partial<Task>) =>
    apiClient.post<ApiResponse<{ task: Task }>>('/tasks', data),

  updateTask: (id: string, data: Partial<Task>) =>
    apiClient.put<ApiResponse<{ task: Task }>>(`/tasks/${id}`, data),

  deleteTask: (id: string) =>
    apiClient.delete<ApiResponse>(`/tasks/${id}`),

  bulkUpdate: (data: { taskIds: string[]; updates: Partial<Task> }) =>
    apiClient.patch<ApiResponse<{ updated: number }>>('/tasks/bulk', data),

  getStatistics: () =>
    apiClient.get<ApiResponse<{
      total: number;
      completed: number;
      pending: number;
      inProgress: number;
      overdue: number;
      completionRate: number;
      averageCompletionTime: number;
    }>>('/tasks/stats'),

  getRecommendations: () =>
    apiClient.get<ApiResponse<{ recommendations: Array<{ task: Task; reason: string; score: number }> }>>('/tasks/recommendations'),
};

// Chat API calls
export const chatApi = {
  getConversations: () =>
    apiClient.get<ApiResponse<{ conversations: Conversation[] }>>('/chat/conversations'),

  getConversation: (id: string) =>
    apiClient.get<ApiResponse<{ conversation: Conversation; messages: Message[] }>>(`/chat/conversations/${id}`),

  createConversation: (data: { title?: string }) =>
    apiClient.post<ApiResponse<{ conversation: Conversation }>>('/chat/conversations', data),

  deleteConversation: (id: string) =>
    apiClient.delete<ApiResponse>(`/chat/conversations/${id}`),

  sendMessage: (data: { content: string; conversationId?: string }) =>
    apiClient.post<ApiResponse<{
      message: Message;
      response: Message;
      conversation: Conversation;
      actions?: Array<{
        type: string;
        data: any;
        success: boolean;
        message: string;
      }>;
    }>>('/chat/message', data),

  getHistory: (conversationId?: string) =>
    apiClient.get<ApiResponse<{ messages: Message[] }>>('/chat/history', {
      params: conversationId ? { conversationId } : undefined,
    }),
};

// Utility functions for token management
export const tokenUtils = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },

  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  },

  setUser: (user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(user));
    }
  },

  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  },
};

// Health check
export const healthCheck = () =>
  apiClient.get<ApiResponse>('/health').catch(() => ({ data: { success: false, message: 'Backend unavailable' } })); 