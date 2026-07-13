import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { SingleCategoryResponse, Product } from "../data/categories";
import CheckoutModal from "../components/CheckoutModal";

// Master dictionary for matching backend keys to pretty frontend tab names
const TAB_LABELS: Record<string, string> = {
  all: "All Products",
  accounts: "Accounts",
  currency: "In-Game Currency",
  items: "Items",
  boosting: "Boosting",
  "gift-cards": "Gift Cards",
};

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get("type");

  const [category, setCategory] = useState<SingleCategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    if (urlType) {
      setActiveTab(urlType);
    }
  }, [urlType]);

  // Track the previous slug to reset loading during the render phase safely
  const [prevSlug, setPrevSlug] = useState(slug);
  if (slug !== prevSlug) {
    setPrevSlug(slug);
    setLoading(true);
  }

  useEffect(() => {
    // No synchronous setLoading(true) here anymore!
    const apiUrl = import.meta.env.VITE_API_URL;
    
    fetch(`${apiUrl}/api/categories/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Category not found");
        return res.json();
      })
      .then((data) => {
        setCategory(data);
        setLoading(false);
        setActiveTab("all");
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return <div className="text-center text-white py-20 bg-slate-950 min-h-screen">Loading Storefront...</div>;
  }

  if (!category) {
    return <div className="text-center text-white py-20 bg-slate-950 min-h-screen">Category not found.</div>;
  }

  // Calculate unique product types present in this specific category
  const uniqueTypes = new Set(category.products.map((product) => product.type));
  
  // Build the navigation tabs dynamic list
  const dynamicTabs = [
    { key: "all", label: TAB_LABELS["all"] },
    ...Array.from(uniqueTypes).map((type) => ({
      key: type,
      label: TAB_LABELS[type] || type.replace("-", " "),
    })),
  ];

  // Filter products based on selected tab
  const filteredProducts = activeTab === "all"
    ? category.products
    : category.products.filter((product) => product.type === activeTab);


  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Banner & Header */}
      <div className="px-6 py-8 border-b border-slate-900 bg-slate-900/20">
        <div className="mx-auto max-w-7xl">
          <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-indigo-400 transition-colors">&larr; BACK TO SHOP</Link>
          <h1 className="text-3xl font-black mt-2 tracking-tight">{category.name} Marketplace</h1>
        </div>
      </div>

      {/* Dynamic Sub-Navigation Bar */}
      <div className="sticky top-[112px] z-40 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6">
        <div className="mx-auto max-w-7xl flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {dynamicTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-4 text-sm font-bold transition-all whitespace-nowrap outline-none ${
                  isActive ? "text-amber-400 font-extrabold" : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex flex-col rounded-xl border border-slate-900 bg-slate-900/20 p-5 transition-all hover:border-slate-800"
            >
              {/* ── Upper Row: Details + Image side-by-side ── */}
              <div className="flex items-center justify-between w-full gap-4">
                {/* Text details (left) */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase bg-slate-900 px-2 py-1 rounded">
                    {product.type.replace("-", " ")}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-3 truncate">{product.name}</h3>
                  <p className="mt-1 text-2xl font-black text-emerald-400">
                    ৳{parseFloat(product.price).toLocaleString()}
                  </p>
                </div>

                {/* Mandatory image frame (right) */}
                <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const parent = (e.target as HTMLImageElement).parentElement!;
                        parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 md:w-9 md:h-9 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>`;
                      }}
                    />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 md:w-9 md:h-9 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* ── Purchase Button (full-width below the row) ── */}
              <button
                onClick={() => setSelectedProduct(product)}
                className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500 transition-colors"
              >
                Instant Top-Up
              </button>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center text-slate-600 py-20 font-medium">
            No active listings found under this classification tab.
          </div>
        )}
      </div>

      {/* Checkout Overlay Modal Mount */}
      {selectedProduct && (
        <CheckoutModal 
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => {
            setSelectedProduct(null);
            setPurchaseSuccess(true);
            setTimeout(() => setPurchaseSuccess(false), 5000); // Hide toast after 5 seconds
          }}
        />
      )}

      {/* Success Notification Alert Toast */}
      {purchaseSuccess && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-500 bg-slate-900 px-6 py-4 shadow-xl text-emerald-400 font-bold">
          🎉 Purchase Completed! Your transaction log has saved securely.
        </div>
      )}
    </div>
  );
}