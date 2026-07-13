import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 rounded-full p-2 ${
                variant === "danger" ? "bg-rose-500/10" : "bg-indigo-500/10"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${
                  variant === "danger" ? "text-rose-400" : "text-indigo-400"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-400">{message}</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                variant === "danger"
                  ? "bg-rose-600 hover:bg-rose-500"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {loading ? "Please wait..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
