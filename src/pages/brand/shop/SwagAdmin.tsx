import { useEffect, useState } from "react";
import { Plus, Search, Loader2, Package, Pencil, Trash2, X, Gift, Truck, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SwagItem {
  name: string;
  description: string;
  sponsor_id: string | null;
  sponsor_name: string | null;
  image_url: string;
}

interface SwagPackage {
  id: string;
  title: string;
  description: string | null;
  event_id: string;
  event_title?: string;
  image_url: string | null;
  items: SwagItem[];
  max_claims: number;
  claimed_count: number;
  is_active: boolean;
  created_at: string;
}

interface SwagClaim {
  id: string;
  package_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: string;
  claimed_at: string;
}

interface EventOption {
  id: string;
  title: string;
}

interface SponsorOption {
  id: string;
  company_name: string;
}

const EMPTY_PACKAGE = {
  title: "",
  description: "",
  event_id: "",
  image_url: "",
  items: [] as SwagItem[],
  max_claims: 0,
  is_active: true,
};

const CLAIM_STATUSES = ["claimed", "shipped", "delivered"];

export default function SwagAdmin() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<SwagPackage[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [sponsors, setSponsors] = useState<SponsorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SwagPackage | null>(null);
  const [form, setForm] = useState(EMPTY_PACKAGE);
  const [saving, setSaving] = useState(false);
  // Claims viewer
  const [claimsOpen, setClaimsOpen] = useState(false);
  const [claims, setClaims] = useState<SwagClaim[]>([]);
  const [claimsPackage, setClaimsPackage] = useState<SwagPackage | null>(null);
  const [claimsLoading, setClaimsLoading] = useState(false);

  useEffect(() => {
    fetchPackages();
    fetchEvents();
    fetchSponsors();
  }, []);

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from("swag_packages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch swag packages:", error);
      toast({ title: "Error", description: "Failed to load packages", variant: "destructive" });
    }

    // Enrich with event titles
    const pkgs = (data || []) as SwagPackage[];
    if (pkgs.length > 0) {
      const eventIds = [...new Set(pkgs.map((p) => p.event_id))];
      const { data: evts } = await supabase.from("events").select("id, title").in("id", eventIds);
      const eventMap: Record<string, string> = {};
      (evts || []).forEach((e: { id: string; title: string }) => { eventMap[e.id] = e.title; });
      pkgs.forEach((p) => { p.event_title = eventMap[p.event_id] || "Unknown Event"; });
    }

    setPackages(pkgs);
    setLoading(false);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("id, title").order("start_date", { ascending: false });
    setEvents((data as EventOption[]) || []);
  };

  const fetchSponsors = async () => {
    const { data } = await supabase.from("sponsor_pages").select("id, company_name").order("company_name");
    setSponsors((data as SponsorOption[]) || []);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_PACKAGE, items: [] });
    setModalOpen(true);
  };

  const openEdit = (p: SwagPackage) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description || "",
      event_id: p.event_id,
      image_url: p.image_url || "",
      items: p.items || [],
      max_claims: p.max_claims,
      is_active: p.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.event_id) {
      toast({ title: "Validation", description: "Title and event are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      event_id: form.event_id,
      image_url: form.image_url?.trim() || null,
      items: form.items,
      max_claims: form.max_claims || 0,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from("swag_packages").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Saved", description: "Package updated" });
    } else {
      const { error } = await supabase.from("swag_packages").insert({ ...payload, claimed_count: 0 });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Created", description: "Package added" });
    }
    setSaving(false);
    setModalOpen(false);
    fetchPackages();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("swag_packages").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchPackages(); }
  };

  // Items management
  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { name: "", description: "", sponsor_id: null, sponsor_name: null, image_url: "" }],
    }));
  };

  const updateItem = (idx: number, field: keyof SwagItem, value: string | null) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      // Auto-fill sponsor name
      if (field === "sponsor_id" && value) {
        const sp = sponsors.find((s) => s.id === value);
        if (sp) items[idx].sponsor_name = sp.company_name;
      }
      if (field === "sponsor_id" && !value) {
        items[idx].sponsor_name = null;
      }
      return { ...f, items };
    });
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  // Claims
  const openClaims = async (pkg: SwagPackage) => {
    setClaimsPackage(pkg);
    setClaimsOpen(true);
    setClaimsLoading(true);
    const { data } = await supabase
      .from("swag_claims")
      .select("*")
      .eq("package_id", pkg.id)
      .order("claimed_at", { ascending: false });
    setClaims((data as SwagClaim[]) || []);
    setClaimsLoading(false);
  };

  const updateClaimStatus = async (claimId: string, status: string) => {
    await supabase.from("swag_claims").update({ status }).eq("id", claimId);
    if (claimsPackage) openClaims(claimsPackage);
  };

  const filtered = packages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-1">SWAG Packages</h1>
            <p className="text-gray-500 dark:text-gray-400">Build and manage SWAG packages for events.</p>
          </div>
          <Button onClick={openAdd} className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white">
            <Plus className="w-4 h-4 mr-2" /> Create Package
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search packages..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Package Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">{search ? "No packages match" : "No SWAG packages yet"}</p>
            <p className="text-sm text-muted-foreground mb-6">Create your first SWAG package for an event.</p>
            <Button onClick={openAdd} className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white">
              <Plus className="w-4 h-4 mr-2" /> Create Package
            </Button>
          </Card>
        ) : (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-center">Claimed / Max</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Gift className="h-5 w-5 text-purple-400" />
                          )}
                        </div>
                        <span className="font-medium">{p.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.event_title}</TableCell>
                    <TableCell className="text-center">{p.items?.length || 0}</TableCell>
                    <TableCell className="text-center">
                      {p.claimed_count} / {p.max_claims || "unlimited"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.is_active ? "default" : "secondary"} className={p.is_active ? "bg-green-100 text-green-700" : ""}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openClaims(p)} className="h-8 px-2 text-xs">
                          Claims
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="h-8 px-2 text-xs">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="h-8 px-2 text-xs text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Package" : "Create SWAG Package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="MIC 2026 VIP SWAG Bag" />
              </div>
              <div>
                <Label>Event *</Label>
                <Select value={form.event_id} onValueChange={(v) => setForm((f) => ({ ...f, event_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                  <SelectContent>
                    {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Package Image URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Max Claims (0 = unlimited)</Label>
                <Input type="number" min="0" value={form.max_claims} onChange={(e) => setForm((f) => ({ ...f, max_claims: parseInt(e.target.value) || 0 }))} />
                {form.max_claims > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Limited to first {form.max_claims} registrants</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Package Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              {form.items.length === 0 && (
                <p className="text-xs text-muted-foreground">No items added yet.</p>
              )}
              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(i, "name", e.target.value)}
                        placeholder="Item name (e.g. RecurrentX Challenge Coin)"
                        className="flex-1"
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeItem(i)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(i, "description", e.target.value)}
                        placeholder="Description"
                      />
                      <Select
                        value={item.sponsor_id || "none"}
                        onValueChange={(v) => updateItem(i, "sponsor_id", v === "none" ? null : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Sponsor (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No sponsor</SelectItem>
                          {sponsors.map((s) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        value={item.image_url}
                        onChange={(e) => updateItem(i, "image_url", e.target.value)}
                        placeholder="Item image URL"
                      />
                    </div>
                    {item.sponsor_name && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Sponsored by {item.sponsor_name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editing ? "Save Changes" : "Create Package"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claims Modal */}
      <Dialog open={claimsOpen} onOpenChange={setClaimsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Claims — {claimsPackage?.title}</DialogTitle>
          </DialogHeader>
          {claimsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : claims.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No claims yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Claimed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.user_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.user_email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.claimed_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(v) => updateClaimStatus(c.id, v)}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLAIM_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className="flex items-center gap-1.5">
                                {s === "claimed" && <Gift className="h-3 w-3" />}
                                {s === "shipped" && <Truck className="h-3 w-3" />}
                                {s === "delivered" && <CheckCircle2 className="h-3 w-3" />}
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
