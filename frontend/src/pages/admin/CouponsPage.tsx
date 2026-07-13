import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson, apiDownload } from "../../lib/api";
import { Plus, Trash2, Pencil, X, Tag, Download, Ticket } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

interface Coupon {
  id: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed (৳)" },
] as const;

function formatDiscount(c: Coupon): string {
  if (c.discount_type === "percentage") return `${c.discount_value}%`;
  return `৳${Number(c.discount_value).toLocaleString()}`;
}

export default function CouponsPage() {
  const { token } = useAuth();

  // ── List state ──
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // ── Form state (shared for create & edit) ──
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // ── Delete state ──
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Multi-select compare state ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchCoupons = () => {
    apiJson<Coupon[]>("/api/admin/coupons", token)
      .then(setCoupons)
      .catch((err) =>
        setListError(err instanceof Error ? err.message : "Failed to load coupons"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoupons();
  }, [token]);

  // ── Reset form ──
  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinPurchase("");
    setMaxUses("");
    setExpiresAt("");
    setIsActive(true);
    setFormError("");
    setFormSuccess("");
  };

  // ── Open form for editing ──
  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setCode(c.code);
    setDiscountType(c.discount_type);
    setDiscountValue(String(c.discount_value));
    setMinPurchase(c.min_purchase != null ? String(c.min_purchase) : "");
    setMaxUses(c.max_uses != null ? String(c.max_uses) : "");
    setExpiresAt(c.expires_at ? c.expires_at.slice(0, 10) : "");
    setIsActive(c.is_active);
    setFormError("");
    setFormSuccess("");
    setShowForm(true);
  };

  // ── Submit (create or update) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!code.trim()) {
      setFormError("Coupon code is required.");
      return;
    }
    if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
      setFormError("A valid discount value is required.");
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = editingId !== null;
      const apiPath = isEdit
        ? `/api/admin/coupons/${editingId}`
        : "/api/admin/coupons";
      const method = isEdit ? "PUT" : "POST";

      const data = await apiJson<{ message: string }>(apiPath, token, {
        method,
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: Number(discountValue),
          min_purchase: minPurchase ? Number(minPurchase) : null,
          max_uses: maxUses ? Number(maxUses) : null,
          expires_at: expiresAt || null,
          is_active: isActive,
        }),
      });

      setFormSuccess(data.message || `Coupon ${isEdit ? "updated" : "created"}!`);
      resetForm();
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiJson(`/api/admin/coupons/${deleteTarget.id}`, token, {
        method: "DELETE",
      });
      setCoupons((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Delete failed");
      setTimeout(() => setListError(""), 3000);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // ── Toggle selection ──
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Export ──
  const handleExport = async () => {
    try {
      await apiDownload(
        "/api/admin/coupons/export",
        token,
        `kishershop_coupons_${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Export failed");
      setTimeout(() => setListError(""), 3000);
    }
  };

  // ── Selected coupons detail ──
  const selectedCoupons = useMemo(
    () => coupons.filter((c) => selectedIds.has(c.id)),
    [coupons, selectedIds],
  );

  // ── Usage % ──
  const usagePct = (c: Coupon): number => {
    if (!c.max_uses || c.max_uses === 0) return 0;
    return Math.min(100, Math.round((c.used_count / c.max_uses) * 100));
  };

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading coupons...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Coupons</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Coupon
          </button>
        </div>
      </div>

      {listError && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm text-rose-400">
          {listError}
        </div>
      )}

      {/* ── Create / Edit form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
          />
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-base font-bold text-white">
                {editingId ? "Edit Coupon" : "Create Coupon"}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-lg p-1 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER20"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono uppercase text-white outline-none focus:border-indigo-500 placeholder:text-slate-600 placeholder:normal-case"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  >
                    {DISCOUNT_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value} className="bg-slate-900">
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percentage" ? "20" : "100"}
                    min="1"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Min Purchase (৳)
                  </label>
                  <input
                    type="number"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    placeholder="No minimum"
                    min="0"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Expires At
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  >
                    <option value="active" className="bg-slate-900">Active</option>
                    <option value="inactive" className="bg-slate-900">Inactive</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p className="text-xs font-semibold text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                  {formSuccess}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Coupon grid ── */}
      {coupons.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-slate-800 bg-slate-900/20">
          <Ticket className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No coupons created yet.</p>
          <p className="text-xs text-slate-600 mt-1">
            Click "New Coupon" to create your first discount code.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => {
            const pct = usagePct(c);
            const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
            const isSelected = selectedIds.has(c.id);

            return (
              <div
                key={c.id}
                className={`relative overflow-hidden rounded-xl border transition-colors ${
                  isSelected
                    ? "border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                }`}
              >
                {/* Selection checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(c.id)}
                    className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 cursor-pointer"
                  />
                </div>

                {/* Color strip */}
                <div
                  className={`h-1 ${
                    !c.is_active || isExpired
                      ? "bg-slate-600"
                      : c.discount_type === "percentage"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500"
                  }`}
                />

                <div className="p-5 pt-8">
                  {/* Code + discount */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-lg font-black tracking-wider text-amber-400">
                      {c.code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        c.is_active && !isExpired
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {!c.is_active ? "Inactive" : isExpired ? "Expired" : "Active"}
                    </span>
                  </div>

                  {/* Discount value */}
                  <p className="text-2xl font-black text-white">
                    {formatDiscount(c)}
                    <span className="text-sm font-normal text-slate-400"> off</span>
                  </p>

                  {/* Usage bar */}
                  {c.max_uses != null && c.max_uses > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">Usage</span>
                        <span className="text-slate-400 font-mono">
                          {c.used_count} / {c.max_uses}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 80 ? "bg-rose-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Meta details */}
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {c.min_purchase != null && c.min_purchase > 0 && (
                      <p>
                        Min purchase: <span className="text-slate-400">৳{Number(c.min_purchase).toLocaleString()}</span>
                      </p>
                    )}
                    {c.expires_at && (
                      <p>
                        Expires:{" "}
                        <span className={isExpired ? "text-rose-400" : "text-slate-400"}>
                          {new Date(c.expires_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Selected coupons summary ── */}
      {selectedCoupons.length > 0 && (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-indigo-400" />
            Comparing {selectedCoupons.length} Selected Coupon{selectedCoupons.length !== 1 ? "s" : ""}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Code
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Discount
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Used
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {selectedCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-amber-400">
                      {c.code}
                    </td>
                    <td className="px-3 py-2.5 text-white font-semibold">
                      {formatDiscount(c)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs font-mono">
                      {c.used_count}
                      {c.max_uses ? ` / ${c.max_uses}` : " / ∞"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                          c.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Coupon"
        message={`Are you sure you want to permanently delete the coupon "${deleteTarget?.code}"? This action cannot be undone.`}
        confirmLabel={deletingId ? "Deleting..." : "Delete Permanently"}
        variant="danger"
        loading={deletingId !== null}
      />
    </div>
  );
}
