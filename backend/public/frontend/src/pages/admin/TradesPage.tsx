import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson } from "../../lib/api";
import type { Trade } from "../../data/categories";
import { ArrowLeftRight } from "lucide-react";

const STATUS_OPTIONS = ["pending", "reviewed", "completed", "declined"] as const;

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    reviewed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    declined: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
        colors[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20"
      }`}
    >
      {status}
    </span>
  );
}

export default function TradesPage() {
  const { token } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrades = () => {
    apiJson<Trade[]>("/api/admin/trades", token)
      .then(setTrades)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load trades"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrades();
  }, [token]);

  const updateStatus = async (id: number, status: Trade["status"]) => {
    try {
      await apiJson(`/api/admin/trades/${id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTrades((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading trade requests...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight className="h-6 w-6 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Trade Requests</h2>
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
          <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">No trade requests yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {trades.map((trade) => (
                <tr key={trade.id} className="text-slate-300 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500">#{trade.id}</td>
                  <td className="px-4 py-3 text-xs">
                    {trade.email || <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{trade.whatsapp_number}</td>
                  <td className="px-4 py-3 text-xs max-w-[200px] truncate">
                    {trade.description}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={trade.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(trade.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={trade.status}
                      onChange={(e) => updateStatus(trade.id, e.target.value as Trade["status"])}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-white outline-none focus:border-indigo-500"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
