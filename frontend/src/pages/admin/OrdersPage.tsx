import { useEffect, useState, useMemo, Fragment, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson, apiDownload } from "../../lib/api";
import { Download, ChevronDown, ChevronUp, Check, Undo2, RotateCcw, Trash2 } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

interface TransactionProduct {
  id: number;
  name: string;
  sku: string | null;
}

interface Transaction {
  id: number;
  transaction_id: string;
  product_name: string;
  product_id: number | null;
  product?: TransactionProduct | null;
  price: string;
  customer_email: string | null;
  account_credentials: string | null;
  custom_fields: Record<string, string> | null;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["pending", "completed", "refunded"] as const;
type StatusTab = "all" | "pending" | "completed" | "refunded";

const TAB_ITEMS: { tab: StatusTab; label: string }[] = [
  { tab: "all", label: "All Orders" },
  { tab: "pending", label: "Pending" },
  { tab: "completed", label: "Completed" },
  { tab: "refunded", label: "Refunded" },
];

/** Safely render a value that might be JSON — maps key-value if parsable, else raw string. */
function renderCredentials(credentials: string | null): ReactNode {
  if (!credentials || !credentials.trim()) return null;

  // Try to parse as JSON for key-value display
  try {
    const parsed = JSON.parse(credentials);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.length === 0) return null;
      return (
        <div className="space-y-1">
          {entries.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-mono font-bold">{key}:</span>
              <span className="text-slate-300 font-medium">
                {typeof val === "string" && val === "1"
                  ? "✓ Yes"
                  : String(val ?? "—")}
              </span>
            </div>
          ))}
        </div>
      );
    }
  } catch {
    // Not valid JSON — fall through to plain text
  }

  return <p className="text-xs text-slate-300 break-all">{credentials}</p>;
}

