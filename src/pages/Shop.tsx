import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

interface MerchProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  category: string;
  images: string[];
}

const CATEGORIES = ["All", "Apparel", "Headwear", "Accessories", "Drinkware"];

/* ---------- 12 MilCrunch products (fallback when DB is empty) ---------- */
const SEED_PRODUCTS: MerchProduct[] = [
  { id: "mc-classic-hoodie", title: "MilCrunch Classic Hoodie", price: 64.99, compare_at_price: 79.99, category: "Apparel", images: ["https://placehold.co/600x600/1a1a2e/ffffff?text=MilCrunch%0AClassic+Hoodie"] },
  { id: "mc-veteran-tee", title: "MilCrunch Veteran Tee", price: 34.99, compare_at_price: 44.99, category: "Apparel", images: ["https://placehold.co/600x600/0c2340/ffffff?text=MilCrunch%0AVeteran+Tee"] },
  { id: "mc-crew-tee", title: "MilCrunch Crew Tee", price: 29.99, compare_at_price: null, category: "Apparel", images: ["https://placehold.co/600x600/3a3a3a/ffffff?text=MilCrunch%0ACrew+Tee"] },
  { id: "mc-creator-hoodie", title: "MilCrunch Creator Hoodie", price: 69.99, compare_at_price: null, category: "Apparel", images: ["https://placehold.co/600x600/2d4a1e/ffffff?text=MilCrunch%0ACreator+Hoodie"] },
  { id: "mc-snapback", title: "MilCrunch Snapback", price: 32.99, compare_at_price: null, category: "Headwear", images: ["https://placehold.co/600x600/111111/ffffff?text=MilCrunch%0ASnapback"] },
  { id: "mc-tactical-cap", title: "MilCrunch Tactical Cap", price: 28.99, compare_at_price: null, category: "Headwear", images: ["https://placehold.co/600x600/4b5320/ffffff?text=MilCrunch%0ATactical+Cap"] },
  { id: "mc-command-mug", title: "MilCrunch Command Mug", price: 18.99, compare_at_price: null, category: "Drinkware", images: ["https://placehold.co/600x600/1c1c1c/ffffff?text=MilCrunch%0ACommand+Mug"] },
  { id: "mc-hydro-bottle", title: "MilCrunch Hydro Bottle", price: 34.99, compare_at_price: null, category: "Drinkware", images: ["https://placehold.co/600x600/1e3a5f/ffffff?text=MilCrunch%0AHydro+Bottle"] },
  { id: "mc-tumbler", title: "MilCrunch Creator Tumbler", price: 24.99, compare_at_price: null, category: "Drinkware", images: ["https://placehold.co/600x600/1a1a1a/d4a843?text=MilCrunch%0ACreator+Tumbler"] },
  { id: "mc-sticker-pack", title: "MilCrunch Sticker Pack", price: 9.99, compare_at_price: null, category: "Accessories", images: ["https://placehold.co/600x600/f0f0f0/0c2340?text=MilCrunch%0ASticker+Pack"] },
  { id: "mc-laptop-sleeve", title: "MilCrunch Laptop Sleeve", price: 39.99, compare_at_price: null, category: "Accessories", images: ["https://placehold.co/600x600/0a1628/ffffff?text=MilCrunch%0ALaptop+Sleeve"] },
  { id: "mc-patch-set", title: "MilCrunch Patch Set", price: 14.99, compare_at_price: null, category: "Accessories", images: ["https://placehold.co/600x600/4b5320/ffffff?text=MilCrunch%0APatch+Set"] },
];

export default function Shop() {
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    supabase
      .from("merch_products")
      .select("id, title, price, compare_at_price, category, images")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data as MerchProduct[] | null) || [];
        setProducts(rows.length > 0 ? rows : SEED_PRODUCTS);
        setLoading(false);
      });
  }, []);

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
            {CATEGORIES.map((cat) => (
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
