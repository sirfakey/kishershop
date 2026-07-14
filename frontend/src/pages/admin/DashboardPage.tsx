import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiJson } from "../../lib/api";
import { DollarSign, ShoppingCart, AlertTriangle, ArrowLeftRight } from "lucide-react";
import type { Trade } from "../../data/categories";

interface Stats {
  total_sales: number;
  total_revenue: number;
  unfulfilled_orders: number;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [latestTrades, setLatestTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  useEffect(() => {
    apiJson<Stats>("/api/admin/stats", token)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats"))
      .finally(() => setLoading(false));

    apiJson<Trade[]>("/api/admin/trades", token)
      .then((trades) => setLatestTrades(trades.slice(0, 3)))
      .catch(() => setLatestTrades([]))
      .finally(() => setTradesLoading(false));
  }, [token]);

  // ── Sorting ──
  const handleSort = useCallback((column: string) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else if (sortDirection === "desc") {
      setSortColumn(null);
      setSortDirection(null);
    }
  }, [sortColumn, sortDirection]);

  const sortedTrades = useMemo(() => {
    if (!sortColumn || !sortDirection) return latestTrades;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...latestTrades].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortColumn) {
        case "email":
          valA = (a.email ?? "").toLowerCase();
          valB = (b.email ?? "").toLowerCase();
          break;
        case "whatsapp":
          valA = (a.whatsapp_number ?? "").toLowerCase();
          valB = (b.whatsapp_number ?? "").toLowerCase();
          break;
        case "description":
          valA = (a.description ?? "").toLowerCase();
          valB = (b.description ?? "").toLowerCase();
          break;
        case "status":
          valA = a.status.toLowerCase();
          valB = b.status.toLowerCase();
          break;
        case "date":
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }, [latestTrades, sortColumn, sortDirection]);

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading store stats...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
        {error}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Sales",
      value: stats?.total_sales ?? 0,
      icon: ShoppingCart,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Total Revenue",
      value: `৳${(stats?.total_revenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "Pending Orders",
      value: stats?.unfulfilled_orders ?? 0,
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`rounded-xl border p-5 ${bg}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {label}
              </p>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`mt-3 text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {stats && stats.total_sales === 0 && stats.unfulfilled_orders === 0 && (
        <p className="mt-6 text-sm text-slate-600">
          No sales yet. This dashboard will populate as orders arrive.
        </p>
      )}

      {/* ── Latest Trade Requests ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Latest Trade Requests</h3>
          </div>
          <Link
            to="/admin/trades"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all →
          </Link>
        </div>

        {tradesLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : latestTrades.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-8 text-center">
            <ArrowLeftRight className="mx-auto h-6 w-6 text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">No trade requests yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {([
                    ["email", "Email"],
                    ["whatsapp", "WhatsApp"],
                    ["description", "Description"],
                    ["status", "Status"],
                    ["date", "Date"],
                  ] as const).map(([key, label]) => {
                    const isActive = sortColumn === key;
                    const arrow =
                      !isActive ? "↕" : sortDirection === "asc" ? "▲" : "▼";
                    return (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className={`px-4 py-3 cursor-pointer select-none hover:bg-slate-800/50 transition-colors ${
                          isActive ? "text-indigo-400" : "text-slate-500"
                        }`}
                      >
                        {label}{" "}
                        <span className={isActive ? "text-indigo-400" : "text-slate-600"}>
                          {arrow}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sortedTrades.map((trade) => (
                  <tr key={trade.id} className="text-slate-300">
                    <td className="px-4 py-3 text-xs">
                      {trade.email || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {trade.whatsapp_number}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[180px] truncate">
                      {trade.description}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          trade.status === "pending"
                            ? "bg-amber-500/10 text-amber-400"
                            : trade.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}