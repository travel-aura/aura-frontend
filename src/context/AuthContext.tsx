"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getToken, getUserId, removeToken, saveToken, saveUserId } from "@/lib/auth";

interface AuthState {
  token: string | null;
  userId: string | null;
  ready: boolean;
  login: (token: string, userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  userId: null,
  ready: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(getToken());
    setUserId(getUserId());
    setReady(true);
  }, []);

  const login = useCallback((newToken: string, newUserId: string) => {
    saveToken(newToken);
    saveUserId(newUserId);
    setToken(newToken);
    setUserId(newUserId);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    localStorage.removeItem("aura_user_id");
    setToken(null);
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, userId, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
