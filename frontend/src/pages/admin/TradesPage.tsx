import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson } from "../../lib/api";
import type { Trade } from "../../data/categories";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

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
  const [updateError, setUpdateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Trade | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

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
      setUpdateError(err instanceof Error ? err.message : "Failed to update status.");
      setTimeout(() => setUpdateError(""), 3000);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiJson(`/api/admin/trades/${deleteTarget.id}`, token, {
        method: "DELETE",
      });
      setTrades((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Delete failed");
      setTimeout(() => setUpdateError(""), 3000);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

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
    if (!sortColumn || !sortDirection) return trades;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...trades].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortColumn) {
        case "id":
          valA = a.id;
          valB = b.id;
          break;
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
  }, [trades, sortColumn, sortDirection]);

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

      {updateError && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm text-rose-400">
          {updateError}
        </div>
      )}

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
                {([
                  ["id", "ID"],
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
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedTrades.map((trade) => (
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
                    <div className="flex items-center gap-2">
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
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(trade)}
                        className="rounded-lg p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete trade request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Trade Request"
        message={`Are you sure you want to permanently delete trade request #${deleteTarget?.id}? This action cannot be undone.`}
        confirmLabel={deletingId ? "Deleting..." : "Delete Permanently"}
        variant="danger"
        loading={deletingId !== null}
      />
    </div>
  );
}
