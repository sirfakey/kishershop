import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import type { Product, ProductGroup } from "../../data/categories";

interface MegaMenuProps {
  /** The product type that triggered this menu (e.g. "items", "accounts"). */
  activeType: string | null;
  /** All game categories with their products (eager-loaded from the backend). */
  games: ProductGroup[];
  onClose: () => void;
}

const POPULAR_COUNT = 8;

function GameRow({
  game,
  activeType,
  onClick,
}: {
  game: ProductGroup;
  activeType: string | null;
  onClick: () => void;
}) {
  const to = activeType ? `/category/${game.slug}?type=${activeType}` : `/category/${game.slug}`;
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-amber-500/10 group"
    >
      <img
        src={game.image_url}
        alt={game.name}
        className="h-12 w-12 shrink-0 rounded-lg object-cover bg-slate-200 dark:bg-slate-700"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "https://placehold.co/72x72?text=" + encodeURIComponent(game.name.slice(0, 2));
        }}
      />
      <span className="truncate text-sm font-medium text-slate-700 group-hover:text-amber-400 dark:text-slate-200">
        {game.name}
      </span>
    </Link>
  );
}

/** Return the distinct product types that appear in at least one of the
 *  game's products. */
function gameTypes(game: ProductGroup): Set<string> {
  if (!game.products || !Array.isArray(game.products)) return new Set();
  const types = new Set<string>();
  for (const p of game.products as Product[]) {
    if (p.type) types.add(p.type);
  }
  return types;
}

export default function MegaMenu({ activeType, games, onClose }: MegaMenuProps) {
  const [query, setQuery] = useState("");

  // Only show games that carry at least one product of the active type.
  // If no activeType filter is set, show all games.
  const eligible = useMemo(() => {
    if (!activeType) return games;
    return games.filter((g) => gameTypes(g).has(activeType));
  }, [games, activeType]);

  const popular = useMemo(() => eligible.slice(0, POPULAR_COUNT), [eligible]);

  const allGames = useMemo(() => {
    const sorted = [...eligible].sort((a, b) => a.name.localeCompare(b.name));
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();
    return sorted.filter((g) => g.name.toLowerCase().includes(q));
  }, [eligible, query]);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute left-1/2 top-full z-50 w-[min(960px,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl shadow-black/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-black/40"
    >
      {/* Gradient header row */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-purple-500 to-amber-500 opacity-60" />

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Column 1 — Popular Games */}
        <div className="border-b border-slate-200 p-5 md:border-b-0 md:border-r dark:border-slate-800">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400">
            Popular Games
          </h3>
          {eligible.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              No games carry {activeType?.replace("-", " ")} products yet.
            </p>
          ) : popular.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Loading…
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {popular.map((g) => (
                <Link
                  key={g.id}
                  to={activeType ? `/category/${g.slug}?type=${activeType}` : `/category/${g.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-amber-500/10 group"
                >
                  <img
                    src={g.image_url}
                    alt={g.name}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover bg-slate-200 dark:bg-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/96x96?text=" + encodeURIComponent(g.name.slice(0, 2));
                    }}
                  />
                  <span className="truncate text-sm font-semibold text-slate-700 group-hover:text-amber-400 dark:text-slate-200">
                    {g.name}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {eligible.length > 0 && (
            <Link
              to={activeType ? `/search?type=${activeType}` : "/category"}
              onClick={onClose}
              className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-amber-500/30 hover:text-amber-400 dark:border-slate-800 dark:text-slate-400"
            >
              Browse All
              <span className="text-[10px]">→</span>
            </Link>
          )}
        </div>

        {/* Column 2 — All Games (with search) */}
        <div className="flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400">
              All Games
            </h3>
            {activeType && (
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {activeType.replace("-", " ")}
              </span>
            )}
          </div>

          {/* Nested search input */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for game"
              className="w-full rounded-lg border border-slate-300 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
            />
          </div>

          {/* Scrollable alphabetical list */}
          <div className="max-h-80 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {allGames.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                {eligible.length === 0
                  ? `No games carry ${activeType?.replace("-", " ")} products yet.`
                  : `No games match "${query}".`}
              </p>
            ) : (
              allGames.map((g) => (
                <GameRow key={g.id} game={g} activeType={activeType} onClick={onClose} />
              ))
            )}
          </div>

          {eligible.length > 0 && (
            <Link
              to={activeType ? `/search?type=${activeType}` : "/category"}
              onClick={onClose}
              className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-amber-500/30 hover:text-amber-400 dark:border-slate-800 dark:text-slate-400"
            >
              Browse All
              <span className="text-[10px]">→</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}