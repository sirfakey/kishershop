import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson } from "../../lib/api";
import { Plus, Trash2, FolderOpen, Pencil, X } from "lucide-react";
import ImageUploader from "../../components/ImageUploader";
import ConfirmModal from "../../components/ConfirmModal";

interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  sku_prefix?: string | null;
  products_count?: number;
  created_at: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriesPage() {
  const { token } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // List state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  // Edit modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editSkuPrefix, setEditSkuPrefix] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchCategories = () => {
    apiJson<Category[]>("/api/admin/product-groups", token)
      .then(setCategories)
      .catch((err) =>
        setListError(err instanceof Error ? err.message : "Failed to load categories"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim()) {
      setFormError("Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiJson<{ message: string }>(
        "/api/admin/product-groups",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            slug: slug || undefined,
            image_url: imageUrl || undefined,
            sku_prefix: skuPrefix.trim() || undefined,
          }),
        },
      );

      setFormSuccess(data.message || "Category created!");
      setName("");
      setSlug("");
      setImageUrl("");
      setSkuPrefix("");
      setSlugEdited(false);
      fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiJson(`/api/admin/product-groups/${deleteTarget.id}`, token, {
        method: "DELETE",
      });
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Delete failed");
      setTimeout(() => setListError(""), 3000);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // ── Edit category handlers ──
  const openEditModal = (c: Category) => {
    setEditingCategory(c);
    setEditName(c.name);
    setEditSlug(c.slug);
    setEditImageUrl(c.image_url);
    setEditSkuPrefix(c.sku_prefix ?? "");
    setEditError("");
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setEditError("");
    setEditSubmitting(true);
    try {
      await apiJson(
        `/api/admin/product-groups/${editingCategory.id}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            name: editName,
            slug: editSlug || undefined,
            image_url: editImageUrl || undefined,
            sku_prefix: editSkuPrefix.trim() || undefined,
          }),
        },
      );
      // Update local state optimistically
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? { ...c, name: editName, slug: editSlug, image_url: editImageUrl, sku_prefix: editSkuPrefix.trim() || null }
            : c,
        ),
      );
      setEditingCategory(null);
      setFormSuccess("Category updated!");
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading categories...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Categories</h2>

      {listError && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm text-rose-400">
          {listError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Add Category Form */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-indigo-400" />
            Add New Category
          </h3>

          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Minecraft"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Slug <span className="text-slate-600 normal-case">(auto from name)</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                placeholder="minecraft"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>

            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              onClear={() => setImageUrl("")}
              label="Category Image (optional)"
              aspectClass="aspect-video"
            />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                SKU Prefix <span className="text-slate-600 normal-case font-normal">(optional, e.g. MC, VAL, CS)</span>
              </label>
              <input
                type="text"
                value={skuPrefix}
                onChange={(e) => setSkuPrefix(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="MC"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono uppercase text-white outline-none focus:border-indigo-500 placeholder:text-slate-600 placeholder:normal-case"
              />
              <p className="text-[11px] text-slate-600 mt-1.5">
                Used as the first segment of auto-generated product SKUs
                (e.g. <code className="text-slate-500">MC-GC-001</code>).
              </p>
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Add Category"}
            </button>
          </form>
        </div>

        {/* Category Grid */}
        <div className="lg:col-span-3">
          {categories.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-slate-800 bg-slate-900/20">
              <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No categories yet.</p>
              <p className="text-xs text-slate-600 mt-1">
                Use the form to add your first category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
                >
                  <div className="aspect-video w-full overflow-hidden bg-slate-800">
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/600x400?text=" + encodeURIComponent(c.name);
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">{c.name}</h3>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
                        {c.products_count ?? 0} items
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs font-mono text-slate-500">/{c.slug}</p>
                      {c.sku_prefix && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-indigo-300">
                          {c.sku_prefix}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        disabled={deletingId === c.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deletingId === c.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This will also remove all products inside it.`}
        confirmLabel={deletingId ? "Deleting..." : "Delete Permanently"}
        variant="danger"
        loading={deletingId !== null}
      />

      {/* ── Edit Category Modal ── */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingCategory(null)}
          />

          {/* Modal card */}
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-base font-bold text-white">Edit Category</h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="rounded-lg p-1 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4 p-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>

              <ImageUploader
                value={editImageUrl}
                onChange={setEditImageUrl}
                onClear={() => setEditImageUrl("")}
                label="Category Image"
                aspectClass="aspect-video"
              />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  SKU Prefix <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editSkuPrefix}
                  onChange={(e) => setEditSkuPrefix(e.target.value.toUpperCase().slice(0, 10))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono uppercase text-white outline-none focus:border-indigo-500 placeholder:text-slate-600 placeholder:normal-case"
                />
              </div>

              {editError && (
                <p className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
                  {editError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}