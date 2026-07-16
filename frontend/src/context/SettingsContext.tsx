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
const DEFAULTS: SiteSettings = { siteName: "Kisher.Shop", logoUrl: null };

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

  // Keep the browser tab icon (favicon) in sync with the admin-set logo.
  // index.html ships a static /favicon.svg fallback for first paint (before
  // JS loads); once settings resolve we swap the icon link to the logo URL.
  // The type attribute is removed so the browser sniffs the actual image
  // format (uploads may be PNG/JPG, not necessarily SVG).
  useEffect(() => {
    if (!settings.logoUrl) return;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.logoUrl;
    link.removeAttribute("type");
  }, [settings.logoUrl]);

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
