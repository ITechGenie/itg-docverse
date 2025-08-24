import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api-client';
import type { User, AuthContext } from '@/types';

interface AuthStore extends AuthContext {
  initialize: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      initialize: async () => {
        const token = localStorage.getItem('auth-token');
        const userData = localStorage.getItem('auth-user');
        
        if (token && userData) {
          try {
            const user = JSON.parse(userData);
            set({ token, user, isAuthenticated: true });
            
            // Verify token is still valid by fetching fresh user data
            await get().fetchUser();
          } catch (error) {
            console.error('Failed to parse stored user data:', error);
            localStorage.removeItem('auth-token');
            localStorage.removeItem('auth-user');
            set({ token: null, user: null, isAuthenticated: false });
          }
        } else {
          // Try to get user data from API (this will provide initial JWT)
          await get().fetchUser();
        }
      },

      fetchUser: async () => {
        try {
          const response = await api.getCurrentUser();
          if (response.success && response.data) {
            const { token, ...user } = response.data;
            if (token) {
              localStorage.setItem('auth-token', token);
              localStorage.setItem('auth-user', JSON.stringify(user));
              set({ token, user, isAuthenticated: true });
            }
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
        }
      },

      login: (token: string, user: User) => {
        localStorage.setItem('auth-token', token);
        localStorage.setItem('auth-user', JSON.stringify(user));
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          localStorage.setItem('auth-user', JSON.stringify(updatedUser));
          set({ user: updatedUser });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
