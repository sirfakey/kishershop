import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ArrowLeftRight,
  User,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import MegaMenu from "./MegaMenu";
import TradeModal from "../TradeModal";
import NotificationDropdown from "../NotificationDropdown";
import type { ProductGroup } from "../../data/categories";

const NAV_ITEMS = [
  { key: "currency", label: "Currency" },
  { key: "accounts", label: "Accounts" },
  { key: "items", label: "Items" },
  { key: "boosting", label: "Boosting" },
  { key: "gift-cards", label: "Gift Cards" },
];

function IconButton({
  label,
  children,
  onClick,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
    >
      {children}
    </button>
  );
}

export default function MarketplaceHeader() {
  const { siteName, logoUrl } = useSettings();
  const navigate = useNavigate();
  const { isAuthenticated } = useCustomerAuth();

  // ─── Games list (shared by search dropdown + mega menu) ───
  const [games, setGames] = useState<ProductGroup[]>([]);

  // ─── Mega menu state ───
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNav = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveNav(key);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveNav(null), 120);
  };

  const toggleNav = (key: string) => {
    setMobileOpen(false);
    setActiveNav((prev) => (prev === key ? null : key));
  };

  // ─── Mobile drawer ───
  const [mobileOpen, setMobileOpen] = useState(false);

  // ─── Trade modal ───
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  // ─── Notifications dropdown ───
  const [notifOpen, setNotifOpen] = useState(false);
  const notifButtonRef = useRef<HTMLButtonElement>(null);

  // ─── Search bar ───
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: ProductGroup[]) => {
        if (!cancelled) setGames(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setGames([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredGames = searchQuery.trim()
    ? games.filter(
        (g) =>
          g.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          g.slug.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : games;

  return (
    <header
      className="relative sticky top-0 z-50"
      onMouseLeave={scheduleClose}
      onMouseEnter={() => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
      }}
    >
      {/* ─── Row 1 ─── */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4">
          {/* Logo + Site Name (dynamic) */}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5"
            onClick={() => {
              setActiveNav(null);
              setSearchQuery("");
              setSearchOpen(false);
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="h-9 w-9 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-lg font-black text-slate-900">
                {siteName.charAt(0) || "K"}
              </span>
            )}
            <span className="hidden text-lg font-extrabold tracking-tight text-slate-900 sm:block dark:text-white">
              {siteName}
            </span>
          </Link>

          {/* Search bar (functional — filters product groups in a dropdown) */}
          <div ref={searchRef} className="relative flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search games…"
                className="w-full rounded-lg border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
              />
            </div>

            {/* Search results dropdown */}
            {searchOpen && searchQuery.trim() && (
              <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                {filteredGames.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                    No games match "{searchQuery.trim()}".
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto py-1">
                    {filteredGames.slice(0, 10).map((g) => (
                      <Link
                        key={g.id}
                        to={`/category/${g.slug}`}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          setActiveNav(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-amber-500/10 hover:text-amber-400 dark:text-slate-200"
                      >
                        <img
                          src={g.image_url}
                          alt={g.name}
                          className="h-8 w-8 shrink-0 rounded object-cover bg-slate-200 dark:bg-slate-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/64x64?text=" + encodeURIComponent(g.name.slice(0, 2));
                          }}
                        />
                        {g.name}
                      </Link>
                    ))}
                    {filteredGames.length > 10 && (
                      <p className="px-4 py-2 text-xs text-slate-400">
                        +{filteredGames.length - 10} more — refine your search
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Utility icons */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <IconButton
              label="Trade / Exchange"
              onClick={() => setTradeModalOpen(true)}
            >
              <ArrowLeftRight className="h-5 w-5" />
            </IconButton>

            <div className="relative">
              <IconButton
                label="Notifications"
                onClick={() => setNotifOpen((v) => !v)}
              >
                <span
                  ref={notifButtonRef as React.RefObject<HTMLButtonElement>}
                  className="inline-flex"
                >
                  <Bell className="h-5 w-5" />
                </span>
              </IconButton>
              {notifOpen && (
                <NotificationDropdown
                  onClose={() => setNotifOpen(false)}
                  anchorRef={notifButtonRef}
                />
              )}
            </div>
            <IconButton
              label="Account"
              onClick={() => navigate("/account")}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                {isAuthenticated ? (
                  <span className="text-xs font-bold text-amber-400">
                    <User className="h-4 w-4 text-amber-400" />
                  </span>
                ) : (
                  <User className="h-4 w-4" />
                )}
              </span>
            </IconButton>

            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Row 2 ─── */}
      <div className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 max-w-7xl items-center px-4">
          {/* Nav dropdown items (desktop) */}
          <nav className="hidden items-center md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onMouseEnter={() => openNav(item.key)}
                  onClick={() => toggleNav(item.key)}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "text-amber-400"
                      : "text-slate-700 hover:text-amber-400 dark:text-slate-200"
                  }`}
                >
                  {item.label}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isActive ? "rotate-180" : ""}`}
                  />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ─── Mobile drawer ─── */}
      {mobileOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
          <nav className="grid grid-cols-2 gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleNav(item.key)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {item.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ─── Mega menu dropdown ─── */}
      {activeNav && (
        <MegaMenu
          activeType={activeNav}
          games={games}
          onClose={() => setActiveNav(null)}
        />
      )}

      {/* ─── Trade modal ─── */}
      {tradeModalOpen && (
        <TradeModal
          onClose={() => setTradeModalOpen(false)}
          onSuccess={() => {
            setTradeModalOpen(false);
            alert("Trade request submitted! We'll reach out to you soon.");
          }}
        />
      )}
    </header>
  );
}