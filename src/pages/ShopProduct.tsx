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
        if (error || !data) {
          setProduct(null);
        } else {
          const p = data as MerchProduct;
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
          <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
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
          <Link to="/shop" className="text-[#6C5CE7] hover:underline">Back to shop</Link>
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
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/30 to-gray-900 mb-3">
                {images.length > 0 ? (
                  <img
                    src={images[mainImage] || images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-24 w-24 text-purple-700/50" />
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
                        mainImage === i ? "border-[#6C5CE7]" : "border-transparent opacity-60 hover:opacity-100"
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
                <span className="text-3xl font-bold text-[#6C5CE7]">${displayPrice.toFixed(2)}</span>
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
                className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl py-6 text-base font-semibold"
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
