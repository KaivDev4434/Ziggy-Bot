import { create } from 'zustand';
import { taskApi, Task } from '../lib/api';

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  error: string | null;
  filter: {
    status?: string;
    priority?: number;
    search?: string;
  };
  sort: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  statistics: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
    averageCompletionTime: number;
  } | null;
}

interface TaskActions {
  fetchTasks: () => Promise<void>;
  getTask: (id: string) => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  bulkUpdate: (taskIds: string[], updates: Partial<Task>) => Promise<void>;
  getStatistics: () => Promise<void>;
  setFilter: (filter: Partial<TaskState['filter']>) => void;
  setSort: (field: string, order?: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  clearError: () => void;
  clearCurrentTask: () => void;
}

export const useTaskStore = create<TaskState & TaskActions>((set, get) => ({
  // State
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
  filter: {},
  sort: {
    field: 'priority',
    order: 'desc',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  statistics: null,

  // Actions
  fetchTasks: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { filter, sort, pagination } = get();
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sort.field,
        sortOrder: sort.order,
        ...filter,
      };
      
      const response = await taskApi.getTasks(params);
      const { tasks, pagination: paginationData } = response.data.data!;
      
      set({ 
        tasks,
        pagination: { ...pagination, ...paginationData },
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch tasks'
      });
    }
  },

  getTask: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await taskApi.getTask(id);
      const { task } = response.data.data!;
      
      set({ 
        currentTask: task,
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch task'
      });
    }
  },

  createTask: async (data: Partial<Task>) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await taskApi.createTask(data);
      const { task } = response.data.data!;
      
      // Add new task to the beginning of the list
      const { tasks } = get();
      set({ 
        tasks: [task, ...tasks],
        isLoading: false,
        error: null 
      });
      
      return task;
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to create task'
      });
      throw error;
    }
  },

  updateTask: async (id: string, data: Partial<Task>) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await taskApi.updateTask(id, data);
      const { task } = response.data.data!;
      
      // Update task in the list
      const { tasks, currentTask } = get();
      const updatedTasks = tasks.map(t => t.id === id ? task : t);
      
      set({ 
        tasks: updatedTasks,
        currentTask: currentTask?.id === id ? task : currentTask,
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to update task'
      });
      throw error;
    }
  },

  deleteTask: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await taskApi.deleteTask(id);
      
      // Remove task from the list
      const { tasks, currentTask } = get();
      const filteredTasks = tasks.filter(t => t.id !== id);
      
      set({ 
        tasks: filteredTasks,
        currentTask: currentTask?.id === id ? null : currentTask,
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to delete task'
      });
      throw error;
    }
  },

  bulkUpdate: async (taskIds: string[], updates: Partial<Task>) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await taskApi.bulkUpdate({ taskIds, updates });
      
      // Refresh tasks after bulk update
      await get().fetchTasks();
      
      set({ 
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to update tasks'
      });
      throw error;
    }
  },

  getStatistics: async () => {
    try {
      const response = await taskApi.getStatistics();
      const statistics = response.data.data!;
      
      set({ statistics });
    } catch (error: any) {
      console.warn('Failed to fetch statistics:', error);
    }
  },

  setFilter: (filter: Partial<TaskState['filter']>) => {
    set(state => ({ 
      filter: { ...state.filter, ...filter },
      pagination: { ...state.pagination, page: 1 } // Reset to first page
    }));
    // Auto-fetch with new filter
    setTimeout(() => get().fetchTasks(), 0);
  },

  setSort: (field: string, order?: 'asc' | 'desc') => {
    const currentSort = get().sort;
    const newOrder = order || (currentSort.field === field && currentSort.order === 'asc' ? 'desc' : 'asc');
    
    set({ 
      sort: { field, order: newOrder },
      pagination: { ...get().pagination, page: 1 } // Reset to first page
    });
    // Auto-fetch with new sort
    setTimeout(() => get().fetchTasks(), 0);
  },

  setPage: (page: number) => {
    set(state => ({ 
      pagination: { ...state.pagination, page }
    }));
    // Auto-fetch with new page
    setTimeout(() => get().fetchTasks(), 0);
  },

  clearError: () => set({ error: null }),
  
  clearCurrentTask: () => set({ currentTask: null }),
})); 