import { Outlet } from "react-router-dom";
import MarketplaceHeader from "../components/header/MarketplaceHeader";
import Footer from "../components/Footer";

/**
 * Public storefront layout: renders the marketplace header above the page
 * content and a footer below. Admin pages do NOT use this layout.
 */
export default function StorefrontLayout() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <MarketplaceHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
