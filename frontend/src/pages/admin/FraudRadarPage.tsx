import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson } from "../../lib/api";
import { ShieldBan, ShieldCheck, AlertTriangle, Zap, Clock, UserCheck, UserX, Trash2 } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

interface VelocityFlag {
  level: "high" | "medium";
  type: "hourly_volume" | "daily_volume" | "daily_spend" | "trade_hourly_volume" | "trade_daily_volume";
  message: string;
}

interface UserSummary {
  id: number;
  name: string;
  email: string;
  points: number;
  is_banned: boolean;
  transactions_count: number;
  last_purchase_at: string | null;
  velocity_1h: number;
  velocity_24h: number;
  spend_24h: number;
  velocity_flags: VelocityFlag[];
  trade_count: number;
  trade_velocity_1h: number;
  trade_velocity_24h: number;
  created_at: string;
}

export default function FraudRadarPage() {
  const { token } = useAuth();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  // Confirm modal state
  const [confirmTarget, setConfirmTarget] = useState<{
    user: UserSummary;
    action: "ban" | "unban" | "delete";
  } | null>(null);

  const fetchUsers = () => {
    apiJson<UserSummary[]>("/api/admin/users", token)
      .then(setUsers)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load users"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    const { user, action } = confirmTarget;
    setTogglingId(user.id);
    try {
      if (action === "delete") {
        await apiJson(`/api/admin/users/${user.id}`, token, { method: "DELETE" });
      } else {
        const endpoint =
          action === "ban"
            ? `/api/admin/users/${user.id}/ban`
            : `/api/admin/users/${user.id}/unban`;
        await apiJson(endpoint, token, { method: "POST" });
      }

      // Refresh list
      apiJson<UserSummary[]>("/api/admin/users", token).then(setUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
      setTimeout(() => setError(""), 4000);
    } finally {
      setTogglingId(null);
      setConfirmTarget(null);
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

  const sortedUsers = useMemo(() => {
    if (!sortColumn || !sortDirection) return users;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...users].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortColumn) {
        case "user":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "orders":
          valA = a.transactions_count;
          valB = b.transactions_count;
          break;
        case "velocity":
          valA = a.velocity_flags.length;
          valB = b.velocity_flags.length;
          break;
        case "spend":
          valA = a.spend_24h;
          valB = b.spend_24h;
          break;
        case "trades":
          valA = a.trade_count;
          valB = b.trade_count;
          break;
        case "status":
          valA = a.is_banned ? "banned" : "active";
          valB = b.is_banned ? "banned" : "active";
          break;
        default:
          return 0;
      }
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }, [users, sortColumn, sortDirection]);

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading users...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">
            Account Security & Fraud Radar
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitor order velocity, flag suspicious accounts, and manage bans.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-slate-800 bg-slate-900/20">
          <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No customers registered yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40">
                {([
                  ["user", "User"],
                  ["orders", "Orders"],
                  ["trades", "Trades"],
                  ["velocity", "Velocity"],
                  ["spend", "24h Spend"],
                  ["status", "Status"],
                ] as const).map(([key, label]) => {
                  const isActive = sortColumn === key;
                  const arrow =
                    !isActive ? "↕" : sortDirection === "asc" ? "▲" : "▼";
                  return (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className={`text-center px-4 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer select-none hover:bg-slate-800/50 transition-colors ${
                        isActive ? "text-indigo-400" : "text-slate-400"
                      } ${key === "user" ? "text-left" : ""}`}
                    >
                      {label}{" "}
                      <span className={isActive ? "text-indigo-400" : "text-slate-600"}>
                        {arrow}
                      </span>
                    </th>
                  );
                })}
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedUsers.map((u) => {
                const flagCount = u.velocity_flags.length;
                const hasHighFlag = u.velocity_flags.some(
                  (f) => f.level === "high",
                );
                const hasAnyFlag = flagCount > 0;

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-900/20 transition-colors ${
                      u.is_banned ? "bg-rose-500/5" : ""
                    }`}
                  >
                    {/* User info */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        {u.last_purchase_at && (
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Last purchase:{" "}
                            {new Date(u.last_purchase_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Orders count */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-semibold">
                        {u.transactions_count}
                      </span>
                    </td>

                    {/* Trades count + velocity */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-white font-semibold">
                          {u.trade_count}
                        </span>
                        {(u.trade_velocity_1h > 0 || u.trade_velocity_24h > 0) && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-0.5">
                              <Zap className="w-3 h-3" />
                              {u.trade_velocity_1h}h
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {u.trade_velocity_24h}d
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Velocity */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {hasAnyFlag ? (
                          <div className="flex items-center gap-1.5">
                            {hasHighFlag ? (
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            )}
                            <span
                              className={`text-xs font-bold ${
                                hasHighFlag ? "text-rose-400" : "text-amber-400"
                              }`}
                            >
                              {flagCount} flag{flagCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">Clear</span>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-0.5">
                            <Zap className="w-3 h-3" />
                            {u.velocity_1h}h
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {u.velocity_24h}d
                          </span>
                        </div>
                        {/* Show first high flag message as tooltip */}
                        {hasHighFlag && (
                          <span className="text-[10px] text-rose-400/80 max-w-[180px] truncate">
                            {u.velocity_flags.find((f) => f.level === "high")
                              ?.message}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 24h Spend */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold ${
                          u.spend_24h >= 100000
                            ? "text-rose-400"
                            : u.spend_24h >= 50000
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }`}
                      >
                        ৳{u.spend_24h.toLocaleString()}
                      </span>
                    </td>

                    {/* Ban Status */}
                    <td className="px-4 py-3 text-center">
                      {u.is_banned ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-400">
                          <ShieldBan className="w-3 h-3" />
                          BANNED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                          <ShieldCheck className="w-3 h-3" />
                          ACTIVE
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.is_banned ? (
                          <button
                            onClick={() =>
                              setConfirmTarget({ user: u, action: "unban" })
                            }
                            disabled={togglingId === u.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
                          >
                            <UserCheck className="w-3 h-3" />
                            {togglingId === u.id ? "..." : "Unban"}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setConfirmTarget({ user: u, action: "ban" })
                            }
                            disabled={togglingId === u.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                          >
                            <UserX className="w-3 h-3" />
                            {togglingId === u.id ? "..." : "Ban"}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setConfirmTarget({ user: u, action: "delete" })
                          }
                          disabled={togglingId === u.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Ban/Unban confirmation modal ── */}
      <ConfirmModal
        isOpen={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmTarget?.action === "ban" ? "Ban User" :
          confirmTarget?.action === "unban" ? "Unban User" :
          "Delete User"
        }
        message={
          confirmTarget?.action === "ban"
            ? `Are you sure you want to ban "${confirmTarget?.user.name}"? Their active sessions will be revoked and they will not be able to log in or make purchases.`
            : confirmTarget?.action === "unban"
              ? `Are you sure you want to unban "${confirmTarget?.user.name}"? They will regain full access to their account.`
              : `Are you sure you want to permanently delete "${confirmTarget?.user.name}"? All of their transactions, orders, and data will be permanently removed. This action cannot be undone.`
        }
        confirmLabel={
          togglingId
            ? confirmTarget?.action === "ban" ? "Banning..." :
              confirmTarget?.action === "unban" ? "Unbanning..." :
              "Deleting..."
            : confirmTarget?.action === "ban" ? "Ban User" :
              confirmTarget?.action === "unban" ? "Unban User" :
              "Delete User"
        }
        variant={
          confirmTarget?.action === "ban" || confirmTarget?.action === "delete" ? "danger" : "primary"
        }
        loading={togglingId !== null}
      />
    </div>
  );
}