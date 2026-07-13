import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson } from "../../lib/api";
import { Plus, Trash2, Box } from "lucide-react";
import ImageUploader from "../../components/ImageUploader";
import ConfirmModal from "../../components/ConfirmModal";

interface ProductGroup {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: string;
  type: string;
  is_available: boolean;
  product_group: ProductGroup | null;
  custom_form_code?: string | null;
  sku?: string | null;
  image_url?: string | null;
  created_at: string;
}

const PRODUCT_TYPES = [
  "gift-cards",
  "accounts",
  "currency",
  "items",
  "boosting",
];

const EXAMPLE_CODE = `<input name="discord_username" label="Discord Username" placeholder="e.g. Mahdin#0001" type="text" />
<select name="region" label="Server Region">
  <option value="asia">Asia</option>
  <option value="global">Global</option>
</select>`;

export default function ProductsPage() {
  const { token } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("gift-cards");
  const [productGroupId, setProductGroupId] = useState("");
  const [customFormCode, setCustomFormCode] = useState("");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // List state
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const fetchData = () => {
    Promise.all([
      apiJson<Product[]>("/api/admin/products", token),
      apiJson<ProductGroup[]>("/api/admin/product-groups", token),
    ])
      .then(([prods, grps]) => {
        setProducts(prods);
        setGroups(grps);
        if (grps.length > 0 && !productGroupId) {
          setProductGroupId(String(grps[0].id));
        }
      })
      .catch((err) =>
        setListError(err instanceof Error ? err.message : "Failed to load products"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim() || !price.trim() || !productGroupId) {
      setFormError("Name, price, and category are required.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiJson<{ message: string }>(
        "/api/admin/products",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            price: parseFloat(price),
            type,
            product_group_id: parseInt(productGroupId),
            custom_form_code: customFormCode.trim() || null,
            sku: sku.trim() || null,
            image_url: imageUrl || null,
          }),
        },
      );

      setFormSuccess(data.message || "Product created!");
      setName("");
      setPrice("");
      setType("gift-cards");
      setCustomFormCode("");
      setSku("");
      setImageUrl("");

      // Refresh product list
      apiJson<Product[]>("/api/admin/products", token).then(setProducts);
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
      await apiJson(
        `/api/admin/products/${deleteTarget.id}`,
        token,
        { method: "DELETE" },
      );

      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Delete failed");
      setTimeout(() => setListError(""), 3000);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading products...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Products</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Add Product Form */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-indigo-400" />
            Add New Product
          </h3>

          <form onSubmit={handleAddProduct} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Steam $100 Gift Card"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Price (৳)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("-", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                SKU <span className="text-slate-600 normal-case font-normal">(auto-generated if empty)</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. MC-GC-001"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Category
              </label>
              <select
                value={productGroupId}
                onChange={(e) => setProductGroupId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Product Image ── */}
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              onClear={() => setImageUrl("")}
              label="Product Image (optional)"
              aspectClass="aspect-video"
            />

            {/* ── Custom Checkout Form Code ── */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Custom Checkout Form HTML/Template Code{" "}
                <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={customFormCode}
                onChange={(e) => setCustomFormCode(e.target.value)}
                rows={8}
                spellCheck={false}
                placeholder={EXAMPLE_CODE}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-white outline-none focus:border-indigo-500 placeholder:text-slate-600 resize-y"
              />
              <p className="text-[11px] text-slate-600 mt-1.5">
                Define custom input fields using HTML. Each element's{" "}
                <code className="text-slate-500">name</code> attribute becomes
                the key in the submitted JSON. The{" "}
                <code className="text-slate-500">label</code> attribute is
                displayed above the input. Leave empty for default single-field
                checkout.
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
              {submitting ? "Creating..." : "Add Product"}
            </button>
          </form>
        </div>

        {/* Product List */}
        <div className="lg:col-span-3">
          {listError && (
            <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-sm text-rose-400">
              {listError}
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-slate-800 bg-slate-900/20">
              <Box className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No products yet.</p>
              <p className="text-xs text-slate-600 mt-1">
                Use the form to add your first digital product.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40">
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      SKU
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Price
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {p.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {p.product_group?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase bg-slate-900 px-2 py-1 rounded">
                          {p.type.replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold">
                        ৳{parseFloat(p.price).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(p)}
                          disabled={deletingId === p.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          {deletingId === p.id ? "..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel={deletingId ? "Deleting..." : "Delete Permanently"}
        variant="danger"
        loading={deletingId !== null}
      />
    </div>
  );
}