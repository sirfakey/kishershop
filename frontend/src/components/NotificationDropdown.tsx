import { useEffect, useState, useRef } from "react";
import type { Announcement } from "../data/categories";
import { apiJson } from "../lib/api";

interface NotificationDropdownProps {
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export default function NotificationDropdown({
  onClose,
  anchorRef,
}: NotificationDropdownProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch active announcements
  useEffect(() => {
    let cancelled = false;
    apiJson<Announcement[]>("/api/notifications", null)
      .then((data) => {
        if (!cancelled) setAnnouncements(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setAnnouncements([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Ignore clicks inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      // Ignore clicks on the anchor (bell button itself) — the header toggles
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 max-w-[calc(100vw-2rem)] w-80 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-40 overflow-hidden"
    >
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="text-sm font-bold text-white">Notifications</p>
      </div>

      {/* Body */}
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Loading...
          </p>
        ) : announcements.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            No new notifications.
          </p>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="border-b border-slate-800/50 px-4 py-3 last:border-b-0 hover:bg-slate-800/30 transition-colors"
            >
              <p className="text-sm font-semibold text-white">{a.title}</p>
              <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                {a.content}
              </p>
              <p className="mt-1 text-[10px] text-slate-600">
                {new Date(a.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
