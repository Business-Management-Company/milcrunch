import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Loader2, ShoppingBag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

interface Variant {
  name: string;
  price_override: number | null;
  inventory: number;
}

interface MerchProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category: string;
  tags: string[];
  images: string[];
  variants: Variant[];
  total_inventory: number;
}

const SEED_PRODUCTS: MerchProduct[] = [
  { id: "mc-classic-hoodie", title: "MilCrunch Classic Hoodie", description: "Black hoodie with MilCrunch logo on chest. Premium heavyweight cotton blend with ribbed cuffs and hem.", price: 64.99, compare_at_price: 79.99, category: "Apparel", tags: ["hoodie", "apparel", "bestseller"], images: ["https://placehold.co/600x600/1a1a2e/ffffff?text=MilCrunch%0AClassic+Hoodie"], variants: [{ name: "S", price_override: null, inventory: 25 }, { name: "M", price_override: null, inventory: 40 }, { name: "L", price_override: null, inventory: 40 }, { name: "XL", price_override: null, inventory: 30 }, { name: "2XL", price_override: null, inventory: 15 }], total_inventory: 150 },
  { id: "mc-veteran-tee", title: "MilCrunch Veteran Tee", description: "Navy blue t-shirt with \"MilCrunch\" wordmark across the chest. 100% combed cotton, preshrunk.", price: 34.99, compare_at_price: 44.99, category: "Apparel", tags: ["tee", "veteran"], images: ["https://placehold.co/600x600/0c2340/ffffff?text=MilCrunch%0AVeteran+Tee"], variants: [{ name: "S", price_override: null, inventory: 30 }, { name: "M", price_override: null, inventory: 50 }, { name: "L", price_override: null, inventory: 50 }, { name: "XL", price_override: null, inventory: 30 }], total_inventory: 160 },
  { id: "mc-crew-tee", title: "MilCrunch Crew Tee", description: "Dark grey tee with small MilCrunch \"X\" logo on left chest. Relaxed fit, perfect for everyday wear.", price: 29.99, compare_at_price: null, category: "Apparel", tags: ["tee", "crew"], images: ["https://placehold.co/600x600/3a3a3a/ffffff?text=MilCrunch%0ACrew+Tee"], variants: [{ name: "S", price_override: null, inventory: 30 }, { name: "M", price_override: null, inventory: 45 }, { name: "L", price_override: null, inventory: 45 }, { name: "XL", price_override: null, inventory: 30 }], total_inventory: 150 },
  { id: "mc-creator-hoodie", title: "MilCrunch Creator Hoodie", description: "Military green hoodie with \"Built by Veterans. Powered by Creators.\" printed on the back. Kangaroo pocket, double-lined hood.", price: 69.99, compare_at_price: null, category: "Apparel", tags: ["hoodie", "creator"], images: ["https://placehold.co/600x600/2d4a1e/ffffff?text=MilCrunch%0ACreator+Hoodie"], variants: [{ name: "S", price_override: null, inventory: 20 }, { name: "M", price_override: null, inventory: 35 }, { name: "L", price_override: null, inventory: 35 }, { name: "XL", price_override: null, inventory: 25 }, { name: "2XL", price_override: null, inventory: 10 }], total_inventory: 125 },
  { id: "mc-snapback", title: "MilCrunch Snapback", description: "Black snapback with embroidered MilCrunch logo on front. Adjustable snap closure, structured crown.", price: 32.99, compare_at_price: null, category: "Headwear", tags: ["hat", "snapback"], images: ["https://placehold.co/600x600/111111/ffffff?text=MilCrunch%0ASnapback"], variants: [{ name: "One Size", price_override: null, inventory: 75 }], total_inventory: 75 },
  { id: "mc-tactical-cap", title: "MilCrunch Tactical Cap", description: "OD green fitted cap with embroidered MilCrunch velcro patch. Moisture-wicking sweatband.", price: 28.99, compare_at_price: null, category: "Headwear", tags: ["hat", "tactical"], images: ["https://placehold.co/600x600/4b5320/ffffff?text=MilCrunch%0ATactical+Cap"], variants: [{ name: "S/M", price_override: null, inventory: 40 }, { name: "L/XL", price_override: null, inventory: 40 }], total_inventory: 80 },
  { id: "mc-command-mug", title: "MilCrunch Command Mug", description: "Matte black ceramic mug with MilCrunch logo. 12oz capacity, dishwasher and microwave safe.", price: 18.99, compare_at_price: null, category: "Drinkware", tags: ["mug", "drinkware"], images: ["https://placehold.co/600x600/1c1c1c/ffffff?text=MilCrunch%0ACommand+Mug"], variants: [], total_inventory: 200 },
  { id: "mc-hydro-bottle", title: "MilCrunch Hydro Bottle", description: "32oz insulated stainless steel water bottle. Double-wall vacuum insulation keeps drinks cold 24hrs or hot 12hrs.", price: 34.99, compare_at_price: null, category: "Drinkware", tags: ["bottle", "drinkware"], images: ["https://placehold.co/600x600/1e3a5f/ffffff?text=MilCrunch%0AHydro+Bottle"], variants: [], total_inventory: 100 },
  { id: "mc-tumbler", title: "MilCrunch Creator Tumbler", description: "20oz tumbler, matte black with gold MilCrunch wordmark. Splash-proof lid, fits standard cupholders.", price: 24.99, compare_at_price: null, category: "Drinkware", tags: ["tumbler", "drinkware"], images: ["https://placehold.co/600x600/1a1a1a/d4a843?text=MilCrunch%0ACreator+Tumbler"], variants: [], total_inventory: 120 },
  { id: "mc-sticker-pack", title: "MilCrunch Sticker Pack", description: "5-pack vinyl die-cut stickers with MilCrunch logos and military-themed designs. Weatherproof, UV-resistant.", price: 9.99, compare_at_price: null, category: "Accessories", tags: ["stickers", "accessories"], images: ["https://placehold.co/600x600/f0f0f0/0c2340?text=MilCrunch%0ASticker+Pack"], variants: [], total_inventory: 500 },
  { id: "mc-laptop-sleeve", title: "MilCrunch Laptop Sleeve", description: "15\" neoprene laptop sleeve, dark navy with embossed MilCrunch logo. Padded interior, water-resistant exterior.", price: 39.99, compare_at_price: null, category: "Accessories", tags: ["laptop", "sleeve"], images: ["https://placehold.co/600x600/0a1628/ffffff?text=MilCrunch%0ALaptop+Sleeve"], variants: [], total_inventory: 60 },
  { id: "mc-patch-set", title: "MilCrunch Patch Set", description: "Velcro-backed morale patches, 3-pack. Includes MilCrunch logo, X emblem, and \"Mission Ready\" patch.", price: 14.99, compare_at_price: null, category: "Accessories", tags: ["patches", "morale"], images: ["https://placehold.co/600x600/4b5320/ffffff?text=MilCrunch%0APatch+Set"], variants: [], total_inventory: 300 },
];

