import { useState, useMemo, useCallback } from "react";
import { Product } from "../data/categories";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { apiJson } from "../lib/api";

// ── Template parser ────────────────────────────────────────────────

interface ParsedField {
  tag: "input" | "select" | "textarea";
  name: string;
  label: string;
  type?: string; // for input elements
  placeholder?: string;
  options?: { value: string; text: string }[]; // for select
  required?: boolean;
  rows?: number; // for textarea
}

/**
 * Parse a raw HTML template string into an ordered array of field
 * definitions that React can render as controlled components.
 */
function parseTemplate(html: string): ParsedField[] {
  const doc = new DOMParser().parseFromString(
    `<div>${html}</div>`,
    "text/html",
  );
  const elements = doc.querySelectorAll("input, select, textarea");
  const fields: ParsedField[] = [];

  for (const el of elements) {
    // Skip submit / button / reset / hidden inputs
    if (el instanceof HTMLInputElement) {
      const t = (el.getAttribute("type") || "text").toLowerCase();
      if (t === "submit" || t === "button" || t === "reset" || t === "hidden") {
        continue;
      }
    }

    const rawTag = el.tagName.toLowerCase();
    const tag =
      rawTag === "input" || rawTag === "select" || rawTag === "textarea"
        ? rawTag
        : "input";

    const name = el.getAttribute("name") || "";
    if (!name) continue; // nameless elements cannot contribute to the payload

    const label = el.getAttribute("label") || name;
    const required = el.hasAttribute("required");

    const field: ParsedField = { tag, name, label, required };

    if (tag === "input") {
      field.type = el.getAttribute("type") || "text";
      field.placeholder = el.getAttribute("placeholder") || "";
    }

    if (tag === "select") {
      field.options = Array.from(el.querySelectorAll("option")).map(
        (opt) => ({
          value: opt.getAttribute("value") || "",
          text: opt.textContent || "",
        }),
      );
    }

    if (tag === "textarea") {
      field.placeholder = el.getAttribute("placeholder") || "";
      field.rows = parseInt(el.getAttribute("rows") || "3", 10);
    }

    // Generic placeholder for elements that support it but weren't caught above
    if (!field.placeholder && el.hasAttribute("placeholder")) {
      field.placeholder = el.getAttribute("placeholder") || "";
    }

    fields.push(field);
  }

  return fields;
}

// ── CheckoutModal component ───────────────────────────────────────

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

/** Build initial empty values for every parsed field. */
function buildInitialValues(fields: ParsedField[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) {
    map[f.name] = "";
  }
  return map;
}

/** Shared Tailwind input classes used across all rendered field types. */
const INPUT_CLASSES =
  "w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600";