/** Status badge colours per value */
function statusBadgeClasses(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "refunded":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

export default function OrdersPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const fetchTransactions = () => {
    apiJson<Transaction[]>("/api/admin/transactions", token)
      .then(setTransactions)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load orders"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  // ── Filtered list (combines status tab + payment filter) ──
  const filteredTransactions = useMemo(() => {
    let filtered = activeTab === "all" ? transactions : transactions.filter((t) => t.status === activeTab);
    if (paymentFilter === "paid") return filtered.filter((t) => t.status === "completed");
    if (paymentFilter === "unpaid") return filtered.filter((t) => t.status === "pending" || t.status === "refunded");
    return filtered;
  }, [transactions, activeTab, paymentFilter]);

  // ── Tab counts ──
  const tabCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = { all: transactions.length, pending: 0, completed: 0, refunded: 0 };
    for (const t of transactions) {
      if (t.status in counts) {
        counts[t.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [transactions]);

  // ── Status change handler ──
  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingStatusId(id);
    try {
      await apiJson(`/api/admin/transactions/${id}/status`, token, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      // Optimistic update in local state
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
      setTimeout(() => setError(""), 3000);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ── Delete handler ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiJson(`/api/admin/transactions/${deleteTarget.id}`, token, {
        method: "DELETE",
      });
      setTransactions((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setTimeout(() => setError(""), 3000);
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

  const sortedTransactions = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredTransactions;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredTransactions].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortColumn) {
        case "trxid":
          valA = a.transaction_id.toLowerCase();
          valB = b.transaction_id.toLowerCase();
          break;
        case "sku":
          valA = (a.product?.sku ?? "").toLowerCase();
          valB = (b.product?.sku ?? "").toLowerCase();
          break;
        case "product":
          valA = a.product_name.toLowerCase();
          valB = b.product_name.toLowerCase();
          break;
        case "price":
          valA = parseFloat(a.price);
          valB = parseFloat(b.price);
          break;
        case "email":
          valA = (a.customer_email ?? "").toLowerCase();
          valB = (b.customer_email ?? "").toLowerCase();
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
  }, [filteredTransactions, sortColumn, sortDirection]);

  // ── Export ──
  const handleExport = async () => {
    try {
      await apiDownload(
        "/api/admin/transactions/export",
        token,
        `kisher-shop_sales_${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      setTimeout(() => setError(""), 3000);
    }
  };

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading transactions...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Orders</h2>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* ── Payment filter row ── */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-2">Payment</span>
        {([
          { key: "all", label: "All" },
          { key: "paid", label: "Paid" },
          { key: "unpaid", label: "Unpaid" },
        ] as const).map(({ key, label }) => {
          const isActive = paymentFilter === key;
          return (
            <button
              key={key}
              onClick={() => setPaymentFilter(key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                isActive
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Status tabs ── */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {TAB_ITEMS.map(({ tab, label }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === tab
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
            }`}
          >
            {label}
            <span
              className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold min-w-[18px] ${
                activeTab === tab
                  ? "bg-indigo-600/30 text-indigo-300"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {tabCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-slate-800 bg-slate-900/20">
          <p className="text-slate-500 font-medium">No {activeTab === "all" ? "" : activeTab} orders found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40">
                {([
                  ["trxid", "TrxID"],
                  ["sku", "SKU"],
                  ["product", "Product"],
                  ["price", "Price"],
                  ["email", "Email"],
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
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 w-16">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedTransactions.map((t) => {
                const isExpanded = expandedId === t.id;
                const hasCustomFields =
                  t.custom_fields && Object.keys(t.custom_fields).length > 0;
                const hasCredentials =
                  !!t.account_credentials && t.account_credentials.trim().length > 0;

                return (
                  <Fragment key={t.id}>
                    <tr className="hover:bg-slate-900/20 transition-colors">
                      {/* TrxID */}
                      <td className="px-4 py-3 font-mono text-xs text-amber-400 tracking-wide">
                        {t.transaction_id}
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {t.product?.sku ?? "—"}
                      </td>

                      {/* Product name */}
                      <td className="px-4 py-3 text-white font-medium">
                        {t.product_name}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-emerald-400 font-semibold">
                        ৳{parseFloat(t.price).toLocaleString()}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {t.customer_email || "—"}
                      </td>

                      {/* Status — dropdown + quick toggles */}
                      <td className="px-4 py-3">
                        {updatingStatusId === t.id ? (
                          <span className="text-xs text-slate-500 italic">updating...</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={t.status}
                              onChange={(e) =>
                                handleStatusChange(t.id, e.target.value)
                              }
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border outline-none cursor-pointer ${statusBadgeClasses(t.status)}`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt} className="bg-slate-900 text-white">
                                  {opt}
                                </option>
                              ))}
                            </select>
                            {/* Quick toggle shortcuts */}
                            {t.status === "pending" && (
                              <button
                                onClick={() => handleStatusChange(t.id, "completed")}
                                title="Mark completed"
                                className="rounded-full p-1 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {t.status === "completed" && (
                              <button
                                onClick={() => handleStatusChange(t.id, "refunded")}
                                title="Mark refunded"
                                className="rounded-full p-1 text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {t.status === "refunded" && (
                              <button
                                onClick={() => handleStatusChange(t.id, "pending")}
                                title="Reset to pending"
                                className="rounded-full p-1 text-amber-400 hover:bg-amber-500/10 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(t.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Expand toggle + delete */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : t.id)
                            }
                            className="rounded-lg p-1 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                            title={isExpanded ? "Hide details" : "Show details"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(t)}
                            className="rounded-lg p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded detail row ── */}
                    {isExpanded && (
                      <tr className="bg-slate-900/60">
                        <td colSpan={9} className="px-6 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Account credentials — parsed JSON or raw string */}
                            {hasCredentials && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Account Credentials
                                </span>
                                {renderCredentials(t.account_credentials)}
                              </div>
                            )}

                            {/* Legacy custom_fields */}
                            {hasCustomFields && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Custom Form Fields
                                </span>
                                <div className="mt-1 space-y-1">
                                  {Object.entries(t.custom_fields!).map(
                                    ([key, val]) => (
                                      <div
                                        key={key}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <span className="text-slate-500 font-mono">
                                          {key}:
                                        </span>
                                        <span className="text-slate-300 font-medium">
                                          {val === "1" ? "✓ Yes" : val || "—"}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {!hasCredentials && !hasCustomFields && (
                              <p className="text-xs text-slate-600">
                                No additional details
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
        title="Delete Order"
        message={`Are you sure you want to permanently delete order #${deleteTarget?.transaction_id}? This action cannot be undone.`}
        confirmLabel={deletingId ? "Deleting..." : "Delete Permanently"}
        variant="danger"
        loading={deletingId !== null}
      />
    </div>
  );
}