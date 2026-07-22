import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { SingleCategoryResponse, Product } from "../data/categories";
import { apiJson } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import JsonLd from "../components/JsonLd";
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
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // ── Per-card quantity state ──
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const getQty = (productId: number) => quantities[productId] ?? 1;
  const setQty = (productId: number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(1, qty) }));
  };

  // Dynamic SEO for this category page
  const seoTitle = category ? `${category.name} Marketplace` : undefined;
  const seoDescription = category
    ? `Buy ${category.name} in Bangladesh — game keys, gift cards, accounts, currency, and boosting. Instant delivery with bKash & Nagad.`
    : undefined;
  useSEO({ title: seoTitle, description: seoDescription, path: `/category/${slug}` });

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
    apiJson<SingleCategoryResponse>(`/api/categories/${slug}`, null)
      .then((data) => {
        setCategory(data);
        setActiveTab("all");
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
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
      <JsonLd
        id="category"
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${category.name} Marketplace — Kisher.Shop`,
          url: `https://kisher.shop/category/${category.slug}`,
          description: seoDescription,
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://kisher.shop/" },
              { "@type": "ListItem", position: 2, name: category.name, item: `https://kisher.shop/category/${category.slug}` },
            ],
          },
        }}
      />
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
          {filteredProducts.map((product) => {
              const currentPrice = parseFloat(product.price);
              const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
              const explicitDiscount = product.discount_percentage && product.discount_percentage > 0;
              const computedDiscount = originalPrice && originalPrice > currentPrice;
              const hasDiscount = explicitDiscount || computedDiscount;
              const discountPct = explicitDiscount
                ? product.discount_percentage!
                : computedDiscount
                  ? Math.round(((originalPrice! - currentPrice) / originalPrice!) * 100)
                  : 0;

              const discountBadgeColors =
                discountPct < 10
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  : discountPct < 25
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-purple-500/20 text-purple-400 border-purple-500/30";

              return (
                <div
                  key={product.id}
                  className="flex flex-col h-full rounded-xl border border-slate-800/60 bg-slate-900/30 p-5 transition-all hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
                >
                  {/* ── Top: Type tag + Title + Image ── */}
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        {product.type.replace("-", " ")}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1 leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                    </div>

                    {/* Image — rigid, subtle border, vertically centered */}
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 flex items-center justify-center">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const parent = (e.target as HTMLImageElement).parentElement!;
                            parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>`;
                          }}
                        />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* ── Footer: pinned to bottom via mt-auto ── */}
                  <div className="mt-auto flex flex-col gap-3 w-full">
                    {(() => {
                      const qty = getQty(product.id);
                      const displayTotal = currentPrice * qty;
                      return (
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xl font-black text-teal-400">
                            ৳{displayTotal.toLocaleString()}
                          </span>
                          {qty > 1 && (
                            <span className="text-[11px] text-slate-500">
                              ({qty} × ৳{currentPrice.toLocaleString()})
                            </span>
                          )}
                          {originalPrice && originalPrice > currentPrice && (
                            <span className="text-xs text-slate-500 line-through">
                              ৳{(originalPrice * qty).toLocaleString()}
                            </span>
                          )}
                          {hasDiscount && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${discountBadgeColors}`}
                            >
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Quantity selector + Buy Now ── */}
                    <div className="flex items-center gap-2">
                      {/* Compact quantity selector */}
                      <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold text-white overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQty(product.id, getQty(product.id) - 1);
                          }}
                          className="px-2.5 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors select-none"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center text-sm tabular-nums select-none">
                          {getQty(product.id)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQty(product.id, getQty(product.id) + 1);
                          }}
                          className="px-2.5 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors select-none"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Buy Now — takes remaining space */}
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setSelectedQuantity(getQty(product.id));
                        }}
                        className="flex-grow rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
          quantity={selectedQuantity}
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