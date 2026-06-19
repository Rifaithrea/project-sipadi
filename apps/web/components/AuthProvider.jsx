"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const token = localStorage.getItem("sipadi_token");
      const cachedUser = localStorage.getItem("sipadi_user");

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }

      try {
        const result = await apiFetch("/auth/me");
        if (!active) return;
        setUser(result.user);
        localStorage.setItem("sipadi_user", JSON.stringify(result.user));
      } catch (error) {
        localStorage.removeItem("sipadi_token");
        localStorage.removeItem("sipadi_user");
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function login(identifier, password) {
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    });
    localStorage.setItem("sipadi_token", result.token);
    localStorage.setItem("sipadi_user", JSON.stringify(result.user));
    setUser(result.user);
    return result.user;
  }

  function logout() {
    localStorage.removeItem("sipadi_token");
    localStorage.removeItem("sipadi_user");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      hasRole: (...roles) => Boolean(user && roles.includes(user.role))
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return value;
}
