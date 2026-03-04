export interface MerchVariant {
  name: string;
  price_override: number | null;
  inventory: number;
}

export interface MerchProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  category: string;
  tags: string[];
  images: string[];
  variants: MerchVariant[];
  total_inventory: number;
}

export interface MerchOverride {
  product_id: string;
  image_url: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  compare_at_price: number | null;
  category: string | null;
}

export const CATEGORIES = ["Apparel", "Headwear", "Accessories", "Drinkware"];

export const MERCH_PRODUCTS: MerchProduct[] = [
  { id: "mc-veteran-hoodie", title: "MilCrunch Veteran Hoodie", description: "Premium heavyweight hoodie with embroidered MilCrunch logo. Built for veterans who build.", price: 59.99, compare_at_price: 74.99, category: "Apparel", tags: ["hoodie", "veteran"], images: ["https://placehold.co/600x600/1e293b/ffffff?text=MilCrunch%0AVeteran+Hoodie"], variants: [{ name: "S", price_override: null, inventory: 25 }, { name: "M", price_override: null, inventory: 40 }, { name: "L", price_override: null, inventory: 40 }, { name: "XL", price_override: null, inventory: 30 }, { name: "2XL", price_override: null, inventory: 15 }], total_inventory: 150 },
  { id: "mc-creator-tee", title: "MilCrunch Creator Tee", description: "Soft tri-blend tee with MilCrunch wordmark. The unofficial uniform of military creators.", price: 34.99, compare_at_price: 44.99, category: "Apparel", tags: ["tee", "creator"], images: ["https://placehold.co/600x600/1e293b/ffffff?text=MilCrunch%0ACreator+Tee"], variants: [{ name: "S", price_override: null, inventory: 30 }, { name: "M", price_override: null, inventory: 50 }, { name: "L", price_override: null, inventory: 50 }, { name: "XL", price_override: null, inventory: 30 }], total_inventory: 160 },
  { id: "mc-milspousefest-tee", title: "MilSpouseFest Official Tee", description: "Event exclusive tee for MilSpouseFest attendees and supporters.", price: 29.99, compare_at_price: null, category: "Apparel", tags: ["tee", "milspousefest", "event"], images: ["https://placehold.co/600x600/7c3aed/ffffff?text=MilSpouseFest%0AOfficial+Tee"], variants: [{ name: "S", price_override: null, inventory: 30 }, { name: "M", price_override: null, inventory: 45 }, { name: "L", price_override: null, inventory: 45 }, { name: "XL", price_override: null, inventory: 30 }], total_inventory: 150 },
  { id: "mc-milcon-hoodie", title: "Military Influencer Conference Hoodie", description: "Limited edition MilCon 2026 hoodie. Premium fleece, embroidered patch.", price: 64.99, compare_at_price: 79.99, category: "Apparel", tags: ["hoodie", "milcon", "event"], images: ["https://placehold.co/600x600/1e293b/f59e0b?text=MilCon+2026%0AHoodie"], variants: [{ name: "S", price_override: null, inventory: 20 }, { name: "M", price_override: null, inventory: 35 }, { name: "L", price_override: null, inventory: 35 }, { name: "XL", price_override: null, inventory: 25 }, { name: "2XL", price_override: null, inventory: 10 }], total_inventory: 125 },
  { id: "mc-snapback", title: "MilCrunch Snapback", description: "Structured snapback with embroidered MilCrunch logo. One size fits all.", price: 28.99, compare_at_price: 34.99, category: "Headwear", tags: ["hat", "snapback"], images: ["https://placehold.co/600x600/1e293b/ffffff?text=MilCrunch%0ASnapback"], variants: [{ name: "One Size", price_override: null, inventory: 75 }], total_inventory: 75 },
  { id: "mc-tactical-cap", title: "MilCrunch Tactical Cap", description: "Low-profile fitted cap with subdued MilCrunch patch. Range ready.", price: 32.99, compare_at_price: null, category: "Headwear", tags: ["hat", "tactical"], images: ["https://placehold.co/600x600/4b5563/ffffff?text=MilCrunch%0ATactical+Cap"], variants: [{ name: "S/M", price_override: null, inventory: 40 }, { name: "L/XL", price_override: null, inventory: 40 }], total_inventory: 80 },
  { id: "mc-coffee-mug", title: "MilCrunch Coffee Mug", description: "15oz ceramic mug. \"Powered by Coffee & MilCrunch\" on the back.", price: 18.99, compare_at_price: null, category: "Drinkware", tags: ["mug", "drinkware"], images: ["https://placehold.co/600x600/ffffff/1e293b?text=MilCrunch%0ACoffee+Mug"], variants: [], total_inventory: 200 },
  { id: "mc-water-bottle", title: "MilCrunch Water Bottle", description: "32oz insulated steel bottle with MilCrunch logo. Keeps coffee hot, water cold.", price: 27.99, compare_at_price: 34.99, category: "Drinkware", tags: ["bottle", "drinkware"], images: ["https://placehold.co/600x600/3b82f6/ffffff?text=MilCrunch%0AWater+Bottle"], variants: [], total_inventory: 100 },
  { id: "mc-milspouse-tumbler", title: "MilSpouse Strong Tumbler", description: "20oz insulated tumbler. Because military spouses run on caffeine and resilience.", price: 24.99, compare_at_price: null, category: "Drinkware", tags: ["tumbler", "milspouse"], images: ["https://placehold.co/600x600/ec4899/ffffff?text=MilSpouse%0AStrong+Tumbler"], variants: [], total_inventory: 120 },
  { id: "mc-patch-set", title: "MilCrunch Creator Patch Set", description: "Set of 3 embroidered patches: MilCrunch logo, Verified Creator badge, and branch patch.", price: 14.99, compare_at_price: null, category: "Accessories", tags: ["patches", "morale"], images: ["https://placehold.co/600x600/f59e0b/1e293b?text=MilCrunch%0APatch+Set"], variants: [], total_inventory: 300 },
  { id: "mc-sticker-pack", title: "MilCrunch Sticker Pack", description: "10-pack of die-cut vinyl stickers. MilCrunch, MilSpouseFest, and military creator designs.", price: 9.99, compare_at_price: null, category: "Accessories", tags: ["stickers", "accessories"], images: ["https://placehold.co/600x600/10b981/ffffff?text=MilCrunch%0ASticker+Pack"], variants: [], total_inventory: 500 },
  { id: "mc-laptop-sleeve", title: "MilCrunch Laptop Sleeve", description: "15\" neoprene laptop sleeve with MilCrunch branding. Protect the machine that runs the mission.", price: 29.99, compare_at_price: 39.99, category: "Accessories", tags: ["laptop", "sleeve"], images: ["https://placehold.co/600x600/1e293b/3b82f6?text=MilCrunch%0ALaptop+Sleeve"], variants: [], total_inventory: 60 },
];

/** Merge hardcoded products with DB overrides. Override fields replace hardcoded ones when non-null. */
export function applyOverrides(
  products: MerchProduct[],
  overrides: MerchOverride[],
): MerchProduct[] {
  const map = new Map(overrides.map((o) => [o.product_id, o]));
  return products.map((p) => {
    const o = map.get(p.id);
    if (!o) return p;
    return {
      ...p,
      title: o.title ?? p.title,
      description: o.description ?? p.description,
      price: o.price ?? p.price,
      compare_at_price: o.compare_at_price !== undefined ? o.compare_at_price : p.compare_at_price,
      category: o.category ?? p.category,
      images: o.image_url ? [o.image_url] : p.images,
    };
  });
}
