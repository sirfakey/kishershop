import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiJson } from "../lib/api";

interface AdminUser {
  id: number;
  name: string;
  email: string;
}

interface AuthContextValue {
  token: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "kishershop_admin_token";
const USER_KEY = "kishershop_admin_user";

function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function getStoredUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<AdminUser | null>(getStoredUser);
  const [loading, setLoading] = useState(true);

  // Validate stored token on mount
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    // Quick validation: try a lightweight authenticated request
    apiJson("/api/admin/stats", stored)
      .then(() => {
        setToken(stored);
        setUser(getStoredUser());
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiJson<{ token: string; user: AdminUser }>(
      "/api/admin/login",
      null,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );

    if (!data.token || !data.user) {
      throw new Error("Login failed: incomplete response from server.");
    }

    localStorage.setItem(STORAGE_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiJson("/api/admin/logout", token, { method: "POST" });
      }
    } catch {
      // Even if the request fails, clear local state
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}