import { useEffect, useState, useRef } from "react";
import { Search, Loader2, ShoppingBag, Pencil, ImagePlus, Upload, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MERCH_PRODUCTS, CATEGORIES, applyOverrides } from "@/data/merch-products";
import type { MerchProduct, MerchOverride } from "@/data/merch-products";

type SortOption = "name" | "price_asc" | "price_desc" | "category";

export default function MerchAdmin() {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<MerchOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MerchProduct | null>(null);
  const [form, setForm] = useState({ title: "", description: "", price: 0, compare_at_price: null as number | null, category: "Apparel", image_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const [cardUploadId, setCardUploadId] = useState<string | null>(null);

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    const { data } = await supabase
      .from("merch_overrides")
      .select("*") as { data: MerchOverride[] | null };
    setOverrides(data || []);
    setLoading(false);
  };

  const products = applyOverrides(MERCH_PRODUCTS, overrides);

  const openEdit = (p: MerchProduct) => {
    setEditing(p);
    const override = overrides.find((o) => o.product_id === p.id);
    setForm({
      title: p.title,
      description: p.description || "",
      price: p.price,
      compare_at_price: p.compare_at_price,
      category: p.category,
      image_url: override?.image_url || "",
    });
    setModalOpen(true);
  };

  const uploadImage = async (file: File, productId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${productId}.${ext}`;

    // Remove old file first (ignore errors)
    await supabase.storage.from("merch-images").remove([path]);

    const { error } = await supabase.storage
      .from("merch-images")
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("merch-images")
      .getPublicUrl(path);

    return urlData.publicUrl + "?t=" + Date.now();
  };

  const handleModalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    const url = await uploadImage(file, editing.id);
    if (url) {
      setForm((f) => ({ ...f, image_url: url }));
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cardUploadId) return;
    setUploading(true);
    const url = await uploadImage(file, cardUploadId);
    if (url) {
      await saveOverride(cardUploadId, { image_url: url });
      toast({ title: "Image uploaded", description: "Product image updated" });
    }
    setUploading(false);
    setCardUploadId(null);
    e.target.value = "";
  };

  const saveOverride = async (productId: string, fields: Partial<MerchOverride>) => {
    const { error } = await supabase
      .from("merch_overrides")
      .upsert({ product_id: productId, ...fields, updated_at: new Date().toISOString() },
        { onConflict: "product_id" }) as { error: { message: string } | null };

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!form.title.trim() || form.price <= 0) {
      toast({ title: "Validation", description: "Title and price are required", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Find the original hardcoded product to determine which fields changed
    const original = MERCH_PRODUCTS.find((p) => p.id === editing.id)!;
    const payload: Partial<MerchOverride> = {};

    if (form.title !== original.title) payload.title = form.title.trim();
    if (form.description !== original.description) payload.description = form.description.trim() || null;
    if (form.price !== original.price) payload.price = form.price;
    if (form.compare_at_price !== original.compare_at_price) payload.compare_at_price = form.compare_at_price;
    if (form.category !== original.category) payload.category = form.category;
    if (form.image_url) payload.image_url = form.image_url;

    // Only save if something changed
    const hasChanges = Object.keys(payload).length > 0;
    if (hasChanges) {
      const ok = await saveOverride(editing.id, payload);
      if (ok) {
        toast({ title: "Saved", description: "Product updated" });
        await fetchOverrides();
      }
    } else {
      toast({ title: "No changes", description: "Nothing was modified" });
    }

    setSaving(false);
    setModalOpen(false);
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
    if (sortBy === "category") return a.category.localeCompare(b.category);
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-1">Merch Store</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage products, pricing, and images. {products.length} products.</p>
          </div>
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
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="price_asc">Price: Low-High</SelectItem>
              <SelectItem value="price_desc">Price: High-Low</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hidden file input for card-level uploads */}
        <input
          ref={cardFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCardUpload}
        />

        {/* Product Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">{search || filterCategory !== "all" ? "No products match" : "No products yet"}</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => {
              const hasOverride = overrides.some((o) => o.product_id === p.id && o.image_url);
              return (
                <Card key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden hover:shadow-md transition-shadow group">
                  {/* Image with upload overlay */}
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-gray-800 flex items-center justify-center relative">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-12 w-12 text-blue-400" />
                    )}
                    {/* Upload overlay */}
                    <button
                      onClick={() => {
                        setCardUploadId(p.id);
                        cardFileInputRef.current?.click();
                      }}
                      disabled={uploading}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      {uploading && cardUploadId === p.id ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <div className="flex flex-col items-center text-white">
                          <Upload className="h-6 w-6 mb-1" />
                          <span className="text-xs font-medium">Upload Image</span>
                        </div>
                      )}
                    </button>
                    {/* Status indicator */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {hasOverride && (
                        <div className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">CUSTOM</div>
                      )}
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
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="h-8 px-2 text-xs">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCardUploadId(p.id);
                          cardFileInputRef.current?.click();
                        }}
                        className="h-8 px-2 text-xs"
                      >
                        <ImagePlus className="h-3.5 w-3.5 mr-1" /> Image
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
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
                <Label>Original Price</Label>
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

            {/* Image Upload */}
            <div>
              <Label>Product Image</Label>
              <div className="mt-2">
                {/* Preview */}
                <div className="flex items-start gap-4">
                  <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center">
                    {(form.image_url || editing?.images?.[0]) ? (
                      <img
                        src={form.image_url || editing?.images?.[0]}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleModalUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                    {form.image_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        <X className="h-3 w-3 mr-1" /> Remove custom image
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload a product photo. JPG, PNG, or WebP.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
