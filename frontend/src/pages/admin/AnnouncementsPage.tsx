import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson } from "../../lib/api";
import type { Announcement } from "../../data/categories";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

export default function AnnouncementsPage() {
  const { token } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Create form ──────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnnouncements = () => {
    apiJson<Announcement[]>("/api/admin/announcements", token)
      .then(setAnnouncements)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load announcements",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!title.trim() || !content.trim()) {
      setCreateError("Title and content are required.");
      return;
    }
    setCreating(true);
    try {
      const created = await apiJson<{ announcement: Announcement }>(
        "/api/admin/announcements",
        token,
        {
          method: "POST",
          body: JSON.stringify({ title: title.trim(), content: content.trim() }),
        },
      );
      setAnnouncements((prev) => [created.announcement, ...prev]);
      setTitle("");
      setContent("");
      setShowForm(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create announcement.",
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (a: Announcement) => {
    const newStatus = a.status === "active" ? "inactive" : "active";
    try {
      await apiJson(`/api/admin/announcements/${a.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setAnnouncements((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, status: newStatus } : x)),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status.");
      setTimeout(() => setActionError(""), 3000);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiJson(`/api/admin/announcements/${deleteTarget.id}`, token, {
        method: "DELETE",
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete.");
      setTimeout(() => setActionError(""), 3000);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600";

  const labelClass =
    "block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Announcements</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3"
        >
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Season Sale is Live!"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the announcement details..."
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          {createError && (
            <p className="text-sm font-semibold text-rose-400">{createError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Announcement"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setCreateError("");
              }}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm text-rose-400">
          {actionError}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-slate-400 text-sm">Loading announcements...</p>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">{a.title}</h3>
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      a.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{a.content}</p>
                <p className="mt-1 text-[10px] text-slate-600">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleStatus(a)}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
                >
                  {a.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(a)}
                  className="rounded-lg border border-slate-700 px-2 py-1 text-slate-400 transition-colors hover:border-rose-500/50 hover:text-rose-400"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete Permanently"}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
