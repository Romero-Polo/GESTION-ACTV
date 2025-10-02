import { useState, useEffect, useCallback } from 'react';

export interface User {
  id: number;
  email: string;
  nombre: string;
  rol: 'operario' | 'jefe_equipo' | 'tecnico_transporte' | 'administrador';
  activo: boolean;
  fechaCreacion: string;
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('auth_token'),
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false
      }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState(prev => ({
          ...prev,
          user: data.user,
          token: token,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        setAuthState(prev => ({
          ...prev,
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Invalid or expired token'
        }));
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication check failed'
      }));
    }
  }, []);

  const login = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Azure AD login
        window.location.href = data.authUrl;
      } else {
        const errorData = await response.json();
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorData.message || 'Login failed'
        }));
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = authState.token;

      if (token) {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            redirectUri: window.location.origin
          }),
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          // Redirect to Azure AD logout
          window.location.href = data.logoutUrl;
        }
      }

      // Clear local state regardless of API call success
      localStorage.removeItem('auth_token');
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if logout API fails
      localStorage.removeItem('auth_token');
      setAuthState(prev => ({
        ...prev,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null
      }));
    }
  }, [authState.token]);

  const setToken = useCallback((token: string) => {
    localStorage.setItem('auth_token', token);
    setAuthState(prev => ({
      ...prev,
      token: token
    }));
    // Check auth status with new token
    checkAuthStatus();
  }, [checkAuthStatus]);

  const hasRole = useCallback((roles: string[]): boolean => {
    if (!authState.user) return false;
    return roles.includes(authState.user.rol);
  }, [authState.user]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user) return false;
    return authState.user.permissions.includes(permission);
  }, [authState.user]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    logout,
    setToken,
    checkAuthStatus,
    hasRole,
    hasPermission,
    clearError
  };
};
