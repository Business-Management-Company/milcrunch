import { useEffect, useState } from "react";
import { Plus, Search, Loader2, ShoppingBag, Pencil, Trash2, Eye, EyeOff, X, ImagePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/hooks/useDemoMode";

const CATEGORIES = ["Apparel", "Headwear", "Accessories", "Drinkware"];

const SEED_PRODUCTS: MerchProduct[] = [
  { id: "mc-veteran-hoodie", title: "MilCrunch Veteran Hoodie", description: "Premium heavyweight hoodie with embroidered MilCrunch logo. Built for veterans who build.", price: 59.99, compare_at_price: 74.99, category: "Apparel", tags: ["hoodie", "veteran"], images: ["https://placehold.co/600x600/1e293b/ffffff?text=MilCrunch%0AVeteran+Hoodie"], variants: [{ name: "S", price_override: null, inventory: 25 }, { name: "M", price_override: null, inventory: 40 }, { name: "L", price_override: null, inventory: 40 }, { name: "XL", price_override: null, inventory: 30 }, { name: "2XL", price_override: null, inventory: 15 }], total_inventory: 150, is_published: true, created_at: "2026-03-01T00:00:00Z" },
  { id: "mc-creator-tee", title: "MilCrunch Creator Tee", description: "Soft tri-blend tee with MilCrunch wordmark. The unofficial uniform of military creators.", price: 34.99, compare_at_price: 44.99, category: "Apparel", tags: ["tee", "creator"], images: ["https://placehold.co/600x600/1e293b/ffffff?text=MilCrunch%0ACreator+Tee"], variants: [{ name: "S", price_override: null, inventory: 30 }, { name: "M", price_override: null, inventory: 50 }, { name: "L", price_override: null, inventory: 50 }, { name: "XL", price_override: null, inventory: 30 }], total_inventory: 160, is_published: true, created_at: "2026-03-01T00:01:00Z" },
  { id: "mc-milspousefest-tee", title: "MilSpouseFest Official Tee", description: "Event exclusive tee for MilSpouseFest attendees and supporters.", price: 29.99, compare_at_price: null, category: "Apparel", tags: ["tee", "milspousefest", "event"], images: ["https://placehold.co/600x600/7c3aed/ffffff?text=MilSpouseFest%0AOfficial+Tee"], variants: [{ name: "S", price_override: null, inventory: 30 }, { name: "M", price_override: null, inventory: 45 }, { name: "L", price_override: null, inventory: 45 }, { name: "XL", price_override: null, inventory: 30 }], total_inventory: 150, is_published: true, created_at: "2026-03-01T00:02:00Z" },
  { id: "mc-milcon-hoodie", title: "Military Influencer Conference Hoodie", description: "Limited edition MilCon 2026 hoodie. Premium fleece, embroidered patch.", price: 64.99, compare_at_price: 79.99, category: "Apparel", tags: ["hoodie", "milcon", "event"], images: ["https://placehold.co/600x600/1e293b/f59e0b?text=MilCon+2026%0AHoodie"], variants: [{ name: "S", price_override: null, inventory: 20 }, { name: "M", price_override: null, inventory: 35 }, { name: "L", price_override: null, inventory: 35 }, { name: "XL", price_override: null, inventory: 25 }, { name: "2XL", price_override: null, inventory: 10 }], total_inventory: 125, is_published: true, created_at: "2026-03-01T00:03:00Z" },
  { id: "mc-snapback", title: "MilCrunch Snapback", description: "Structured snapback with embroidered MilCrunch logo. One size fits all.", price: 28.99, compare_at_price: 34.99, category: "Headwear", tags: ["hat", "snapback"], images: ["https://placehold.co/600x600/1e293b/ffffff?text=MilCrunch%0ASnapback"], variants: [{ name: "One Size", price_override: null, inventory: 75 }], total_inventory: 75, is_published: true, created_at: "2026-03-01T00:04:00Z" },
  { id: "mc-tactical-cap", title: "MilCrunch Tactical Cap", description: "Low-profile fitted cap with subdued MilCrunch patch. Range ready.", price: 32.99, compare_at_price: null, category: "Headwear", tags: ["hat", "tactical"], images: ["https://placehold.co/600x600/4b5563/ffffff?text=MilCrunch%0ATactical+Cap"], variants: [{ name: "S/M", price_override: null, inventory: 40 }, { name: "L/XL", price_override: null, inventory: 40 }], total_inventory: 80, is_published: true, created_at: "2026-03-01T00:05:00Z" },
  { id: "mc-coffee-mug", title: "MilCrunch Coffee Mug", description: "15oz ceramic mug. \"Powered by Coffee & MilCrunch\" on the back.", price: 18.99, compare_at_price: null, category: "Drinkware", tags: ["mug", "drinkware"], images: ["https://placehold.co/600x600/ffffff/1e293b?text=MilCrunch%0ACoffee+Mug"], variants: [], total_inventory: 200, is_published: true, created_at: "2026-03-01T00:06:00Z" },
  { id: "mc-water-bottle", title: "MilCrunch Water Bottle", description: "32oz insulated steel bottle with MilCrunch logo. Keeps coffee hot, water cold.", price: 27.99, compare_at_price: 34.99, category: "Drinkware", tags: ["bottle", "drinkware"], images: ["https://placehold.co/600x600/3b82f6/ffffff?text=MilCrunch%0AWater+Bottle"], variants: [], total_inventory: 100, is_published: true, created_at: "2026-03-01T00:07:00Z" },
  { id: "mc-milspouse-tumbler", title: "MilSpouse Strong Tumbler", description: "20oz insulated tumbler. Because military spouses run on caffeine and resilience.", price: 24.99, compare_at_price: null, category: "Drinkware", tags: ["tumbler", "milspouse"], images: ["https://placehold.co/600x600/ec4899/ffffff?text=MilSpouse%0AStrong+Tumbler"], variants: [], total_inventory: 120, is_published: true, created_at: "2026-03-01T00:08:00Z" },
  { id: "mc-patch-set", title: "MilCrunch Creator Patch Set", description: "Set of 3 embroidered patches: MilCrunch logo, Verified Creator badge, and branch patch.", price: 14.99, compare_at_price: null, category: "Accessories", tags: ["patches", "morale"], images: ["https://placehold.co/600x600/f59e0b/1e293b?text=MilCrunch%0APatch+Set"], variants: [], total_inventory: 300, is_published: true, created_at: "2026-03-01T00:09:00Z" },
  { id: "mc-sticker-pack", title: "MilCrunch Sticker Pack", description: "10-pack of die-cut vinyl stickers. MilCrunch, MilSpouseFest, and military creator designs.", price: 9.99, compare_at_price: null, category: "Accessories", tags: ["stickers", "accessories"], images: ["https://placehold.co/600x600/10b981/ffffff?text=MilCrunch%0ASticker+Pack"], variants: [], total_inventory: 500, is_published: true, created_at: "2026-03-01T00:10:00Z" },
  { id: "mc-laptop-sleeve", title: "MilCrunch Laptop Sleeve", description: "15\" neoprene laptop sleeve with MilCrunch branding. Protect the machine that runs the mission.", price: 29.99, compare_at_price: 39.99, category: "Accessories", tags: ["laptop", "sleeve"], images: ["https://placehold.co/600x600/1e293b/3b82f6?text=MilCrunch%0ALaptop+Sleeve"], variants: [], total_inventory: 60, is_published: true, created_at: "2026-03-01T00:11:00Z" },
];

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
  is_published: boolean;
  created_at: string;
}

