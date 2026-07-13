import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { apiJson } from "../../lib/api";
import { Settings, Check, Loader2 } from "lucide-react";
import ImageUploader from "../../components/ImageUploader";

interface PublicSettings {
  site_name: string;
  logo_url: string | null;
}

export default function SettingsPage() {
  const { token } = useAuth();
  const { refresh } = useSettings();

  const [siteName, setSiteName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    apiJson<PublicSettings>("/api/settings", token)
      .then((data) => {
        setSiteName(data.site_name || "KisherShop");
        setLogoUrl(data.logo_url || "");
      })
      .catch((err) =>
        setFormError(err instanceof Error ? err.message : "Failed to load branding settings.")
      )
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!siteName.trim()) {
      setFormError("Website Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await apiJson("/api/admin/settings", token, {
        method: "PUT",
        body: JSON.stringify({
          site_name: siteName,
          logo_url: logoUrl || null,
        }),
      });

      setFormSuccess("Branding settings updated successfully!");

      // Refresh the shared SettingsContext so the header updates instantly
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        Loading branding settings...
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-indigo-400" />
        Store Settings
      </h2>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-sm font-bold text-white mb-5">Website Branding</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Website Name
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Eldorado"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Logo Image
            </label>
            <ImageUploader
              value={logoUrl}
              onChange={setLogoUrl}
              onClear={() => setLogoUrl("")}
              label=""
              aspectClass="aspect-video"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Upload a logo image or leave empty to display a styled text-mark of the first letter.
            </p>
          </div>

          {formError && (
            <p className="text-sm font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          {formSuccess && (
            <p className="text-sm font-semibold text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              {formSuccess}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
