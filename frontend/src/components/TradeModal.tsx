import { useState } from "react";
import { apiJson } from "../lib/api";

interface TradeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TradeModal({ onClose, onSuccess }: TradeModalProps) {
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!whatsapp.trim()) {
      setError("WhatsApp number is required.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe what you want to trade.");
      return;
    }

    setSubmitting(true);

    try {
      await apiJson("/api/trades", null, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim() || null,
          whatsapp_number: whatsapp.trim(),
          description: description.trim(),
        }),
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600";

  const labelClass =
    "block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-xl font-bold">Trade / Exchange</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-500">
            Fill in the details below and our team will reach out to you about your
            trade or exchange request.
          </p>

          {/* Email */}
          <div>
            <label className={labelClass}>
              Email <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          {/* WhatsApp Number */}
          <div>
            <label className={labelClass}>
              WhatsApp Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item(s) you want to trade or exchange..."
              rows={4}
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm font-semibold text-rose-400">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Trade Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
