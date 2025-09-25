import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthState, User } from '../hooks/useAuth';

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
  checkAuthStatus: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
};