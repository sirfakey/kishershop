import { useEffect, useState } from "react";
import GroupCard from "../components/GroupCard";
import { ProductGroup } from "../data/categories";
import { apiJson } from "../lib/api";
import { useSEO } from "../lib/useSEO";

export default function Home() {
  const [categories, setCategories] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: undefined,
    description:
      "Shop game keys, gift cards, mobile top-ups, game accounts, and boosting services in Bangladesh. Instant delivery, bKash & Nagad payments, 24/7 support.",
    path: "/",
  });

    useEffect(() => {
      apiJson<ProductGroup[]>("/api/categories", null)
        .then((data) => {
          setCategories(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Error communicating with database API:", err);
        })
        .finally(() => setLoading(false));
    }, []);

  if (loading) {
    return <div className="text-center text-white py-20">Loading Shop Categories...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Visually-hidden h1 for SEO — keeps the main keyword prominent without
            cluttering the layout. The on-screen heading stays as-is. */}
        <h1 className="sr-only">
          Kisher.Shop — Buy Game Keys, Gift Cards, Top-Ups & Game Accounts in Bangladesh
        </h1>
        <h2 className="text-2xl font-bold text-white mb-8">Featured Categories</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>

        {/* SEO-friendly descriptive content — helps search engines understand the
            site's purpose and gives crawlers real text to index. */}
        <section className="mt-16 max-w-3xl">
          <h2 className="text-xl font-bold text-white mb-3">
            Bangladesh&rsquo;s Digital Gaming Marketplace
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Kisher.Shop is your trusted destination for digital gaming products in
            Bangladesh. Browse game keys, gift cards, in-game currency, mobile
            top-ups, verified game accounts, and professional boosting services.
            We accept bKash and Nagad payments, with fast delivery and 24/7
            customer support. Every purchase is handled securely by our team to
            ensure you get what you paid for, every time.
          </p>
        </section>
      </div>
    </div>
  );
}