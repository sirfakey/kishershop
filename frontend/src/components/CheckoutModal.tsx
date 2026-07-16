import { useState, useMemo, useCallback, useEffect } from "react";
import { Product, type CheckoutField } from "../data/categories";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { apiJson } from "../lib/api";

// ── Helper: build initial empty values for structured checkout fields ──
function buildInitialValues(fields: CheckoutField[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) {
    map[f.name] = "";
  }
  return map;
}

/** Shared Tailwind input classes — text-base on mobile prevents iOS zoom, text-sm on desktop. */
const INPUT_CLASSES =
  "w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-base sm:text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600";

// ── CheckoutModal component ───────────────────────────────────────

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({
  product,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const { user, token, refreshUser, login, register, verifyEmail } = useCustomerAuth();
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Auth gate state (shown when user is not logged in) ──
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [verifyEmailTarget, setVerifyEmailTarget] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and password are required.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      await login(authEmail.trim(), authPassword);
      // Auth succeeded — user state will update and checkout form shows
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthError("All fields are required.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const registeredEmail = await register(authName.trim(), authEmail.trim(), authPassword);
      setVerifyEmailTarget(registeredEmail);
      setAuthMode("verify");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim() || authCode.trim().length !== 6) {
      setAuthError("Please enter the 6-digit verification code.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      await verifyEmail(verifyEmailTarget, authCode.trim());
      // Auth succeeded — user state will update and checkout form shows
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setAuthLoading(false);
    }
  };

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

  // Backend applies coupon first, then points — maxRedeemable caps at price AFTER coupon
  const maxRedeemable = user
    ? Math.min(user.points, Math.floor(Math.max(0, productPrice - couponDiscount)))
    : 0;
  const pointsDiscount = redeemPoints ? pointsToRedeem : 0;
  // Align with backend ordering: coupon first, then points
  const finalPrice = Math.max(0, productPrice - couponDiscount - pointsDiscount);

  // Clamp pointsToRedeem when couponDiscount changes (shrinks the cap)
  useEffect(() => {
    if (pointsToRedeem > maxRedeemable) {
      setPointsToRedeem(maxRedeemable);
    }
  }, [maxRedeemable, pointsToRedeem]);

  // ── Seller notes (conditional — only shown when product has enable_seller_notes) ──
  const [sellerNotes, setSellerNotes] = useState("");

  // ── Use structured custom_checkout_fields from the product ──
  const checkoutFields: CheckoutField[] = useMemo(() => {
    const fields = product.custom_checkout_fields;
    if (!fields || !Array.isArray(fields) || fields.length === 0) return [];
    // Filter out fields with empty names (invalid)
    return fields.filter((f) => f.name && f.name.trim());
  }, [product.custom_checkout_fields]);

  const hasCustomFields = checkoutFields.length > 0;

  // ── Form values ──
  const [formValues, setFormValues] = useState<Record<string, string>>(
    () => buildInitialValues(checkoutFields),
  );

  // Keep formValues in sync when the product changes
  const [prevProductId, setPrevProductId] = useState(product.id);
  if (product.id !== prevProductId) {
    setPrevProductId(product.id);
    setFormValues(buildInitialValues(checkoutFields));
  }

  /** Generic onChange handler for single-product mode. */
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

  const showSellerNotes = product.enable_seller_notes === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trxId.trim()) return setError("Transaction ID is required");

    // Validate required checkout fields
    if (hasCustomFields) {
      for (const field of checkoutFields) {
        if (field.required) {
          const val = (formValues[field.name] ?? "").trim();
          if (!val) {
            setError(`${field.label} is required.`);
            return;
          }
        }
      }
    }

    // Build custom_fields payload — remove empty keys
    const buildCustomFields = (values: Record<string, string>): Record<string, string> | null => {
      const nonEmpty: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v.trim()) nonEmpty[k] = v.trim();
      }
      return Object.keys(nonEmpty).length > 0 ? nonEmpty : null;
    };

    const payload: Record<string, unknown> = {
      transaction_id: trxId,
      gateway: gateway,
    };

    // Global seller notes (only included if shown)
    if (showSellerNotes) {
      payload.seller_notes = sellerNotes.trim() || null;
    }

    // For backward compat: include legacy account_credentials as empty string
    payload.account_credentials = "";

    // Single-product checkout
    payload.product_name = product.name;
    payload.product_id = product.id;
    payload.price = productPrice;
    // Attach structured custom_fields directly
    const cf = buildCustomFields(formValues);
    if (cf) {
      payload.custom_fields = cf;
    }

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

  /** Render a single structured CheckoutField as a controlled input/select/textarea. */
  const renderCheckoutField = (
    field: CheckoutField,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void,
  ) => {
    switch (field.type) {
      case "select":
        return (
          <select
            name={field.name}
            value={value}
            onChange={onChange}
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
            onChange={onChange}
            placeholder={field.placeholder || ""}
            rows={4}
            className={INPUT_CLASSES + " resize-none"}
          />
        );

      case "text":
      default:
        return (
          <input
            type="text"
            name={field.name}
            value={value}
            onChange={onChange}
            placeholder={field.placeholder || ""}
            className={INPUT_CLASSES}
          />
        );
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-y-auto max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-white p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg sm:text-xl font-bold">
            Checkout: {product.name}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        {/* ── Responsive two-column body ── */}
        <div className="mt-4 flex flex-col lg:flex-row gap-6">
          {/* ── LEFT: Form & Auth ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* ── Auth Gate: Login / Register / Verify Email ── */}
            {!user && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔐</span>
                  <p className="text-sm font-bold text-amber-400">
                    Login required to purchase
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  You must be logged in to complete a purchase. Please log in or create an account below.
                </p>

                {/* ── Auth mode tabs ── */}
                {authMode !== "verify" && (
                  <div className="flex gap-1 rounded-lg bg-slate-950/50 p-1">
                    <button
                      type="button"
                      onClick={() => { setAuthMode("login"); setAuthError(""); }}
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                        authMode === "login"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("register"); setAuthError(""); }}
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                        authMode === "register"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Create Account
                    </button>
                  </div>
                )}

                {/* ── Login form ── */}
                {authMode === "login" && (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="name@example.com"
                        className={INPUT_CLASSES}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••"
                        className={INPUT_CLASSES}
                      />
                    </div>
                    {authError && (
                      <p className="text-xs font-semibold text-rose-400">{authError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {authLoading ? "Logging in..." : "Login"}
                    </button>
                  </form>
                )}

                {/* ── Register form ── */}
                {authMode === "register" && (
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Mahdin Hasan"
                        className={INPUT_CLASSES}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="name@example.com"
                        className={INPUT_CLASSES}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Password <span className="text-slate-600">(min 6 chars)</span>
                      </label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••"
                        className={INPUT_CLASSES}
                      />
                    </div>
                    {authError && (
                      <p className="text-xs font-semibold text-rose-400">{authError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {authLoading ? "Creating account..." : "Create Account"}
                    </button>
                  </form>
                )}

                {/* ── Email verification form ── */}
                {authMode === "verify" && (
                  <form onSubmit={handleVerify} className="space-y-3">
                    <div className="rounded-lg bg-indigo-600/10 border border-indigo-500/20 p-3">
                      <p className="text-xs text-indigo-400 font-semibold">
                        A verification code was sent to{" "}
                        <span className="text-white">{verifyEmailTarget}</span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        6-Digit Code
                      </label>
                      <input
                        type="text"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-base sm:text-sm text-center font-mono tracking-[0.3em] text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                    </div>
                    {authError && (
                      <p className="text-xs font-semibold text-rose-400">{authError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {authLoading ? "Verifying..." : "Verify & Continue"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("register"); setAuthError(""); }}
                      className="w-full text-xs text-slate-500 hover:text-white transition-colors"
                    >
                      ← Back to registration
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── Checkout form (only visible when authenticated) ── */}
            {user && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Dynamic custom checkout fields ── */}
              {/* Inject custom_checkout_html */}
              {product.custom_checkout_html && (
                <div
                  className="rounded-xl text-sm"
                  dangerouslySetInnerHTML={{ __html: product.custom_checkout_html }}
                />
              )}

              {hasCustomFields && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-3">
                    Order Details
                  </p>
                  <div className="space-y-3">
                    {checkoutFields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                          {field.label}
                          {field.required && (
                            <span className="text-rose-400 ml-1">*</span>
                          )}
                        </label>
                        {renderCheckoutField(
                          field,
                          formValues[field.name] ?? "",
                          handleFieldChange,
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Notes for seller (conditional) ── */}
              {showSellerNotes && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-3">
                    📝 Notes for Seller
                  </p>
                  <textarea
                    value={sellerNotes}
                    onChange={(e) => setSellerNotes(e.target.value)}
                    placeholder="Any additional information the seller should know…"
                    rows={3}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-base sm:text-sm text-white outline-none focus:border-amber-500 placeholder:text-slate-600 resize-none"
                  />
                </div>
              )}

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
                      className={`flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-white outline-none focus:border-purple-500 placeholder:text-slate-600`}
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
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-base sm:text-sm font-mono tracking-widest text-amber-400 outline-none focus:border-indigo-500 placeholder:text-slate-600"
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
            )}
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            {/* Product card / Cart summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Order Summary
              </p>

              {/* ── Single product ── */}
              {/* Product image + name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/50 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const parent = (e.target as HTMLImageElement).parentElement!;
                        parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>`;
                      }}
                    />
                  ) : (
                    <span className="text-xs text-slate-500 font-bold">{product.name.slice(0, 2)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{product.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{product.type.replace("-", " ")}</p>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-lg bg-slate-900 p-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-white font-semibold">৳{productPrice.toLocaleString()}</span>
                </div>
                {product.original_price && parseFloat(product.original_price) > productPrice && (
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span>Original price</span>
                    <span className="line-through">৳{parseFloat(product.original_price).toLocaleString()}</span>
                  </div>
                )}
                {product.discount_percentage && product.discount_percentage > 0 && (
                  <div className="flex justify-between text-amber-400 text-xs">
                    <span>Discount</span>
                    <span>-{product.discount_percentage}%</span>
                  </div>
                )}
                {user && couponDiscount > 0 && (
                  <div className="flex justify-between text-purple-400">
                    <span>Coupon: {appliedCoupon}</span>
                    <span>-৳{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                {user && pointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Points</span>
                    <span>-৳{pointsDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white border-t border-slate-800 pt-2">
                  <span>You pay</span>
                  <span className="text-emerald-400 text-lg">৳{finalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Points info */}
              {user && (
                <p className="text-[10px] text-slate-500 text-center">
                  +{Math.floor(finalPrice / 100)} points earned · Balance: {user.points.toLocaleString()} pts
                </p>
              )}
            </div>

            {/* ── Payment Method ── */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Payment Method
              </p>

              {/* Gateway buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGateway("bkash")}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 transition-all ${
                    gateway === "bkash"
                      ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/50"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <img
                    src="/bkash-logo.png"
                    alt="bKash"
                    className="h-4 w-4 object-contain"
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
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 transition-all ${
                    gateway === "nagad"
                      ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/50"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <img
                    src="/nagad-logo.png"
                    alt="Nagad"
                    className="h-4 w-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className={`text-xs font-bold ${gateway === "nagad" ? "text-orange-400" : "text-slate-400"}`}>
                    Nagad
                  </span>
                </button>
              </div>

              {/* Payment number */}
              <div>
                <p className="text-[10px] text-slate-500 mb-1">
                  Personal {gateway === "bkash" ? "bKash" : "Nagad"} Number
                </p>
                <div className="flex items-center gap-1.5">
                  <code className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-mono font-bold text-amber-400 select-all">
                    {paymentNumber}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Payment instructions */}
              <div className="rounded-lg bg-slate-900 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  How to pay
                </p>
                <ol className="space-y-0.5 text-[10px] text-slate-400 list-decimal list-inside">
                  <li>Open {gateway === "bkash" ? "bKash" : "Nagad"} app</li>
                  <li>Send Money to the number above</li>
                  <li>Paste the Transaction ID in the TrxID field</li>
                </ol>
              </div>
            </div>

            {/* ── Loyalty Points (compact) ── */}
            {user && user.points > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  🪙 Loyalty Points
                </p>
                <span className="text-xs text-slate-400">
                  Balance: <span className="font-bold text-amber-400">{user.points.toLocaleString()} pts</span> (৳{user.points.toLocaleString()})
                </span>
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
                    Redeem points
                  </span>
                </label>
                {redeemPoints && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">Points to use</span>
                      <span className="text-[10px] text-slate-500">Max: {maxRedeemable.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={maxRedeemable}
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(parseInt(e.target.value, 10) || 0)}
                      className="w-full accent-amber-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                      <span>0</span>
                      <span>{pointsToRedeem.toLocaleString()}</span>
                      <span>{maxRedeemable.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                {user.points >= productPrice && (
                  <p className="text-xs text-amber-400 font-semibold">🎉 Enough points to pay in full!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}