import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUpload } from "../lib/api";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploaderProps {
  /** Currently stored image URL (existing value) */
  value: string;
  /** Called with the new image URL after upload */
  onChange: (url: string) => void;
  /** Called to clear the image */
  onClear: () => void;
  /** Aspect ratio container class, e.g. "aspect-video" */
  aspectClass?: string;
  /** Label shown above the upload zone */
  label?: string;
  /** Optional placeholder image URL for onError fallback */
  placeholder?: string;
}

export default function ImageUploader({
  value,
  onChange,
  onClear,
  aspectClass = "aspect-video",
  label = "Image",
}: ImageUploaderProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      // Only take the first image
      const file = fileArr[0];

      // Validate type
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
      if (!allowed.includes(file.type)) {
        setUploadError("Only JPEG, PNG, GIF, WebP, and SVG images are allowed.");
        return;
      }

      // Validate size (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("Image must be under 10 MB.");
        return;
      }

      setUploadError("");
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("images[]", file);

        const result = await apiUpload("/api/admin/upload", token, formData);
        if (result.urls.length > 0) {
          onChange(result.urls[0]);
          setImgError(false);
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [token, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  // ── Renders ────────────────────────────────────────────────────────

  // Show uploaded image
  if (value && !imgError) {
    return (
      <div>
        {label && (
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {label}
          </span>
        )}
        <div
          className={`relative group overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60 ${aspectClass}`}
        >
          <img
            src={value}
            alt="Uploaded"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
          {/* Hover overlay with replace/remove buttons */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                onClear();
                setImgError(false);
              }}
              className="rounded-lg bg-rose-600/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
        {uploading && (
          <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading...
          </p>
        )}
      </div>
    );
  }

  // No image yet — show drop zone
  return (
    <div>
      {label && (
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </span>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${aspectClass} ${
          dragOver
            ? "border-indigo-400 bg-indigo-500/10"
            : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Uploading image...</p>
          </>
        ) : (
          <>
            <div className="rounded-full bg-slate-800 p-3">
              <Upload className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400 font-medium">
                Drag & drop or{" "}
                <span className="text-indigo-400">browse</span>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                JPEG, PNG, GIF, WebP, SVG — max 10 MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {uploadError && (
        <p className="mt-1.5 text-xs font-semibold text-rose-400 flex items-center gap-1">
          <X className="w-3 h-3" />
          {uploadError}
        </p>
      )}
    </div>
  );
}