export default function ShopProduct() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [product, setProduct] = useState<MerchProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    supabase
      .from("merch_products")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .single()
      .then(({ data, error }) => {
        let p: MerchProduct | null = null;
        if (!error && data) {
          p = data as MerchProduct;
        } else {
          // Fall back to seed data
          p = SEED_PRODUCTS.find((s) => s.id === id) || null;
        }
        if (p) {
          setProduct(p);
          if (p.variants?.length > 0) setSelectedVariant(p.variants[0].name);
        }
        setLoading(false);
      });
  }, [id]);

  const handleAddToCart = () => {
    toast({
      title: "Coming Soon!",
      description: "Check back soon for online ordering.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] text-white">
        <PublicNav />
        <div className="flex items-center justify-center pt-14 min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] text-white">
        <PublicNav />
        <div className="flex flex-col items-center justify-center pt-14 min-h-[60vh]">
          <ShoppingBag className="h-16 w-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">Product not found</h2>
          <Link to="/shop" className="text-[#1e3a5f] hover:underline">Back to shop</Link>
        </div>
      </div>
    );
  }

  const images = product.images?.filter(Boolean) || [];
  const currentVariant = product.variants?.find((v) => v.name === selectedVariant);
  const displayPrice = currentVariant?.price_override || product.price;

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-white">
      <PublicNav />
      <div className="pt-14">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to shop
          </Link>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div>
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/30 to-gray-900 mb-3">
                {images.length > 0 ? (
                  <img
                    src={images[mainImage] || images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-24 w-24 text-blue-800/50" />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setMainImage(i)}
                      className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        mainImage === i ? "border-[#1e3a5f]" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <Badge variant="outline" className="w-fit text-xs text-gray-400 border-gray-600 mb-3">
                {product.category}
              </Badge>

              <h1 className="text-3xl font-bold mb-4">{product.title}</h1>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-bold text-[#1e3a5f]">${displayPrice.toFixed(2)}</span>
                {product.compare_at_price && (
                  <span className="text-lg text-gray-500 line-through">${product.compare_at_price.toFixed(2)}</span>
                )}
              </div>

              {product.description && (
                <p className="text-gray-400 leading-relaxed mb-6">{product.description}</p>
              )}

              {/* Variant selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Size / Color</label>
                  <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                    <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {product.variants.map((v) => (
                        <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Add to Cart */}
              <Button
                onClick={handleAddToCart}
                size="lg"
                className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white rounded-xl py-6 text-base font-semibold"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs text-gray-400 border-gray-700">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
