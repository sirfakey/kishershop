import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson } from "../../lib/api";
import { Users, Trash2, Coins, Check, X } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

interface UserSummary {
  id: number;
  name: string;
  email: string;
  points: number;
  is_banned: boolean;
  created_at: string;
}

export default function UsersPage() {
  const { token } = useAuth();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<UserSummary | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Points edit state
  const [editingPointsId, setEditingPointsId] = useState<number | null>(null);
  const [pointsValue, setPointsValue] = useState("");
  const [updatingPoints, setUpdatingPoints] = useState(false);

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

  // ── Delete handler ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiJson(`/api/admin/users/${deleteTarget.id}`, token, {
        method: "DELETE",
      });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setSuccessMsg(`${deleteTarget.name} has been deleted.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setTimeout(() => setError(""), 3000);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // ── Points adjustment ──
  const startEditingPoints = (user: UserSummary) => {
    setEditingPointsId(user.id);
    setPointsValue(String(user.points));
  };

  const cancelEditingPoints = () => {
    setEditingPointsId(null);
    setPointsValue("");
  };

  const savePoints = async (user: UserSummary) => {
    const newPoints = parseInt(pointsValue, 10);
    if (isNaN(newPoints) || newPoints < 0) {
      setError("Points must be a positive number.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    setUpdatingPoints(true);
    try {
      const res = await apiJson<{ message: string; user: { points: number } }>(
        `/api/admin/users/${user.id}/points`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ points: newPoints }),
        },
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, points: newPoints } : u)),
      );
      setSuccessMsg(res.message || "Points updated.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update points");
      setTimeout(() => setError(""), 3000);
    } finally {
      setUpdatingPoints(false);
      setEditingPointsId(null);
      setPointsValue("");
    }
  };

  // ── Sorting ──
  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn !== column) {
        setSortColumn(column);
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    },
    [sortColumn, sortDirection],
  );

  const sortedUsers = useMemo(() => {
    if (!sortColumn || !sortDirection) return users;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...users].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortColumn) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "email":
          valA = a.email.toLowerCase();
          valB = b.email.toLowerCase();
          break;
        case "points":
          valA = a.points;
          valB = b.points;
          break;
        case "status":
          valA = a.is_banned ? "banned" : "active";
          valB = b.is_banned ? "banned" : "active";
          break;
        case "joined":
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
  }, [users, sortColumn, sortDirection]);

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading users...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Users</h2>
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

      {successMsg && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-400">
          {successMsg}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-slate-800 bg-slate-900/20">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No users registered yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40">
                {([
                  ["name", "Name"],
                  ["email", "Email"],
                  ["points", "Points"],
                  ["status", "Status"],
                  ["joined", "Joined"],
                ] as const).map(([key, label]) => {
                  const isActive = sortColumn === key;
                  const arrow = !isActive ? "↕" : sortDirection === "asc" ? "▲" : "▼";
                  return (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer select-none hover:bg-slate-800/50 transition-colors ${
                        isActive ? "text-indigo-400" : "text-slate-400"
                      }`}
                    >
                      {label}{" "}
                      <span className={isActive ? "text-indigo-400" : "text-slate-600"}>
                        {arrow}
                      </span>
                    </th>
                  );
                })}
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedUsers.map((u) => {
                const isEditing = editingPointsId === u.id;
                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-900/20 transition-colors ${
                      u.is_banned ? "bg-rose-500/5" : ""
                    }`}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{u.name}</p>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>

                    {/* Points */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={pointsValue}
                            onChange={(e) => setPointsValue(e.target.value)}
                            className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-mono text-white outline-none focus:border-indigo-500"
                            min="0"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") savePoints(u);
                              if (e.key === "Escape") cancelEditingPoints();
                            }}
                          />
                          <button
                            onClick={() => savePoints(u)}
                            disabled={updatingPoints}
                            className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEditingPoints}
                            disabled={updatingPoints}
                            className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-semibold text-xs">
                            {u.points.toLocaleString()}
                          </span>
                          <button
                            onClick={() => startEditingPoints(u)}
                            className="rounded p-1 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="Adjust points"
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {u.is_banned ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-400">
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(u.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? All their transactions and account data will be erased. This cannot be undone.`}
        confirmLabel={deletingId ? "Deleting..." : "Delete Permanently"}
        variant="danger"
        loading={deletingId !== null}
      />
    </div>
  );
}
