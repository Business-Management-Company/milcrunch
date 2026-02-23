import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Plus, ArrowLeft, Upload, Download, Loader2, Trash2, Search,
  Users, UserCheck, UserX, AlertTriangle, Mail, Send,
  RefreshCw, Calendar, FolderOpen, Handshake, Edit2, X,
  Clock, Eye, MousePointer, CheckCircle2,
} from "lucide-react";
import {
  getAllContacts, getContactById, getContactStats, addFullContact,
  updateFullContact, deleteContact, getEmailLists, getContactListMemberships,
  syncBulkContacts,
} from "@/lib/email-db";
import { supabase } from "@/integrations/supabase/client";
import { fetchDirectories, fetchDirectoryMembers, type DirectoryMember } from "@/lib/directories";
import { CONTACT_STATUS_COLORS } from "@/lib/email-types";
import type { EmailContact, EmailList, ContactSource, ContactActivity } from "@/lib/email-types";

const SOURCE_COLORS: Record<string, string> = {
  manual: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  event: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400",
  creator: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  import: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  sponsor: "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
  form: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
};

function initials(first?: string | null, last?: string | null, email?: string): string {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

const EmailContacts = () => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const csvRef = useRef<HTMLInputElement>(null);

  // List state
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [stats, setStats] = useState({ total: 0, subscribed: 0, unsubscribed: 0, bounced: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Add contact modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", title: "", tags: "", list_id: "" });
  const [adding, setAdding] = useState(false);

  // Import CSV
  const [showImport, setShowImport] = useState(false);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importListId, setImportListId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");

  // Detail
  const [detail, setDetail] = useState<EmailContact | null>(null);
  const [detailLists, setDetailLists] = useState<Array<{ list_id: string; list_name: string; status: string }>>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EmailContact>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Sync
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [c, l, s] = await Promise.all([getAllContacts(), getEmailLists(), getContactStats()]);
    setContacts(c);
    setLists(l);
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load detail
  useEffect(() => {
    if (!contactId) { setDetail(null); return; }
    (async () => {
      setLoadingDetail(true);
      const c = await getContactById(contactId);
      if (c) {
        setDetail(c);
        const memberships = await getContactListMemberships(c.email);
        setDetailLists(memberships);
      } else {
        toast.error("Contact not found");
        navigate("/brand/email/contacts");
      }
      setLoadingDetail(false);
    })();
  }, [contactId, navigate]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.email.trim()) { toast.error("Email is required"); return; }
    if (!addForm.list_id) { toast.error("Select a list"); return; }
    setAdding(true);
    const result = await addFullContact({
      list_id: addForm.list_id,
      email: addForm.email.trim(),
      first_name: addForm.first_name.trim() || undefined,
      last_name: addForm.last_name.trim() || undefined,
      phone: addForm.phone.trim() || undefined,
      company: addForm.company.trim() || undefined,
      title: addForm.title.trim() || undefined,
      tags: addForm.tags ? addForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      source: "manual",
    });
    if (result) {
      toast.success("Contact added");
      setShowAdd(false);
      setAddForm({ first_name: "", last_name: "", email: "", phone: "", company: "", title: "", tags: "", list_id: "" });
      loadData();
    } else {
      toast.error("Failed to add contact — may already exist in this list");
    }
    setAdding(false);
  };

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV is empty"); return; }
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
      const rows = lines.slice(1).map(line => line.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
      setCsvHeaders(headers);
      setCsvRows(rows);
      // Auto-map common column names
      const map: Record<string, string> = {};
      headers.forEach((h, i) => {
        const lh = h.toLowerCase();
        if (lh === "email" || lh === "e-mail" || lh === "email address") map[String(i)] = "email";
        else if (lh.includes("first")) map[String(i)] = "first_name";
        else if (lh.includes("last")) map[String(i)] = "last_name";
        else if (lh.includes("phone")) map[String(i)] = "phone";
        else if (lh.includes("company") || lh.includes("organization")) map[String(i)] = "company";
        else if (lh.includes("title") || lh.includes("job")) map[String(i)] = "title";
      });
      setColumnMap(map);
      setShowImport(true);
    };
    reader.readAsText(file, "UTF-8");
    if (csvRef.current) csvRef.current.value = "";
  };

  const handleImport = async () => {
    if (!importListId) { toast.error("Select a list"); return; }
    const emailIdx = Object.entries(columnMap).find(([, v]) => v === "email")?.[0];
    if (emailIdx === undefined) { toast.error("Map an 'email' column"); return; }

    setImporting(true);
    setImportProgress(0);

    const parsed = csvRows
      .map(row => {
        const contact: any = {};
        Object.entries(columnMap).forEach(([idx, field]) => {
          if (row[Number(idx)]) contact[field] = row[Number(idx)];
        });
        return contact;
      })
      .filter(c => c.email && c.email.includes("@"));

    if (parsed.length === 0) { toast.error("No valid emails found"); setImporting(false); return; }

    // Import in batches
    const batchSize = 50;
    let totalInserted = 0;
    let totalDuplicates = 0;

    for (let i = 0; i < parsed.length; i += batchSize) {
      const batch = parsed.slice(i, i + batchSize);
      const result = await syncBulkContacts(importListId, batch.map(c => ({ ...c, source: "import" as const })));
      totalInserted += result.inserted;
      totalDuplicates += result.duplicates;
      setImportProgress(Math.round(((i + batch.length) / parsed.length) * 100));
    }

    toast.success(`Imported ${totalInserted} contacts, ${totalDuplicates} skipped (duplicates)`);
    setShowImport(false);
    setCsvRows([]);
    setCsvHeaders([]);
    setColumnMap({});
    setImporting(false);
    loadData();
  };

  const handleExport = () => {
    const filtered = getFilteredContacts();
    const csv = [
      ["Email", "First Name", "Last Name", "Phone", "Company", "Title", "Status", "Source", "Tags", "Date Added"].join(","),
      ...filtered.map(c => [
        c.email, c.first_name || "", c.last_name || "", c.phone || "", c.company || "", c.title || "",
        c.status, c.source || "manual", (c.tags || []).join(";"), c.created_at,
      ].map(v => `"${v}"`).join(",")),
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

  const handleDelete = async () => {
    if (!deleteId) return;
    if (await deleteContact(deleteId)) {
      toast.success("Contact deleted");
      if (contactId === deleteId) navigate("/brand/email/contacts");
      setDeleteId(null);
      loadData();
    } else {
      toast.error("Failed to delete");
      setDeleteId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!detail) return;
    const ok = await updateFullContact(detail.id, editForm);
    if (ok) {
      toast.success("Contact updated");
      setEditMode(false);
      // Reload detail
      const updated = await getContactById(detail.id);
      if (updated) setDetail(updated);
      loadData();
    } else {
      toast.error("Failed to update");
    }
  };

  // ── Sync Sources ────────────────────────────────────────────────

  const handleSyncEvents = async () => {
    if (lists.length === 0) { toast.error("Create an email list first"); return; }
    setSyncing("events");
    const listId = lists[0].id;
    const { data, error } = await (supabase as any).from("event_registrations").select("reg_email, reg_first_name, reg_last_name, reg_phone, reg_company, reg_title");
    if (error || !data) { toast.error("Failed to fetch event registrations"); setSyncing(null); return; }
    const contacts = (data as any[]).filter(r => r.reg_email).map(r => ({
      email: r.reg_email,
      first_name: r.reg_first_name || undefined,
      last_name: r.reg_last_name || undefined,
      phone: r.reg_phone || undefined,
      company: r.reg_company || undefined,
      title: r.reg_title || undefined,
      source: "event" as const,
    }));
    if (contacts.length === 0) { toast.info("No event attendees found"); setSyncing(null); return; }
    const result = await syncBulkContacts(listId, contacts);
    toast.success(`Synced ${result.inserted} event attendees (${result.duplicates} already existed)`);
    setSyncing(null);
    loadData();
  };

  const handleSyncCreators = async () => {
    if (lists.length === 0) { toast.error("Create an email list first"); return; }
    setSyncing("creators");
    const listId = lists[0].id;
    const dirs = await fetchDirectories();
    const allMembers: DirectoryMember[] = [];
    await Promise.all(dirs.map(async d => {
      allMembers.push(...await fetchDirectoryMembers(d.id));
    }));
    const contacts: Array<{ email: string; first_name?: string; source: ContactSource }> = [];
    const seen = new Set<string>();
    for (const m of allMembers) {
      const ed = m.enrichment_data as any;
      let email: string | null = null;
      if (ed?.emails?.length) email = ed.emails[0];
      else if (ed?.email) email = ed.email;
      else if (ed?.contact_email) email = ed.contact_email;
      if (email && !seen.has(email.toLowerCase())) {
        seen.add(email.toLowerCase());
        contacts.push({ email, first_name: m.creator_name || m.creator_handle, source: "creator" });
      }
    }
    if (contacts.length === 0) { toast.info("No creators with email found"); setSyncing(null); return; }
    const result = await syncBulkContacts(listId, contacts);
    toast.success(`Synced ${result.inserted} creators (${result.duplicates} already existed)`);
    setSyncing(null);
    loadData();
  };

  const handleSyncSponsors = async () => {
    if (lists.length === 0) { toast.error("Create an email list first"); return; }
    setSyncing("sponsors");
    const listId = lists[0].id;
    const { data, error } = await (supabase as any).from("sponsors").select("contact_name, contact_email, name");
    if (error || !data) { toast.error("Failed to fetch sponsors"); setSyncing(null); return; }
    const contacts = (data as any[]).filter(r => r.contact_email).map(r => ({
      email: r.contact_email,
      first_name: r.contact_name || undefined,
      company: r.name || undefined,
      source: "sponsor" as const,
    }));
    if (contacts.length === 0) { toast.info("No sponsor contacts found"); setSyncing(null); return; }
    const result = await syncBulkContacts(listId, contacts);
    toast.success(`Synced ${result.inserted} sponsor contacts (${result.duplicates} already existed)`);
    setSyncing(null);
    loadData();
  };

  // ── Filtering ───────────────────────────────────────────────────

  const getFilteredContacts = () => {
    return contacts.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (sourceFilter !== "all" && (c.source || "manual") !== sourceFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !c.email.toLowerCase().includes(q) &&
          !(c.first_name || "").toLowerCase().includes(q) &&
          !(c.last_name || "").toLowerCase().includes(q) &&
          !(c.company || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  };

  const filtered = getFilteredContacts();

  // Deduplicate by email for unique count display
  const uniqueEmails = new Set(contacts.map(c => c.email.toLowerCase()));

  // ── Detail View ─────────────────────────────────────────────────
  if (detail && contactId) {
    if (loadingDetail) {
      return <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
      <>
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/brand/email/contacts")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Contacts
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xl font-bold">
                {initials(detail.first_name, detail.last_name, detail.email)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-pd-navy dark:text-white">
                  {detail.first_name || detail.last_name ? `${detail.first_name || ""} ${detail.last_name || ""}`.trim() : detail.email}
                </h1>
                <p className="text-muted-foreground">{detail.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigate(`/brand/email/campaigns/new`); }}>
                <Send className="h-4 w-4 mr-1" /> Send Email
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditForm({ first_name: detail.first_name, last_name: detail.last_name, email: detail.email, phone: detail.phone, company: detail.company, title: detail.title, tags: detail.tags }); setEditMode(true); }}>
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteId(detail.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editMode} onOpenChange={setEditMode}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={editForm.first_name || ""} onChange={e => setEditForm(prev => ({ ...prev, first_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={editForm.last_name || ""} onChange={e => setEditForm(prev => ({ ...prev, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.email || ""} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} type="email" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editForm.phone || ""} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={editForm.company || ""} onChange={e => setEditForm(prev => ({ ...prev, company: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editForm.title || ""} onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={(editForm.tags || []).join(", ")} onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))} placeholder="vip, speaker, sponsor" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="p-5 col-span-1">
            <h3 className="font-semibold mb-4">Contact Details</h3>
            <dl className="space-y-3 text-sm">
              {[
                { label: "Email", value: detail.email },
                { label: "Phone", value: detail.phone },
                { label: "Company", value: detail.company },
                { label: "Title", value: detail.title },
                { label: "Source", value: detail.source || "manual" },
                { label: "Status", value: detail.status },
                { label: "Added", value: new Date(detail.created_at).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {detail.tags && detail.tags.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {detail.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* List Memberships */}
          <Card className="p-5 col-span-1">
            <h3 className="font-semibold mb-4">List Memberships</h3>
            {detailLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not in any lists</p>
            ) : (
              <div className="space-y-2">
                {detailLists.map(m => {
                  const sc = CONTACT_STATUS_COLORS[m.status] || CONTACT_STATUS_COLORS.subscribed;
                  return (
                    <div key={m.list_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{m.list_name}</span>
                      <Badge className={`${sc.bg} ${sc.text} text-xs`}>{m.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Activity Timeline */}
          <Card className="p-5 col-span-1">
            <h3 className="font-semibold mb-4">Activity</h3>
            {(!detail.activity || detail.activity.length === 0) ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {detail.activity.slice(0, 20).map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {a.type === "email_sent" && <Send className="h-3.5 w-3.5 text-blue-500" />}
                      {a.type === "email_opened" && <Eye className="h-3.5 w-3.5 text-green-500" />}
                      {a.type === "email_clicked" && <MousePointer className="h-3.5 w-3.5 text-blue-600" />}
                      {a.type === "unsubscribed" && <UserX className="h-3.5 w-3.5 text-red-500" />}
                      {a.type === "subscribed" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                      {a.type === "imported" && <Download className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{a.type.replace(/_/g, " ")}</p>
                      {a.campaign_name && <p className="text-xs text-muted-foreground truncate">{a.campaign_name}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </>
    );
  }

  // ── List View ────────────────────────────────────────────────────
  return (
    <>
      <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvSelect} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the contact from all lists.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Contact Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={addForm.first_name} onChange={e => setAddForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Jane" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={addForm.last_name} onChange={e => setAddForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="jane@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555-0100" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={addForm.company} onChange={e => setAddForm(p => ({ ...p, company: e.target.value }))} placeholder="Acme Inc." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))} placeholder="Marketing Director" />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={addForm.tags} onChange={e => setAddForm(p => ({ ...p, tags: e.target.value }))} placeholder="vip, speaker" />
            </div>
            <div className="space-y-2">
              <Label>Add to List *</Label>
              <Select value={addForm.list_id} onValueChange={v => setAddForm(p => ({ ...p, list_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a list..." /></SelectTrigger>
                <SelectContent>
                  {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={adding || !addForm.email.trim()}>
              {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Import to List *</Label>
              <Select value={importListId} onValueChange={setImportListId}>
                <SelectTrigger><SelectValue placeholder="Choose a list..." /></SelectTrigger>
                <SelectContent>
                  {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Column Mapper */}
            <div>
              <Label className="mb-2 block">Map Columns</Label>
              <div className="grid grid-cols-2 gap-2">
                {csvHeaders.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-28 truncate" title={h}>{h}</span>
                    <Select value={columnMap[String(i)] || ""} onValueChange={v => setColumnMap(prev => ({ ...prev, [String(i)]: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Skip" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="first_name">First Name</SelectItem>
                        <SelectItem value="last_name">Last Name</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {csvRows.length > 0 && (
              <div>
                <Label className="mb-2 block">Preview (first 5 rows)</Label>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="text-xs w-full">
                    <thead className="bg-muted">
                      <tr>{csvHeaders.map((h, i) => <th key={i} className="px-2 py-1.5 text-left font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-t">
                          {row.map((cell, ci) => <td key={ci} className="px-2 py-1.5 truncate max-w-[150px]">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{csvRows.length} total rows</p>
              </div>
            )}

            {/* Duplicate handling */}
            <div className="space-y-2">
              <Label>Duplicate Handling</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={duplicateMode === "skip"} onChange={() => setDuplicateMode("skip")} className="accent-[#1e3a5f]" />
                  Skip duplicates
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={duplicateMode === "update"} onChange={() => setDuplicateMode("update")} className="accent-[#1e3a5f]" />
                  Update existing
                </label>
              </div>
            </div>

            {importing && (
              <div>
                <Progress value={importProgress} className="mb-2" />
                <p className="text-xs text-muted-foreground text-center">{importProgress}% complete</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || !importListId}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Import {csvRows.length} Rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">All Contacts</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage all contacts across your email lists.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Contacts", value: stats.total, icon: Users, color: "text-blue-500" },
          { label: "Subscribed", value: stats.subscribed, icon: UserCheck, color: "text-green-500" },
          { label: "Unsubscribed", value: stats.unsubscribed, icon: UserX, color: "text-gray-500" },
          { label: "Bounced", value: stats.bounced, icon: AlertTriangle, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Contact
        </Button>
        <Button variant="outline" onClick={() => csvRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> Import CSV
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncEvents} disabled={syncing === "events"}>
            {syncing === "events" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Calendar className="h-3.5 w-3.5 mr-1" />}
            Sync Events
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncCreators} disabled={syncing === "creators"}>
            {syncing === "creators" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FolderOpen className="h-3.5 w-3.5 mr-1" />}
            Sync Creators
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncSponsors} disabled={syncing === "sponsors"}>
            {syncing === "sponsors" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Handshake className="h-3.5 w-3.5 mr-1" />}
            Sync Sponsors
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contacts..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="subscribed">Subscribed</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="creator">Creator</SelectItem>
            <SelectItem value="import">Import</SelectItem>
            <SelectItem value="sponsor">Sponsor</SelectItem>
            <SelectItem value="form">Form</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || statusFilter !== "all" || sourceFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setSourceFilter("all"); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
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
          <p className="text-sm mt-1">{contacts.length === 0 ? "Add contacts manually, import a CSV, or sync from other sources." : "Try adjusting your search or filters."}</p>
          {contacts.length === 0 && (
            <Button className="mt-4" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(c => {
                const sc = CONTACT_STATUS_COLORS[c.status] || CONTACT_STATUS_COLORS.subscribed;
                const src = c.source || "manual";
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/brand/email/contacts/${c.id}`)}>
                    <TableCell>
                      <div className="h-8 w-8 rounded-full bg-[#1e3a5f]/20 text-[#1e3a5f] flex items-center justify-center text-xs font-bold">
                        {initials(c.first_name, c.last_name, c.email)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.first_name || "—"}</TableCell>
                    <TableCell>{c.last_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>
                      <Badge className={`${SOURCE_COLORS[src] || SOURCE_COLORS.manual} text-xs capitalize`}>{src}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${sc.bg} ${sc.text} text-xs`}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setDeleteId(c.id); }} title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length > 100 && (
            <div className="p-3 text-center text-sm text-muted-foreground border-t">
              Showing first 100 of {filtered.length} contacts. Use search to narrow results.
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default EmailContacts;
