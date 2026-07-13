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
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderOpen },
  { to: "/admin/trades", label: "Trade Requests", icon: ArrowLeftRight },
  { to: "/admin/coupons", label: "Coupons", icon: Tag },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-6 border-b border-slate-800">
          <h1 className="text-lg font-black text-white tracking-tight">
            KisherShop
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}