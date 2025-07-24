import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, tokenUtils, User } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await authApi.login({ email, password });
          const { user, token } = response.data.data!;
          
          tokenUtils.setToken(token);
          tokenUtils.setUser(user);
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Login failed'
          });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await authApi.register({ name, email, password });
          const { user, token } = response.data.data!;
          
          tokenUtils.setToken(token);
          tokenUtils.setUser(user);
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Registration failed'
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          
          // Call logout API (optional - token cleanup)
          try {
            await authApi.logout();
          } catch (error) {
            // Logout API call failed, but we still want to clear local state
            console.warn('Logout API call failed:', error);
          }
          
          tokenUtils.removeToken();
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Logout failed'
          });
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await authApi.updateProfile(data);
          const { user } = response.data.data!;
          
          tokenUtils.setUser(user);
          
          set({ 
            user, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Profile update failed'
          });
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        try {
          set({ isLoading: true, error: null });
          
          await authApi.changePassword({ currentPassword, newPassword });
          
          set({ 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Password change failed'
          });
          throw error;
        }
      },

      deleteAccount: async (password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          await authApi.deleteAccount({ password });
          
          tokenUtils.removeToken();
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'Account deletion failed'
          });
          throw error;
        }
      },

      checkAuth: async () => {
        // Skip token check on server-side to prevent hydration issues
        if (typeof window === 'undefined') {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
          return;
        }

        const token = tokenUtils.getToken();
        const savedUser = tokenUtils.getUser();
        
        if (!token || !savedUser) {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
          return;
        }

        try {
          set({ isLoading: true, error: null });
          
          // Verify token is still valid by fetching user profile
          const response = await authApi.getProfile();
          const { user } = response.data.data!;
          
          tokenUtils.setUser(user);
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          // Token is invalid, clear auth state
          tokenUtils.removeToken();
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
        }
      },

      clearError: () => set({ error: null }),
      
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
      // Only persist on client-side
      storage: typeof window !== 'undefined' ? {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      } : undefined,
    }
  )
); 