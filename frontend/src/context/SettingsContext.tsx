import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiJson } from "../lib/api";

interface SiteSettings {
  siteName: string;
  logoUrl: string | null;
}

interface SettingsContextValue extends SiteSettings {
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const STORAGE_KEY = "kishershop_settings";

// Fallbacks shown while the API call is in flight or if it fails, so the
// header always has something to render.
const DEFAULTS: SiteSettings = { siteName: "KisherShop", logoUrl: null };

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as SiteSettings) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiJson<{ site_name?: string; logo_url?: string | null }>(
        "/api/settings",
        null,
      );
      const next: SiteSettings = {
        siteName: data.site_name || DEFAULTS.siteName,
        logoUrl: data.logo_url || null,
      };
      setSettings(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep cached/defaults on failure — never break the header
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider
      value={{
        siteName: settings.siteName,
        logoUrl: settings.logoUrl,
        loading,
        refresh,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
