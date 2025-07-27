import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ApiClient } from '../lib/api-client';
import type { User } from '../types';

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'itg_docverse_token';
const USER_STORAGE_KEY = 'itg_docverse_user';

// Create API client instance
const apiClient = new ApiClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        
        if (storedToken && storedUser) {
          // Check if token is expired (for real tokens)
          try {
            const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (tokenPayload.exp && tokenPayload.exp > currentTime) {
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
              
              // Try to refresh user data from API
              const userResponse = await apiClient.getCurrentUser();
              if (userResponse.success && userResponse.data) {
                setUser(userResponse.data);
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userResponse.data));
              }
            } else {
              // Token expired, clear storage
              localStorage.removeItem(TOKEN_STORAGE_KEY);
              localStorage.removeItem(USER_STORAGE_KEY);
            }
          } catch (error) {
            // For mock tokens or invalid tokens, still load but verify with API
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear corrupted data
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.login(username, password);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Login failed');
      }

      const { token: authToken, user: userData } = response.data;

      // Store in state
      setToken(authToken);
      setUser(userData);

      // Store in localStorage
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const refreshToken = async () => {
    try {
      // Try to get fresh user data
      const userResponse = await apiClient.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userResponse.data));
      } else {
        throw new Error('Failed to refresh user data');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
