import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import StorefrontLayout from "./layouts/StorefrontLayout";
import Home from "./pages/Home";
import CategoryPage from "./pages/CategoryPage";
import AccountPage from "./pages/customer/AccountPage";
import LoginPage from "./pages/admin/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import OrdersPage from "./pages/admin/OrdersPage";
import ProductsPage from "./pages/admin/ProductsPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import SettingsPage from "./pages/admin/SettingsPage";
import TradesPage from "./pages/admin/TradesPage";
import AnnouncementsPage from "./pages/admin/AnnouncementsPage";
import CouponsPage from "./pages/admin/CouponsPage";
import FraudRadarPage from "./pages/admin/FraudRadarPage";
import UsersPage from "./pages/admin/UsersPage";

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <Router>
              <Routes>
                {/* Public Storefront */}
                <Route element={<StorefrontLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/account" element={<AccountPage />} />
                </Route>

                {/* Admin Auth (public) */}
                <Route path="/admin/login" element={<LoginPage />} />

                {/* Protected Admin Console */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="trades" element={<TradesPage />} />
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route path="coupons" element={<CouponsPage />} />
                  <Route path="fraud-radar" element={<FraudRadarPage />} />
                  <Route path="users" element={<UsersPage />} />
                </Route>
              </Routes>
            </Router>
          </CustomerAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
