import { Link } from "react-router-dom"; // <-- Make sure this import is added at the very top!
import { ProductGroup } from "../data/categories";

interface GroupCardProps {
  group: ProductGroup;
}

export function GroupCard({ group }: GroupCardProps) {
  const productCount = group.products?.length ?? 0;

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
      {/* Image with gradient overlay at bottom only */}
      <div className="aspect-video w-full overflow-hidden rounded-t-xl relative">
        <img
          src={group.image_url}
          alt={group.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-white transition-colors group-hover:text-purple-400">
          {group.name}
        </h3>

        {/* Product count */}
        <p className="mt-1 text-xs font-medium text-slate-400">
          {productCount} Product{productCount !== 1 ? "s" : ""} Available
        </p>

        <Link
          to={`/category/${group.slug}`}
          className="mt-4 block w-full text-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
        >
          Browse Store
        </Link>
      </div>
    </div>
  );
}

export default GroupCard;