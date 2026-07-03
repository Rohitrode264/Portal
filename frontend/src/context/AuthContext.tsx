import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type User = {
  cpId: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'ASSISTANT';
  email?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('portal_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('portal_token'));

  const login = (newUser: User, newToken: string, refreshToken?: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('portal_user', JSON.stringify(newUser));
    localStorage.setItem('portal_token', newToken);
    if (refreshToken) {
      localStorage.setItem('portal_refresh_token', refreshToken);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('portal_user');
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_refresh_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
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
