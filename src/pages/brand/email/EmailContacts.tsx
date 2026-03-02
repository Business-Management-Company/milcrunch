import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Search, Users, X, Instagram, Youtube, Globe, ExternalLink, Mail, Phone, MapPin, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ────────────────────────────────────────────────────────── */

interface Contact {
  id: string;
  creator_name: string | null;
  creator_handle: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  platform: string;
  branch: string | null;
  bio: string | null;
  follower_count: number | null;
  engagement_rate: number | null;
  added_at: string;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function getInitials(name?: string | null, handle?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
  }
  if (handle) return handle[0].toUpperCase();
  return "?";
}

function formatFollowerCount(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function platformUrl(platform: string, handle: string): string {
  const h = handle.replace(/^@/, "");
  switch (platform.toLowerCase()) {
    case "instagram": return `https://instagram.com/${h}`;
    case "tiktok": return `https://tiktok.com/@${h}`;
    case "youtube": return `https://youtube.com/@${h}`;
    case "twitter": return `https://x.com/${h}`;
    default: return "#";
  }
}

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

function PlatformIcon({ platform, className = "h-4 w-4" }: { platform: string; className?: string }) {
  switch (platform.toLowerCase()) {
    case "instagram": return <Instagram className={className} />;
    case "tiktok": return <TikTokIcon className={className} />;
    case "youtube": return <Youtube className={className} />;
    default: return <Globe className={className} />;
  }
}

const BRANCH_COLORS: Record<string, string> = {
  army: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  navy: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  "air force": "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
  marines: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  "coast guard": "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  "space force": "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
};

/* ── Drawer ───────────────────────────────────────────────────────── */

function ContactDrawer({ contact, open, onClose }: { contact: Contact | null; open: boolean; onClose: () => void }) {
  if (!contact) return null;

  const hasContactInfo = contact.email || contact.phone || contact.website || contact.location;

  return (
    <>
      <div
        className={cn("fixed inset-0 bg-black/40 z-40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-[#1A1D27] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Navy header */}
        <div className="bg-[#1e3a5f] px-6 py-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold overflow-hidden shrink-0 ring-2 ring-white/30">
              <span>{getInitials(contact.creator_name, contact.creator_handle)}</span>
              {contact.avatar_url && (
                <img
                  src={contact.avatar_url}
                  alt=""
                  className="absolute inset-0 w-16 h-16 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white truncate">{contact.creator_name || contact.creator_handle}</h2>
              <p className="text-white/70 text-sm truncate">@{contact.creator_handle}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="bg-white/20 text-white text-xs capitalize">{contact.platform}</Badge>
                {contact.branch && (
                  <Badge className={`${BRANCH_COLORS[contact.branch.toLowerCase()] || "bg-gray-100 text-gray-700"} text-xs capitalize`}>
                    {contact.branch}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Creator Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {contact.follower_count != null && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatFollowerCount(contact.follower_count)}</p>
                </div>
              )}
              {contact.engagement_rate != null && contact.engagement_rate > 0 && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Engagement</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">{contact.engagement_rate.toFixed(2)}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          {hasContactInfo && (
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Info</h3>
              <div className="space-y-2.5 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium truncate"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.website && (
                  <div className="flex items-center gap-3">
                    <Link className="h-4 w-4 text-gray-400 shrink-0" />
                    <a
                      href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium truncate flex items-center gap-1"
                    >
                      {contact.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
                {contact.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-gray-900 dark:text-white font-medium">{contact.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 w-20 shrink-0">Handle</span>
                <a
                  href={platformUrl(contact.platform, contact.creator_handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium truncate flex items-center gap-1"
                >
                  @{contact.creator_handle} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 w-20 shrink-0">Platform</span>
                <span className="text-gray-900 dark:text-white font-medium capitalize flex items-center gap-1.5">
                  <PlatformIcon platform={contact.platform} className="h-4 w-4" />
                  {contact.platform}
                </span>
              </div>
              {contact.branch && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 w-20 shrink-0">Branch</span>
                  <span className="text-gray-900 dark:text-white font-medium capitalize">{contact.branch}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-gray-400 w-20 shrink-0">Added</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {new Date(contact.added_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {contact.bio && (
            <div className="px-6 py-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bio</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{contact.bio}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */

const EmailContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [sortCol, setSortCol] = useState<"name" | "handle" | "platform" | "followers" | "added" | null>("added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Drawer
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("directory_members")
      .select("id, creator_name, creator_handle, avatar_url, platform, branch, bio, follower_count, engagement_rate, added_at, enrichment_data")
      .order("added_at", { ascending: false });
    if (error) {
      console.error("Failed to load contacts:", error);
      toast.error("Failed to load contacts");
      setLoading(false);
      return;
    }

    // Deduplicate by creator_handle (keep first = newest due to order)
    const seen = new Set<string>();
    const deduped: Contact[] = [];
    for (const row of data ?? []) {
      const handle = (row.creator_handle || "").toLowerCase();
      if (seen.has(handle)) continue;
      seen.add(handle);

      // Extract contact fields from enrichment_data
      const ed = row.enrichment_data as Record<string, unknown> | null;
      let email: string | null = null;
      let phone: string | null = null;
      let website: string | null = null;
      let location: string | null = null;
      if (ed) {
        // Email: check multiple possible fields
        if (typeof ed.email === "string" && ed.email) email = ed.email;
        else if (Array.isArray(ed.emails) && ed.emails.length) email = String(ed.emails[0]);
        else if (typeof ed.contact_email === "string" && ed.contact_email) email = ed.contact_email;
        else if (typeof ed.public_email === "string" && ed.public_email) email = ed.public_email;

        // Phone
        if (typeof ed.phone === "string" && ed.phone) phone = ed.phone;
        else if (Array.isArray(ed.phones) && ed.phones.length) phone = String(ed.phones[0]);

        // Website
        if (typeof ed.website === "string" && ed.website) website = ed.website;
        else if (Array.isArray(ed.websites) && ed.websites.length) website = String(ed.websites[0]);
        else if (typeof ed.external_url === "string" && ed.external_url) website = ed.external_url;

        // Location
        if (typeof ed.location === "string" && ed.location) location = ed.location;
        else if (Array.isArray(ed.locations) && ed.locations.length) location = String(ed.locations[0]);
        else if (typeof ed.city === "string" && ed.city) {
          location = ed.city + (typeof ed.country === "string" ? `, ${ed.country}` : "");
        }
      }

      deduped.push({
        id: row.id,
        creator_name: row.creator_name,
        creator_handle: row.creator_handle,
        avatar_url: row.avatar_url,
        email,
        phone,
        website,
        location,
        platform: row.platform || "instagram",
        branch: row.branch,
        bio: row.bio,
        follower_count: row.follower_count,
        engagement_rate: row.engagement_rate,
        added_at: row.added_at,
      });
    }
    setContacts(deduped);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtering
  const filtered = (() => {
    let list = contacts.filter(c => {
      if (platformFilter !== "all" && c.platform.toLowerCase() !== platformFilter) return false;
      if (branchFilter !== "all" && (c.branch || "").toLowerCase() !== branchFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !(c.creator_name || "").toLowerCase().includes(q) &&
          !c.creator_handle.toLowerCase().includes(q) &&
          !(c.email || "").toLowerCase().includes(q) &&
          !(c.bio || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    if (sortCol) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        switch (sortCol) {
          case "name": return dir * (a.creator_name || "").localeCompare(b.creator_name || "");
          case "handle": return dir * a.creator_handle.localeCompare(b.creator_handle);
          case "platform": return dir * a.platform.localeCompare(b.platform);
          case "followers": return dir * ((a.follower_count ?? 0) - (b.follower_count ?? 0));
          case "added": return dir * (new Date(a.added_at).getTime() - new Date(b.added_at).getTime());
          default: return 0;
        }
      });
    }
    return list;
  })();

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortCol(null); setSortDir("asc"); }
  };
  const sortArrow = (col: typeof sortCol) =>
    sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const handleExport = () => {
    const csv = [
      ["Name", "Handle", "Platform", "Branch", "Email", "Followers", "Engagement Rate", "Bio", "Date Added"].join(","),
      ...filtered.map(c => [
        c.creator_name || "", `@${c.creator_handle}`, c.platform, c.branch || "",
        c.email || "", c.follower_count ?? "", c.engagement_rate ?? "",
        c.bio || "", c.added_at,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  // Unique branches for filter
  const branches = [...new Set(contacts.map(c => c.branch).filter(Boolean))].sort() as string[];
  const platforms = [...new Set(contacts.map(c => c.platform.toLowerCase()))].sort();

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Contacts</h1>
        <p className="text-gray-500 dark:text-gray-400">All creators from your directories in one place.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
              <p className="text-xs text-muted-foreground">Total Contacts</p>
            </div>
          </div>
        </Card>
        {platforms.slice(0, 3).map(p => {
          const count = contacts.filter(c => c.platform.toLowerCase() === p).length;
          return (
            <Card key={p} className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <PlatformIcon platform={p} className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name, handle, email, or bio..." className="pl-9" />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {branches.length > 0 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => <SelectItem key={b} value={b.toLowerCase()} className="capitalize">{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(searchQuery || platformFilter !== "all" || branchFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setPlatformFilter("all"); setBranchFilter("all"); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
        <div className="ml-auto">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Contacts Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">{contacts.length === 0 ? "No contacts yet" : "No contacts match filters"}</p>
          <p className="text-sm mt-1">{contacts.length === 0 ? "Add creators to a directory from Discovery to see them here." : "Try adjusting your search or filters."}</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                {([["name", "Name"], ["handle", "Handle"], ["platform", "Platform"], ["followers", "Followers"], ["added", "Added"]] as const).map(([col, label]) => (
                  <TableHead key={col} className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(col)}>
                    {label}{sortArrow(col)}
                  </TableHead>
                ))}
                <TableHead>Branch</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  onClick={() => { setDrawerContact(c); setDrawerOpen(true); }}
                >
                  <TableCell>
                    <div className="relative h-8 w-8 rounded-full bg-[#1e3a5f]/20 text-[#1e3a5f] flex items-center justify-center text-xs font-bold overflow-hidden">
                      <span>{getInitials(c.creator_name, c.creator_handle)}</span>
                      {c.avatar_url && (
                        <img
                          src={c.avatar_url}
                          alt=""
                          className="absolute inset-0 w-8 h-8 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{c.creator_name || c.creator_handle}</TableCell>
                  <TableCell className="text-muted-foreground">@{c.creator_handle}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 capitalize text-sm">
                      <PlatformIcon platform={c.platform} className="h-3.5 w-3.5" />
                      {c.platform}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{formatFollowerCount(c.follower_count)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.added_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {c.branch && (
                      <Badge className={`${BRANCH_COLORS[c.branch.toLowerCase()] || "bg-gray-100 text-gray-700"} text-xs capitalize`}>
                        {c.branch}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{c.email || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length > 100 && (
            <div className="p-3 text-center text-sm text-muted-foreground border-t">
              Showing first 100 of {filtered.length} contacts. Use search to narrow results.
            </div>
          )}
        </div>
      )}

      {/* Contact Drawer */}
      <ContactDrawer
        contact={drawerContact}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setTimeout(() => setDrawerContact(null), 300); }}
      />
    </>
  );
};

export default EmailContacts;
