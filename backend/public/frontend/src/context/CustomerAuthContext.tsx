import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { CustomerUser } from "../data/categories";

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
    fetch(`/api/user`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Token invalid");
        return res.json();
      })
      .then((data: CustomerUser) => {
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
    const response = await fetch(`/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let message = `Login failed (${response.status})`;
      try {
        const err = await response.json();
        if (err.message) message = err.message;
      } catch {
        // stick with status-based message
      }
      throw new Error(message);
    }

    const data = await response.json();

    if (!data.token || !data.user) {
      throw new Error("Login failed: incomplete response from server.");
    }

    storeAuth(data.token, data.user);
  }, [storeAuth]);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<string> => {
      const response = await fetch(`/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        let message = `Registration failed (${response.status})`;
        try {
          const err = await response.json();
          if (err.message) message = err.message;
          if (err.errors) {
            const msgs = Object.values(err.errors).flat().join("; ");
            if (msgs) message = msgs;
          }
        } catch {
          // stick with status-based message
        }
        throw new Error(message);
      }

      const data = await response.json();

      // Registration no longer returns a token — user must verify email first
      if (!data.email) {
        throw new Error("Registration failed: incomplete response from server.");
      }

      return data.email;
    },
    [],
  );

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const response = await fetch(`/api/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      let message = `Verification failed (${response.status})`;
      try {
        const err = await response.json();
        if (err.message) message = err.message;
        if (err.errors) {
          const msgs = Object.values(err.errors).flat().join("; ");
          if (msgs) message = msgs;
        }
      } catch {
        // stick with status-based message
      }
      throw new Error(message);
    }

    const data = await response.json();

    if (!data.token || !data.user) {
      throw new Error("Verification failed: incomplete response from server.");
    }

    storeAuth(data.token, data.user);
  }, [storeAuth]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`/api/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
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
      const response = await fetch(`/api/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data: CustomerUser = await response.json();
        setUser(data);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data));
      }
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
