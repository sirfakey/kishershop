import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  Settings,
  LogOut,
  ArrowLeftRight,
  Megaphone,
  Tag,
  ShieldBan,
  Users,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderOpen },
  { to: "/admin/trades", label: "Trade Requests", icon: ArrowLeftRight },
  { to: "/admin/coupons", label: "Coupons", icon: Tag },
  { to: "/admin/fraud-radar", label: "Fraud Radar", icon: ShieldBan },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  const sidebarContent = (
    <>
      {/* Brand + close button */}
      <div className="flex items-center justify-between px-5 py-6 border-b border-slate-800">
        <h1 className="text-lg font-black text-white tracking-tight">
          Kisher.Shop
        </h1>
        <button
          onClick={closeSidebar}
          className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-2">
        <p className="text-xs text-slate-500 truncate px-1">
          {user?.email}
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Desktop sidebar (always visible on lg+) ── */}
      <aside className="hidden lg:flex w-64 border-r border-slate-800 bg-slate-900/40 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSidebar}
          />
          {/* Slide-in drawer */}
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-800 bg-slate-900 shadow-2xl flex flex-col animate-[slideIn_200ms_ease-out]">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* ── Mobile top bar ── */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold text-white tracking-tight">Kisher.Shop Admin</h2>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}