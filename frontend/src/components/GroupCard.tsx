import { Link } from "react-router-dom"; // <-- Make sure this import is added at the very top!
import { ProductGroup } from "../data/categories";

interface GroupCardProps {
  group: ProductGroup;
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <div className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10">
      <div className="aspect-video w-full overflow-hidden bg-slate-800">
        <img 
          src={group.image_url} 
          alt={group.name} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white transition-colors group-hover:text-indigo-400">
            {group.name}
          </h3>
          </div>

        {/* Changed from a raw <button> to an active routing <Link> */}
        <Link 
          to={`/category/${group.slug}`} 
          className="mt-4 block w-full text-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Browse Store
        </Link>
      </div>
    </div>
  );
}

export default GroupCard;