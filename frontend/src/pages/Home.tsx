import { useEffect, useState } from "react";
import GroupCard from "../components/GroupCard";
import { ProductGroup } from "../data/categories";

export default function Home() {
  const [categories, setCategories] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
      const apiUrl = import.meta.env.VITE_API_URL;
      fetch(`${apiUrl}/api/categories`)
        .then((res) => res.json())
        .then((data) => {
          setCategories(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error communicating with database API:", err);
          setLoading(false);
        });
    }, []);

  if (loading) {
    return <div className="text-center text-white py-20">Loading Shop Categories...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-bold text-white mb-8">Featured Categories</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
}