import { useState, useEffect, useRef } from "react";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import { apiJson } from "../../lib/api";
import type { CustomerTransaction, Trade } from "../../data/categories";
import { LogOut, Coins, ShoppingBag, User, Mail, ShieldCheck, ArrowLeft, ArrowLeftRight } from "lucide-react";

export default function AccountPage() {
  const { user, token, isAuthenticated, loading, login, register, verifyEmail, logout } =
    useCustomerAuth();

  // ── Tab switching (unauthenticated) ──────────────────────────────
  const [tab, setTab] = useState<"login" | "register">("login");

  // ── Form state ───────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Verification step (after registration) ──────────────────────
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Purchase history ────────────────────────────────────────────
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Trade requests ──────────────────────────────────────────────
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      setHistoryLoading(true);
      setTradesLoading(true);
      apiJson<CustomerTransaction[]>("/api/user/transactions", token)
        .then(setTransactions)
        .catch(() => setTransactions([]))
        .finally(() => setHistoryLoading(false));
      apiJson<Trade[]>("/api/user/trades", token)
        .then(setTrades)
        .catch(() => setTrades([]))
        .finally(() => setTradesLoading(false));
    }
  }, [isAuthenticated, token]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!email.trim() || !password.trim()) {
      setFormError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const registeredEmail = await register(name.trim(), email.trim(), password);
      setVerificationEmail(registeredEmail);
      setPendingVerification(true);
      setFormError("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Verification code input handlers ────────────────────────────

  const handleCodeDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...codeDigits];
    next[index] = value;
    setCodeDigits(next);

    // Auto-focus next input
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const digits = [...pasted.padEnd(6, "").slice(0, 6)];
    setCodeDigits(digits.map((c) => c || ""));
    // Focus last filled or next empty
    const lastFilled = digits.findIndex((c) => !c);
    const focusIdx = lastFilled === -1 ? 5 : lastFilled;
    codeRefs.current[focusIdx >= 0 ? focusIdx : 5]?.focus();
  };

  const handleVerify = async () => {
    const fullCode = codeDigits.join("");
    if (fullCode.length !== 6) {
      setFormError("Please enter the complete 6-digit code.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await verifyEmail(verificationEmail, fullCode);
      setPendingVerification(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToRegister = () => {
    setPendingVerification(false);
    setCodeDigits(["", "", "", "", "", ""]);
    setFormError("");
  };

  const handleLogout = async () => {
    await logout();
    setTransactions([]);
  };

  // ── Shared form field styling ────────────────────────────────────
  const inputClass =
    "w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600";

  const labelClass =
    "block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1";

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }

  // ── UNAUTHENTICATED: Login / Register / Verify tabs ──────────────
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          {/* Verification code screen */}
          {pendingVerification ? (
            <div className="space-y-5">
              <div className="text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-4">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-white">Verify Your Email</h3>
                <p className="text-sm text-slate-400 mt-1">
                  We sent a 6-digit code to{" "}
                  <strong className="text-slate-200">{verificationEmail}</strong>
                </p>
              </div>

              {/* 6-digit code input */}
              <div className="flex justify-center gap-2">
                {codeDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      codeRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeDigit(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    onPaste={i === 0 ? handleCodePaste : undefined}
                    className="h-14 w-12 rounded-lg border border-slate-700 bg-slate-950 text-center text-xl font-black text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors"
                  />
                ))}
              </div>

              {formError && (
                <p className="text-sm font-semibold text-rose-400 text-center">
                  {formError}
                </p>
              )}

              <button
                type="button"
                onClick={handleVerify}
                disabled={submitting}
                className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-amber-400 disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Verify Email"}
              </button>

              <button
                type="button"
                onClick={handleBackToRegister}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to registration
              </button>
            </div>
          ) : (
            <>
              {/* Tab headers */}
              <div className="flex border-b border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setFormError("");
                  }}
                  className={`flex-1 pb-3 text-sm font-bold transition-colors ${
                    tab === "login"
                      ? "text-amber-400 border-b-2 border-amber-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("register");
                    setFormError("");
                  }}
                  className={`flex-1 pb-3 text-sm font-bold transition-colors ${
                    tab === "register"
                      ? "text-amber-400 border-b-2 border-amber-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Login form */}
              {tab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>

                  {formError && (
                    <p className="text-sm font-semibold text-rose-400">{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold transition-all hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {submitting ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              )}

              {/* Register form */}
              {tab === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className={labelClass}>Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className={inputClass}
                    />
                  </div>

                  {formError && (
                    <p className="text-sm font-semibold text-rose-400">{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-amber-400 disabled:opacity-50"
                  >
                    {submitting ? "Creating account..." : "Create Account"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── AUTHENTICATED: Profile dashboard ─────────────────────────────
  return (
    <div className="min-h-[70vh] max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-black text-white mb-6">My Account</h2>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
              <User className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-bold text-white">{user.name}</p>
              <p className="text-sm text-slate-400 flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user.email}
              </p>
            </div>
          </div>

          {/* Points balance card */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Loyalty Points
              </span>
            </div>
            <p className="text-3xl font-black text-amber-400">
              {user.points.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Worth ৳{user.points.toLocaleString()} (1 point = 1 Taka)
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Purchase history */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-bold text-white">Purchase History</h3>
          </div>

          {historyLoading ? (
            <p className="text-sm text-slate-400">Loading history...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No purchases yet.</p>
              <p className="text-xs text-slate-600 mt-1">
                Your completed orders will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">Price</th>
                    <th className="pb-3 pr-4">Points</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="text-slate-300">
                      <td className="py-3 pr-4 font-medium text-white">
                        {tx.product_name}
                        {tx.product?.product_group && (
                          <span className="block text-xs text-slate-500">
                            {tx.product.product_group.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">৳{parseFloat(tx.price).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        {tx.points_earned > 0 && (
                          <span className="text-emerald-400 text-xs">
                            +{tx.points_earned}
                          </span>
                        )}
                        {tx.points_redeemed > 0 && (
                          <span className="text-amber-400 text-xs">
                            -{tx.points_redeemed}
                          </span>
                        )}
                        {tx.points_earned === 0 && tx.points_redeemed === 0 && (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            tx.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : tx.status === "pending"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Trade Requests */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-bold text-white">Trade Requests</h3>
        </div>

        {tradesLoading ? (
          <p className="text-sm text-slate-400">Loading trade requests...</p>
        ) : trades.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-600 mb-3" />
            <p className="text-sm text-slate-500">No trade requests yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Your submitted trade requests will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {trades.map((trade) => (
                  <tr key={trade.id} className="text-slate-300">
                    <td className="py-3 pr-4 max-w-[300px] truncate">
                      {trade.description}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          trade.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : trade.status === "reviewed"
                              ? "bg-blue-500/10 text-blue-400"
                              : trade.status === "declined"
                                ? "bg-rose-500/10 text-rose-400"
                                : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {trade.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-500">
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
