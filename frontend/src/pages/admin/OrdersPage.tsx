import { useEffect, useState, useMemo, Fragment } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson, apiDownload } from "../../lib/api";
import { Download, ChevronDown, ChevronUp } from "lucide-react";

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

  // ── Filtered list ──
  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") return transactions;
    return transactions.filter((t) => t.status === activeTab);
  }, [transactions, activeTab]);

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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/transactions/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!response.ok) {
        let message = `Status update failed (${response.status})`;
        try {
          const err = await response.json();
          if (err.message) message = err.message;
        } catch { /* not JSON */ }
        throw new Error(message);
      }

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

  // ── Export ──
  const handleExport = async () => {
    try {
      await apiDownload(
        "/api/admin/transactions/export",
        token,
        `kishershop_sales_${new Date().toISOString().slice(0, 10)}.csv`,
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
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  TrxID
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  SKU
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Price
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Date
                </th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 w-16">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.map((t) => {
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

                      {/* Status — dropdown selector */}
                      <td className="px-4 py-3">
                        {updatingStatusId === t.id ? (
                          <span className="text-xs text-slate-500 italic">updating...</span>
                        ) : (
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

                      {/* Expand toggle */}
                      <td className="px-4 py-3 text-center">
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
    </div>
  );
}