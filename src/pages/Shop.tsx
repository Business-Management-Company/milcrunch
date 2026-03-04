import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import { MERCH_PRODUCTS, CATEGORIES, applyOverrides } from "@/data/merch-products";
import type { MerchOverride } from "@/data/merch-products";

const ALL_CATEGORIES = ["All", ...CATEGORIES];

export default function Shop() {
  const [overrides, setOverrides] = useState<MerchOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    supabase
      .from("merch_overrides")
      .select("*")
      .then(({ data }) => {
        setOverrides((data as MerchOverride[] | null) || []);
        setLoading(false);
      });
  }, []);

  const products = applyOverrides(MERCH_PRODUCTS, overrides);
  const filtered = activeCategory === "All"
    ? products
    : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-white">
      <PublicNav />
      <div className="pt-14">
        {/* Hero */}
        <div className="bg-gradient-to-b from-[#1A1A2E] to-[#0D0D1A] py-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              MilCrunch<span className="text-[#3b82f6] font-extrabold">X</span> Merch
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Official gear for the military creator community
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-[#1e3a5f] text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-xl font-medium text-gray-400">
                {activeCategory === "All" ? "No products available yet" : `No ${activeCategory} products`}
              </p>
              <p className="text-gray-500 mt-2">Check back soon for new drops!</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  to={`/shop/${p.id}`}
                  className="group block rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-[#1e3a5f]/50 hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="h-64 bg-gradient-to-br from-blue-900/30 to-gray-900 flex items-center justify-center overflow-hidden">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <ShoppingBag className="h-16 w-16 text-blue-800/50" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-[#1e3a5f] transition-colors">
                      {p.title}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-lg">${p.price.toFixed(2)}</span>
                      {p.compare_at_price && (
                        <span className="text-sm text-gray-500 line-through">${p.compare_at_price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
