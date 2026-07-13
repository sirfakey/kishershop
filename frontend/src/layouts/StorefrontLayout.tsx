import { Outlet } from "react-router-dom";
import MarketplaceHeader from "../components/header/MarketplaceHeader";

/**
 * Public storefront layout: renders the marketplace header above the page
 * content. Admin pages do NOT use this layout, so the header never appears
 * in the admin console.
 */
export default function StorefrontLayout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <MarketplaceHeader />
      <Outlet />
    </div>
  );
}
