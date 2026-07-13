import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { CustomerUser } from "../data/categories";
import { apiJson } from "../lib/api";

interface CustomerAuthContextValue {
  token: string | null;
  user: CustomerUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

const STORAGE_TOKEN_KEY = "kishershop_customer_token";
const STORAGE_USER_KEY = "kishershop_customer_user";

function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
}

function getStoredUser(): CustomerUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? (JSON.parse(raw) as CustomerUser) : null;
  } catch {
    return null;
  }
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<CustomerUser | null>(getStoredUser);
  const [loading, setLoading] = useState(true);

  // Validate stored token on mount
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    apiJson<CustomerUser>("/api/user", stored)
      .then((data) => {
        setToken(stored);
        setUser(data);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const storeAuth = useCallback((newToken: string, newUser: CustomerUser) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiJson<{ message: string; token: string; user: CustomerUser }>(
      "/api/login",
      null,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );

    if (!data.token || !data.user) {
      throw new Error("Login failed: incomplete response from server.");
    }

    storeAuth(data.token, data.user);
  }, [storeAuth]);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<string> => {
      const data = await apiJson<{ message: string; email: string }>(
        "/api/register",
        null,
        {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        },
      );

      if (!data.email) {
        throw new Error("Registration failed: incomplete response from server.");
      }

      return data.email;
    },
    [],
  );

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const data = await apiJson<{ message: string; token: string; user: CustomerUser }>(
      "/api/verify-email",
      null,
      {
        method: "POST",
        body: JSON.stringify({ email, code }),
      },
    );

    if (!data.token || !data.user) {
      throw new Error("Verification failed: incomplete response from server.");
    }

    storeAuth(data.token, data.user);
  }, [storeAuth]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiJson("/api/logout", token, { method: "POST" });
      }
    } catch {
      // Even if the request fails, clear local state
    }
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiJson<CustomerUser>("/api/user", token);
      setUser(data);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data));
    } catch {
      // Silently fail — user state stays as-is
    }
  }, [token]);

  return (
    <CustomerAuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        verifyEmail,
        logout,
        refreshUser,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