export default function CheckoutModal({
  product,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const { user, token, refreshUser } = useCustomerAuth();
  const [trxId, setTrxId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Payment gateway ──
  const [gateway, setGateway] = useState<"bkash" | "nagad">("bkash");
  const [copied, setCopied] = useState(false);
  const paymentNumber = "01644417803";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = paymentNumber;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Coupon state ──
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const data = await apiJson<{ valid: boolean; discount?: number; message?: string }>(
        "/api/coupon/validate",
        null,
        {
          method: "POST",
          body: JSON.stringify({ code, product_price: productPrice }),
        },
      );
      if (!data.valid) {
        setCouponError(data.message || "Invalid coupon code.");
        setCouponDiscount(0);
        setAppliedCoupon("");
      } else {
        setCouponDiscount(data.discount || 0);
        setAppliedCoupon(code);
        setCouponError("");
      }
    } catch {
      setCouponError("Failed to validate coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setAppliedCoupon("");
    setCouponError("");
  };

  // ── Points redemption state ──
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const productPrice = parseFloat(product.price);
  const maxRedeemable = user
    ? Math.min(user.points, Math.floor(productPrice))
    : 0;
  const pointsDiscount = redeemPoints ? pointsToRedeem : 0;
  const finalPrice = Math.max(0, productPrice - pointsDiscount - couponDiscount);

  // ── Parse the product's custom form code ──
  const parsedFields: ParsedField[] = useMemo(() => {
    const code = product.custom_form_code;
    if (!code || !code.trim()) return [];
    try {
      return parseTemplate(code);
    } catch {
      // If parsing fails, treat it as no custom form
      return [];
    }
  }, [product.custom_form_code]);

  const hasCustomCode = parsedFields.length > 0;

  // ── Dynamic form values, keyed by the field's `name` attribute ──
  const [formValues, setFormValues] = useState<Record<string, string>>(
    () => buildInitialValues(parsedFields),
  );

  // Keep formValues in sync when the product changes
  const [prevProductId, setPrevProductId] = useState(product.id);
  if (product.id !== prevProductId) {
    setPrevProductId(product.id);
    setFormValues(buildInitialValues(parsedFields));
  }

  /** Generic onChange handler — leverages `e.target.name` as the state key. */
  const handleFieldChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setFormValues((prev) => ({
        ...prev,
        [e.target.name]: e.target.value,
      }));
    },
    [],
  );

  // ── Submit ─────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trxId.trim()) return setError("Transaction ID is required");

    // Validate required custom fields
    for (const field of parsedFields) {
      if (field.required) {
        const val = (formValues[field.name] ?? "").trim();
        if (!val) {
          setError(`${field.label} is required.`);
          return;
        }
      }
    }

    // Package dynamic values into account_credentials as JSON string
    let credentialsPayload: string;
    if (hasCustomCode) {
      // Remove empty keys before serialising to keep the payload clean
      const nonEmpty: Record<string, string> = {};
      for (const [k, v] of Object.entries(formValues)) {
        if (v.trim()) nonEmpty[k] = v.trim();
      }
      credentialsPayload = JSON.stringify(nonEmpty);
    } else {
      // Fallback: the standard single text input value
      credentialsPayload = formValues["account_credentials"] ?? "";
    }

    const payload: Record<string, unknown> = {
      account_credentials: credentialsPayload,
      transaction_id: trxId,
      product_name: product.name,
      product_id: product.id,
      price: productPrice, // original price — backend handles discounts
      customer_email: email,
    };

    // Attach points redemption if user is authenticated
    if (user && redeemPoints && pointsToRedeem > 0) {
      payload.points_to_redeem = pointsToRedeem;
    }

    // Attach applied coupon
    if (appliedCoupon) {
      payload.coupon_code = appliedCoupon;
    }

    setSubmitting(true);
    setError("");

    try {
      await apiJson("/api/checkout", token, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onSuccess();
      // Refresh user points after successful checkout
      if (user) {
        refreshUser();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────

  const renderParsedField = (field: ParsedField) => {
    const value = formValues[field.name] ?? "";

    switch (field.tag) {
      case "input":
        return (
          <input
            type={field.type || "text"}
            name={field.name}
            value={value}
            onChange={handleFieldChange}
            placeholder={field.placeholder || ""}
            className={INPUT_CLASSES}
          />
        );

      case "select":
        return (
          <select
            name={field.name}
            value={value}
            onChange={handleFieldChange}
            className={INPUT_CLASSES}
          >
            <option value="" disabled>
              — Select {field.label} —
            </option>
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.text}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            name={field.name}
            value={value}
            onChange={handleFieldChange}
            placeholder={field.placeholder || ""}
            rows={field.rows ?? 3}
            className={INPUT_CLASSES + " resize-none"}
          />
        );

      default:
        return null;
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-y-auto max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-xl font-bold">Checkout: {product.name}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Product price badge */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Price Amount
            </label>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              ৳{productPrice.toLocaleString()}
            </p>
          </div>

          {/* ── Loyalty Points Section (authenticated users only) ── */}
          {user && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  🪙 Loyalty Points
                </p>
                <span className="text-xs text-slate-400">
                  Balance:{" "}
                  <span className="font-bold text-amber-400">
                    {user.points.toLocaleString()} pts
                  </span>{" "}
                  (worth ৳{user.points.toLocaleString()})
                </span>
              </div>

              {/* Redeem toggle */}
              {user.points > 0 && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redeemPoints}
                      onChange={(e) => {
                        setRedeemPoints(e.target.checked);
                        if (e.target.checked && pointsToRedeem === 0) {
                          setPointsToRedeem(maxRedeemable);
                        }
                        if (!e.target.checked) {
                          setPointsToRedeem(0);
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800 accent-amber-400"
                    />
                    <span className="text-sm font-medium text-slate-300">
                      Redeem points for discount
                    </span>
                  </label>

                  {redeemPoints && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Points to use
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Max: {maxRedeemable.toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={maxRedeemable}
                        value={pointsToRedeem}
                        onChange={(e) =>
                          setPointsToRedeem(parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full accent-amber-400"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>0</span>
                        <span>{pointsToRedeem.toLocaleString()} pts</span>
                        <span>{maxRedeemable.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Discount summary */}
                  {(redeemPoints || couponDiscount > 0) && (pointsDiscount > 0 || couponDiscount > 0) && (
                    <div className="rounded-lg bg-slate-950/50 p-3 space-y-1 text-sm">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>৳{productPrice.toLocaleString()}</span>
                      </div>
                      {pointsDiscount > 0 && (
                        <div className="flex justify-between text-amber-400">
                          <span>Points discount</span>
                          <span>-৳{pointsDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-purple-400">
                          <span>Coupon: {appliedCoupon}</span>
                          <span>-৳{couponDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-white border-t border-slate-800 pt-1">
                        <span>You pay</span>
                        <span className="text-emerald-400">
                          ৳{finalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {user.points >= productPrice && (
                    <p className="text-xs text-amber-400 font-semibold">
                      🎉 You have enough points to pay in full!
                    </p>
                  )}
                </>
              )}

              {/* Points to be earned */}
              <p className="text-[10px] text-slate-500">
                You'll earn{" "}
                <span className="text-emerald-400 font-bold">
                  {Math.floor(finalPrice / 100)}
                </span>{" "}
                point(s) from this purchase (1 per ৳100 spent)
              </p>
            </div>
          )}

          {/* ── Dynamic custom form fields ── */}
          {hasCustomCode ? (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-3">
                Required Details
              </p>
              <div className="space-y-3">
                {parsedFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {field.label}
                      {field.required && (
                        <span className="text-rose-400 ml-1">*</span>
                      )}
                    </label>
                    {renderParsedField(field)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Fallback: standard single text input ── */
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-3">
                Account Details
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Account Credentials / Additional Info
                </label>
                <input
                  type="text"
                  name="account_credentials"
                  value={formValues["account_credentials"] ?? ""}
                  onChange={handleFieldChange}
                  placeholder="Steam profile link or login details"
                  className={INPUT_CLASSES}
                />
              </div>
            </div>
          )}

          {/* ── Permanent fields ── */}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Email (For Receipt)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={INPUT_CLASSES}
            />
          </div>

          {/* ── Coupon Code ── */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-600/5 p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
              🎟️ Coupon Code
            </p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
                <span className="text-sm font-semibold text-purple-400">{appliedCoupon}</span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-purple-500 placeholder:text-slate-600"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                >
                  {couponLoading ? "..." : "Apply"}
                </button>
              </div>
            )}
            {couponError && (
              <p className="text-xs text-rose-400">{couponError}</p>
            )}
          </div>

          {/* ── Payment Gateway Selector ── */}
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Payment Method
            </p>

            {/* Gateway grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGateway("bkash")}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  gateway === "bkash"
                    ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/50"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <img
                  src="https://download.logo.wine/logo/bKash/bKash-Icon2.png"
                  alt="bKash"
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className={`text-xs font-bold ${gateway === "bkash" ? "text-rose-400" : "text-slate-400"}`}>
                  bKash
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGateway("nagad")}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  gateway === "nagad"
                    ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/50"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Nagad-Logo.png/320px-Nagad-Logo.png"
                  alt="Nagad"
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className={`text-xs font-bold ${gateway === "nagad" ? "text-rose-400" : "text-slate-400"}`}>
                  Nagad
                </span>
              </button>
            </div>

            {/* Account number with copy button */}
            <div>
              <p className="text-xs text-slate-400 mb-1.5">
                Personal {gateway === "bkash" ? "bKash" : "Nagad"} Number
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-mono font-bold text-amber-400 select-all">
                  {paymentNumber}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Dynamic instructions */}
            <div className="rounded-lg bg-slate-900/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Instructions
              </p>
              {gateway === "bkash" ? (
                <ol className="space-y-1 text-xs text-slate-400 list-decimal list-inside">
                  <li>Open bKash app</li>
                  <li>Send Money</li>
                  <li>Enter the number above</li>
                  <li>Input the Transaction ID below</li>
                </ol>
              ) : (
                <ol className="space-y-1 text-xs text-slate-400 list-decimal list-inside">
                  <li>Open Nagad app</li>
                  <li>Send Money</li>
                  <li>Enter the number above</li>
                  <li>Input the Transaction ID below</li>
                </ol>
              )}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Transaction ID (TrxID)
            </label>
            <input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. BKA7X9L2M1"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-mono tracking-widest text-amber-400 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm font-semibold text-rose-400">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Verifying Transaction..." : "Confirm Purchase"}
          </button>
        </form>
      </div>
    </div>
  );
}