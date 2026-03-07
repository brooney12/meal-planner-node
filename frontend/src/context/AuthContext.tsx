// src/context/AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { authApi } from "../services/api";

interface AuthUser {
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const username = localStorage.getItem("mp_username");
    return authApi.isLoggedIn() && username ? { username } : null;
  });

  const login = async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    setUser({ username: data.username });
  };

  const register = async (username: string, email: string, password: string) => {
    const data = await authApi.register(username, email, password);
    setUser({ username: data.username });
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