const EMPTY_PRODUCT: Omit<MerchProduct, "id" | "created_at"> = {
  title: "",
  description: "",
  price: 0,
  compare_at_price: null,
  category: "Apparel",
  tags: [],
  images: ["", "", "", ""],
  variants: [],
  total_inventory: 0,
  is_published: false,
};

type SortOption = "newest" | "oldest" | "price_asc" | "price_desc";

export default function MerchAdmin() {
  const { toast } = useToast();
  const { guardAction } = useDemoMode();
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MerchProduct | null>(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("merch_products")
      .select("*")
      .order("created_at", { ascending: false });

    const rows = (data as MerchProduct[] | null) || [];
    setProducts(rows.length > 0 && !error ? rows : SEED_PRODUCTS);
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_PRODUCT, images: ["", "", "", ""] });
    setTagInput("");
    setModalOpen(true);
  };

  const openEdit = (p: MerchProduct) => {
    setEditing(p);
    const imgs = [...(p.images || [])];
    while (imgs.length < 4) imgs.push("");
    setForm({
      title: p.title,
      description: p.description || "",
      price: p.price,
      compare_at_price: p.compare_at_price,
      category: p.category,
      tags: p.tags || [],
      images: imgs,
      variants: p.variants || [],
      total_inventory: p.total_inventory,
      is_published: p.is_published,
    });
    setTagInput("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (guardAction("save")) return;
    if (!form.title.trim() || form.price <= 0) {
      toast({ title: "Validation", description: "Title and price are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      price: form.price,
      compare_at_price: form.compare_at_price || null,
      category: form.category,
      tags: form.tags,
      images: form.images.filter((i) => i.trim()),
      variants: form.variants,
      total_inventory: form.total_inventory,
      is_published: form.is_published,
    };

    if (editing) {
      const { error } = await supabase.from("merch_products").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Saved", description: "Product updated" });
      }
    } else {
      const { error } = await supabase.from("merch_products").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Created", description: "Product added" });
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (guardAction("delete")) return;
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("merch_products").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      fetchProducts();
    }
  };

  const togglePublish = async (p: MerchProduct) => {
    const { error } = await supabase.from("merch_products").update({ is_published: !p.is_published }).eq("id", p.id);
    if (!error) fetchProducts();
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const addVariant = () => {
    setForm((f) => ({ ...f, variants: [...f.variants, { name: "", price_override: null, inventory: 0 }] }));
  };

  const updateVariant = (idx: number, field: keyof Variant, value: string | number | null) => {
    setForm((f) => {
      const v = [...f.variants];
      v[idx] = { ...v[idx], [field]: value };
      return { ...f, variants: v };
    });
  };

  const removeVariant = (idx: number) => {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
  };

  // Filter & sort
  let filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );
  if (filterCategory !== "all") {
    filtered = filtered.filter((p) => p.category === filterCategory);
  }
  filtered.sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-1">Merch Store</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage products, pricing, and inventory.</p>
          </div>
          <Button onClick={openAdd} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="price_asc">Price: Low-High</SelectItem>
              <SelectItem value="price_desc">Price: High-Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">{search || filterCategory !== "all" ? "No products match" : "No products yet"}</p>
            <p className="text-sm text-muted-foreground mb-6">Add your first product to get started.</p>
            <Button onClick={openAdd} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <Card key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden hover:shadow-md transition-shadow group">
                {/* Image */}
                <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-gray-800 flex items-center justify-center relative">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-12 w-12 text-blue-400" />
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${p.is_published ? "bg-green-500" : "bg-gray-400"}`} />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">{p.category}</Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-bold text-lg">${p.price.toFixed(2)}</span>
                    {p.compare_at_price && (
                      <span className="text-sm text-muted-foreground line-through">${p.compare_at_price.toFixed(2)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{p.total_inventory} in stock</p>
                  {/* Actions */}
                  <div className="flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="h-8 px-2 text-xs">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => togglePublish(p)} className="h-8 px-2 text-xs">
                      {p.is_published ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                      {p.is_published ? "Hide" : "Publish"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="h-8 px-2 text-xs text-red-500 hover:text-red-600 ml-auto">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Title & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Product title" />
              </div>
              <div>
                <Label>Price *</Label>
                <Input type="number" step="0.01" min="0" value={form.price || ""} onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))} placeholder="29.99" />
              </div>
            </div>

            {/* Compare at price & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Compare at Price</Label>
                <Input type="number" step="0.01" min="0" value={form.compare_at_price || ""} onChange={(e) => setForm((f) => ({ ...f, compare_at_price: parseFloat(e.target.value) || null }))} placeholder="39.99 (shows strikethrough)" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Product description..." />
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={addTag}>Add</Button>
              </div>
            </div>

            {/* Images */}
            <div>
              <Label>Images (URLs, up to 4)</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {form.images.map((url, i) => (
                  <div key={i} className="relative">
                    <Input
                      value={url}
                      onChange={(e) => {
                        const imgs = [...form.images];
                        imgs[i] = e.target.value;
                        setForm((f) => ({ ...f, images: imgs }));
                      }}
                      placeholder={`Image ${i + 1} URL`}
                    />
                    {url && (
                      <div className="mt-1 h-20 rounded-lg overflow-hidden bg-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Variants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Variants (Size / Color)</Label>
                <Button type="button" size="sm" variant="outline" onClick={addVariant} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Variant
                </Button>
              </div>
              {form.variants.length === 0 && (
                <p className="text-xs text-muted-foreground">No variants added. Add size/color variants as needed.</p>
              )}
              {form.variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Input
                    value={v.name}
                    onChange={(e) => updateVariant(i, "name", e.target.value)}
                    placeholder="e.g. Large / Black"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={v.price_override || ""}
                    onChange={(e) => updateVariant(i, "price_override", parseFloat(e.target.value) || null)}
                    placeholder="Price override"
                    className="w-32"
                  />
                  <Input
                    type="number"
                    value={v.inventory}
                    onChange={(e) => updateVariant(i, "inventory", parseInt(e.target.value) || 0)}
                    placeholder="Stock"
                    className="w-24"
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeVariant(i)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Inventory & Published */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Inventory</Label>
                <Input type="number" min="0" value={form.total_inventory} onChange={(e) => setForm((f) => ({ ...f, total_inventory: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
                <Label>Published</Label>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editing ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
