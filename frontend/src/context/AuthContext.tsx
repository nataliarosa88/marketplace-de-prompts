"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { login as loginApi, logout as logoutApi, register as registerApi } from "@/data/authApi";
import { AuthUser, getToken, getUser } from "@/data/authStore";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => (typeof window === "undefined" ? null : getUser()));
  const [token, setToken] = useState<string | null>(() => (typeof window === "undefined" ? null : getToken()));

  async function login(email: string, password: string) {
    const u = await loginApi(email, password);
    setUser(u);
    setToken(getToken());
  }

  async function register(email: string, password: string) {
    const u = await registerApi(email, password);
    setUser(u);
    setToken(getToken());
  }

  function logout() {
    logoutApi();
    setUser(null);
    setToken(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAdmin: !!user?.roles?.includes("ADMIN"),
      login,
      register,
      logout,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

