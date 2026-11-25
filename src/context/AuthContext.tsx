"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getToken, getUserId, refreshSession, removeToken, saveRefreshToken, saveToken, saveUserId } from "@/lib/auth";

interface AuthState {
  token: string | null;
  userId: string | null;
  ready: boolean;
  login: (token: string, userId: string, refreshToken?: string) => void;
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
    let cancelled = false;

    // On open: renew the session first if the access token has expired or is about to.
    refreshSession().then((fresh) => {
      if (cancelled) return;
      setToken(fresh);
      setUserId(fresh ? getUserId() : null);
      setReady(true);
    });

    // While the app is open, keep the token fresh, and check again when the user returns to the tab.
    const renew = () => {
      refreshSession().then((fresh) => {
        if (cancelled) return;
        setToken(fresh);
        if (!fresh) setUserId(null);
      });
    };
    const interval = window.setInterval(renew, 4 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") renew(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const login = useCallback((newToken: string, newUserId: string, refreshToken?: string) => {
    saveToken(newToken);
    if (refreshToken) saveRefreshToken(refreshToken);
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
