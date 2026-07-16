import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { ArrowLeftRight, CreditCard } from "lucide-react";

export default function Footer() {
  const { siteName, logoUrl } = useSettings();

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      {/* Top section */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* ── Brand ── */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="h-8 w-8 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-lg font-black text-slate-900">
                  {siteName.charAt(0) || "K"}
                </span>
              )}
              <span className="text-lg font-extrabold tracking-tight text-white">
                {siteName}
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Bangladesh&rsquo;s trusted digital marketplace for gaming keys,
              gift cards, top-ups, and game accounts. Fast delivery, secure
              payments, and 24/7 support.
            </p>
          </div>

          {/* ── Quick Links ── */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Home", to: "/" },
                { label: "Trade / Exchange", to: "/trade" },
                { label: "My Account", to: "/account" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Payment Methods ── */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              <CreditCard className="inline h-3.5 w-3.5 mr-1.5" />
              We Accept
            </h4>
            <div className="flex items-center gap-4">
              {/* bKash */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                <img
                  src="/bkash-logo.png"
                  alt="bKash"
                  className="h-7 w-7 rounded object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs font-bold text-rose-400">bKash</span>
              </div>
              {/* Nagad */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                <img
                  src="/nagad-logo.png"
                  alt="Nagad"
                  className="h-7 w-7 rounded object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs font-bold text-orange-400">Nagad</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Pay securely via personal bKash or Nagad. Your transaction is
              processed manually by our team for maximum safety.
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-slate-800/60">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            &copy; {currentYear} {siteName}. All rights reserved.
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1.5">
            <ArrowLeftRight className="h-3 w-3" />
            Built for Bangladeshi gamers
          </p>
        </div>
      </div>
    </footer>
  );
}