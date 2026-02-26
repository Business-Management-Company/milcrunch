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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Plus, ArrowLeft, Upload, Download, Loader2, Trash2, Search,
  Users, UserCheck, UserX, AlertTriangle, Mail, Send,
  RefreshCw, Calendar, FolderOpen, Handshake, Edit2, X,
  Clock, Eye, MousePointer, CheckCircle2, ShieldCheck, Ticket,
  Instagram, Youtube, Twitter, Linkedin, Globe, Phone, Building2, Briefcase, Tag, ListPlus,
} from "lucide-react";
import {
  getAllContacts, getContactById, getContactStats, addFullContact,
  updateFullContact, deleteContact, getEmailLists, getContactListMemberships,
  syncBulkContacts,
} from "@/lib/email-db";
import { supabase } from "@/integrations/supabase/client";
import { fetchDirectories, fetchDirectoryMembers, addToDirectory, type DirectoryMember, type Directory } from "@/lib/directories";
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

const FEMALE_NAMES = new Set(['sarah','jennifer','ashley','emily','jessica','amanda','brittany','alexis','amber','morgan','rachel','taylor','madison','hannah','samantha','stephanie','melissa','elizabeth','lauren','megan','kayla','nicole','crystal','tiffany','brittney','vanessa','natalie','danielle','heather','kelly','katie','holly','jackie','lexi','jade','victoria','olivia','sophia','emma','isabella','ava','mia','grace','anna','maria','lisa','michelle']);

function avatarUrl(email?: string, firstName?: string | null, metadataAvatar?: string | null): string {
  // Prefer the real avatar stored in metadata from enrichment
  if (metadataAvatar && typeof metadataAvatar === "string" && metadataAvatar.trim()) {
    return metadataAvatar.replace(/^http:\/\//i, "https://");
  }
  let hash = 0;
  if (email) for (let i = 0; i < email.length; i++) hash += email.charCodeAt(i);
  const num = hash % 50;
  const gender = firstName && FEMALE_NAMES.has(firstName.toLowerCase()) ? "women" : "men";
  return `https://randomuser.me/api/portraits/${gender}/${num}.jpg`;
}

function formatFollowerCount(n: unknown): string {
  const num = Number(n);
  if (!num || isNaN(num)) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" />, urlPrefix: "https://instagram.com/" },
  { key: "tiktok", label: "TikTok", icon: <TikTokIcon className="h-4 w-4" />, urlPrefix: "https://tiktok.com/@" },
  { key: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, urlPrefix: "https://youtube.com/@" },
  { key: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, urlPrefix: "https://linkedin.com/in/" },
  { key: "twitter", label: "X / Twitter", icon: <Twitter className="h-4 w-4" />, urlPrefix: "https://x.com/" },
];

function getSocials(contact: EmailContact): { key: string; label: string; handle: string; icon: React.ReactNode; url: string }[] {
  const results: { key: string; label: string; handle: string; icon: React.ReactNode; url: string }[] = [];
  const meta = contact.metadata ?? {};
  const tags = contact.tags ?? [];
  for (const p of SOCIAL_PLATFORMS) {
    const handle = meta[p.key] as string | undefined;
    if (handle && typeof handle === "string") {
      results.push({ key: p.key, label: p.label, handle, icon: p.icon, url: `${p.urlPrefix}${handle.replace(/^@/, "")}` });
    } else {
      const tag = tags.find(t => t.toLowerCase().startsWith(`${p.key}:`));
      if (tag) {
        const h = tag.split(":")[1]?.trim() ?? "";
        if (h) results.push({ key: p.key, label: p.label, handle: h, icon: p.icon, url: `${p.urlPrefix}${h.replace(/^@/, "")}` });
      }
    }
  }
  return results;
}

interface ContactDrawerProps {
  contact: EmailContact | null;
  open: boolean;
  onClose: () => void;
  lists: EmailList[];
  contactLists: Array<{ list_id: string; list_name: string; status: string }>;
  onEdit: () => void;
  onDelete: () => void;
  onUnsubscribe: () => void;
  onAddToList: (listId: string) => void;
  contactIndex: number;
}

function ContactDrawer({ contact, open, onClose, lists, contactLists, onEdit, onDelete, onUnsubscribe, onAddToList, contactIndex }: ContactDrawerProps) {
  if (!contact) return null;

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email;
  const socials = getSocials(contact);
  const sc = CONTACT_STATUS_COLORS[contact.status] || CONTACT_STATUS_COLORS.subscribed;
  const src = contact.source || "manual";
  const srcColor = SOURCE_COLORS[src] || SOURCE_COLORS.manual;
  const availableLists = lists.filter(l => !contactLists.some(cl => cl.list_id === l.id));

  const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    email_sent: <Send className="h-3.5 w-3.5 text-blue-500" />,
    email_opened: <Eye className="h-3.5 w-3.5 text-green-500" />,
    email_clicked: <MousePointer className="h-3.5 w-3.5 text-blue-600" />,
    unsubscribed: <UserX className="h-3.5 w-3.5 text-red-500" />,
    subscribed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    imported: <Download className="h-3.5 w-3.5 text-amber-500" />,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn("fixed inset-0 bg-black/40 z-40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-[#1A1D27] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Close button */}
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
              <span>{initials(contact.first_name, contact.last_name, contact.email)}</span>
              <img
                src={avatarUrl(contact.email, contact.first_name, contact.metadata?.avatar as string)}
                alt=""
                className="absolute inset-0 w-16 h-16 rounded-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white truncate">{fullName}</h2>
              <p className="text-white/70 text-sm truncate">{contact.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className={`${sc.bg} ${sc.text} text-xs`}>{contact.status}</Badge>
                <Badge className={`${srcColor} text-xs capitalize`}>{src}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Contact Info */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Info</h3>
            <div className="space-y-2.5">
              {[
                { icon: <Mail className="h-4 w-4 text-gray-400" />, label: "Email", value: contact.email },
                { icon: <Phone className="h-4 w-4 text-gray-400" />, label: "Phone", value: contact.phone },
                { icon: <Building2 className="h-4 w-4 text-gray-400" />, label: "Company", value: contact.company },
                { icon: <Briefcase className="h-4 w-4 text-gray-400" />, label: "Title", value: contact.title },
                { icon: <Globe className="h-4 w-4 text-gray-400" />, label: "Website", value: (contact.metadata?.website as string) || null },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  {icon}
                  <span className="text-gray-400 w-16 shrink-0">{label}</span>
                  <span className="text-gray-900 dark:text-white font-medium truncate">{value || "—"}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-sm">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400 w-16 shrink-0">Source</span>
                <Badge className={`${srcColor} text-xs capitalize`}>{src}</Badge>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400 w-16 shrink-0">Added</span>
                <span className="text-gray-900 dark:text-white font-medium">{new Date(contact.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>
            {contact.tags && contact.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {contact.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Creator Stats (from Discovery enrichment) */}
          {(contact.metadata?.followers || contact.metadata?.engagement_rate || contact.metadata?.location || contact.metadata?.bio) && (
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Creator Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {contact.metadata?.followers && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatFollowerCount(contact.metadata.followers)}</p>
                  </div>
                )}
                {contact.metadata?.engagement_rate && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Engagement</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{Number(contact.metadata.engagement_rate).toFixed(2)}%</p>
                  </div>
                )}
              </div>
              {contact.metadata?.platform && contact.metadata?.username && (
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className="capitalize font-medium">{String(contact.metadata.platform)}</span>
                  <span className="text-gray-400">@{String(contact.metadata.username).replace(/^@/, "")}</span>
                </div>
              )}
              {contact.metadata?.location && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{String(contact.metadata.location)}</p>
              )}
              {contact.metadata?.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">{String(contact.metadata.bio)}</p>
              )}
            </div>
          )}

          {/* Social Media */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Social Media</h3>
            {socials.length > 0 ? (
              <div className="space-y-2">
                {socials.map(s => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5 transition-colors group"
                  >
                    <span className="text-gray-500 group-hover:text-[#1e3a5f]">{s.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#1e3a5f]">{s.label}</span>
                    <span className="text-sm text-gray-400 ml-auto truncate">@{s.handle.replace(/^@/, "")}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">No social profiles linked</p>
                <button
                  onClick={onEdit}
                  className="text-xs text-[#1e3a5f] hover:text-[#2d5282] font-medium mt-1 inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activity</h3>
            {(!Array.isArray(contact.activity) || contact.activity.length === 0) ? (
              <p className="text-sm text-gray-400 py-2">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {(Array.isArray(contact.activity) ? contact.activity : []).slice(0, 15).map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {ACTIVITY_ICONS[a.type] ?? <Clock className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{a.type.replace(/_/g, " ")}</p>
                      {a.campaign_name && <p className="text-xs text-gray-500 truncate">{a.campaign_name}</p>}
                      {a.detail && <p className="text-xs text-gray-400 truncate">{a.detail}</p>}
                      <p className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lists */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lists</h3>
              {availableLists.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-xs text-[#1e3a5f] hover:text-[#2d5282] font-medium inline-flex items-center gap-1">
                      <ListPlus className="h-3 w-3" /> Add to List
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {availableLists.map(l => (
                      <DropdownMenuItem key={l.id} onClick={() => onAddToList(l.id)}>
                        {l.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {contactLists.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">Not in any lists</p>
            ) : (
              <div className="space-y-2">
                {contactLists.map(m => {
                  const lsc = CONTACT_STATUS_COLORS[m.status] || CONTACT_STATUS_COLORS.subscribed;
                  return (
                    <div key={m.list_id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{m.list_name}</span>
                      <Badge className={`${lsc.bg} ${lsc.text} text-xs`}>{m.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center gap-2 bg-white dark:bg-[#1A1D27]">
          <Button variant="outline" size="sm" className="rounded-lg" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1.5" /> Edit Contact
          </Button>
          {contact.status === "subscribed" && (
            <Button variant="outline" size="sm" className="rounded-lg text-amber-600 border-amber-300 hover:bg-amber-50" onClick={onUnsubscribe}>
              <UserX className="h-4 w-4 mr-1.5" /> Unsubscribe
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="rounded-lg text-destructive border-red-300 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </div>
      </div>
    </>
  );
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
  const [sortCol, setSortCol] = useState<"first_name"|"last_name"|"email"|"source"|"status"|"added"|null>("added");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

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

  // Drawer state
  const [drawerContact, setDrawerContact] = useState<EmailContact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLists, setDrawerLists] = useState<Array<{ list_id: string; list_name: string; status: string }>>([]);
  const [drawerIndex, setDrawerIndex] = useState(0);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk action modals
  const [bulkListOpen, setBulkListOpen] = useState(false);
  const [bulkListId, setBulkListId] = useState("");
  const [bulkListLoading, setBulkListLoading] = useState(false);

  const [bulkEventOpen, setBulkEventOpen] = useState(false);
  const [bulkEventId, setBulkEventId] = useState("");
  const [bulkTicketId, setBulkTicketId] = useState("");
  const [bulkEventLoading, setBulkEventLoading] = useState(false);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventTickets, setEventTickets] = useState<{ id: string; name: string }[]>([]);

  const [bulkDirOpen, setBulkDirOpen] = useState(false);
  const [bulkDirId, setBulkDirId] = useState("");
  const [bulkDirLoading, setBulkDirLoading] = useState(false);
  const [directories, setDirectories] = useState<Directory[]>([]);

  const openDrawer = async (contact: EmailContact, idx: number) => {
    setDrawerContact(contact);
    setDrawerIndex(idx);
    setDrawerOpen(true);
    const memberships = await getContactListMemberships(contact.email);
    setDrawerLists(memberships);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => { setDrawerContact(null); setDrawerLists([]); }, 300);
  };

  const handleDrawerEdit = () => {
    if (!drawerContact) return;
    setEditForm({
      first_name: drawerContact.first_name,
      last_name: drawerContact.last_name,
      email: drawerContact.email,
      phone: drawerContact.phone,
      company: drawerContact.company,
      title: drawerContact.title,
      tags: drawerContact.tags,
    });
    setDetail(drawerContact);
    setEditMode(true);
  };

  const handleDrawerUnsubscribe = async () => {
    if (!drawerContact) return;
    const ok = await updateFullContact(drawerContact.id, { status: "unsubscribed" });
    if (ok) {
      toast.success("Contact unsubscribed");
      setDrawerContact({ ...drawerContact, status: "unsubscribed" });
      loadData();
    } else {
      toast.error("Failed to unsubscribe");
    }
  };

  const handleDrawerAddToList = async (listId: string) => {
    if (!drawerContact) return;
    const result = await addFullContact({
      list_id: listId,
      email: drawerContact.email,
      first_name: drawerContact.first_name || undefined,
      last_name: drawerContact.last_name || undefined,
      phone: drawerContact.phone || undefined,
      company: drawerContact.company || undefined,
      title: drawerContact.title || undefined,
      tags: drawerContact.tags ?? [],
      source: drawerContact.source,
    });
    if (result) {
      toast.success("Added to list");
      const memberships = await getContactListMemberships(drawerContact.email);
      setDrawerLists(memberships);
      loadData();
    } else {
      toast.error("Failed — may already exist in this list");
    }
  };

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
      ["Email", "First Name", "Last Name", "Phone", "Company", "Title", "Status", "Source", "Tags", "Handle", "Platform", "Followers", "Engagement Rate", "Location", "Date Added"].join(","),
      ...filtered.map(c => {
        const m = c.metadata ?? {};
        return [
          c.email, c.first_name || "", c.last_name || "", c.phone || "", c.company || "", c.title || "",
          c.status, c.source || "manual", (c.tags || []).join(";"),
          m.username ? `@${String(m.username).replace(/^@/, "")}` : "",
          m.platform ? String(m.platform) : "",
          m.followers ? String(m.followers) : "",
          m.engagement_rate ? String(m.engagement_rate) : "",
          m.location ? String(m.location) : "",
          c.created_at,
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      }),
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
      if (updated) {
        setDetail(updated);
        // Also refresh drawer if it's showing the same contact
        if (drawerContact?.id === updated.id) setDrawerContact(updated);
      }
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

  // ── Bulk Selection Helpers ─────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (filteredIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = filteredIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(filteredIds);
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const getSelectedContacts = (): EmailContact[] =>
    contacts.filter((c) => selectedIds.has(c.id));

  // ── Bulk: Add to List ──────────────────────────────────────────

  const handleBulkAddToList = async () => {
    if (!bulkListId) { toast.error("Select a list"); return; }
    setBulkListLoading(true);
    const selected = getSelectedContacts();
    const result = await syncBulkContacts(
      bulkListId,
      selected.map((c) => ({
        email: c.email,
        first_name: c.first_name || undefined,
        last_name: c.last_name || undefined,
        phone: c.phone || undefined,
        company: c.company || undefined,
        title: c.title || undefined,
        source: c.source,
        metadata: c.metadata,
      }))
    );
    toast.success(`Added ${result.inserted} contacts to list (${result.duplicates} already existed)`);
    setBulkListLoading(false);
    setBulkListOpen(false);
    setBulkListId("");
    clearSelection();
    loadData();
  };

  // ── Bulk: Add to Event ─────────────────────────────────────────

  const generateRegCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "MIC2026-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const openBulkEventModal = async () => {
    setBulkEventOpen(true);
    setBulkEventId("");
    setBulkTicketId("");
    setEventTickets([]);
    const { data } = await supabase
      .from("events")
      .select("id, title")
      .order("start_date", { ascending: false });
    setEvents((data as { id: string; title: string }[]) || []);
  };

  const loadTicketsForEvent = async (eventId: string) => {
    setBulkEventId(eventId);
    setBulkTicketId("");
    const { data } = await supabase
      .from("event_tickets")
      .select("id, name")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .order("sort_order");
    setEventTickets((data as { id: string; name: string }[]) || []);
  };

  const handleBulkAddToEvent = async () => {
    if (!bulkEventId) { toast.error("Select an event"); return; }
    setBulkEventLoading(true);
    const selected = getSelectedContacts();

    // Fetch existing registrations for this event to skip duplicates
    const { data: existing } = await supabase
      .from("event_registrations")
      .select("email")
      .eq("event_id", bulkEventId);
    const existingEmails = new Set((existing || []).map((r: any) => r.email?.toLowerCase()));

    const toInsert = selected.filter((c) => !existingEmails.has(c.email.toLowerCase()));
    if (toInsert.length === 0) {
      toast.info("All selected contacts are already registered");
      setBulkEventLoading(false);
      return;
    }

    const KNOWN_BRANCHES = ["army", "navy", "marines", "air force", "coast guard", "space force"];
    const resolveBranch = (c: typeof toInsert[0]): string | null => {
      const meta = (c.metadata as Record<string, unknown>)?.military_branch as string | undefined;
      if (meta) return meta;
      // Check tags for a military branch name
      if (c.tags && c.tags.length > 0) {
        const match = c.tags.find((t) => KNOWN_BRANCHES.includes(t.toLowerCase()));
        if (match) return match;
      }
      return null;
    };

    const rows = toInsert.map((c) => ({
      event_id: bulkEventId,
      ticket_id: bulkTicketId || null,
      first_name: c.first_name || c.email.split("@")[0],
      last_name: c.last_name || "",
      email: c.email,
      phone: c.phone || null,
      company: c.company || null,
      title: c.title || null,
      military_branch: resolveBranch(c),
      registration_code: generateRegCode(),
      status: "confirmed",
      checked_in: false,
    }));

    const { error } = await supabase.from("event_registrations").insert(rows);
    if (error) {
      console.error("Bulk event registration error:", error);
      toast.error(`Failed: ${error.message}`);
    } else {
      const skipped = selected.length - toInsert.length;
      toast.success(`Registered ${toInsert.length} contacts${skipped > 0 ? ` (${skipped} already registered)` : ""}`);
    }
    setBulkEventLoading(false);
    setBulkEventOpen(false);
    clearSelection();
  };

  // ── Bulk: Add to Directory ─────────────────────────────────────

  const openBulkDirModal = async () => {
    setBulkDirOpen(true);
    setBulkDirId("");
    const dirs = await fetchDirectories();
    setDirectories(dirs);
  };

  const handleBulkAddToDir = async () => {
    if (!bulkDirId) { toast.error("Select a directory"); return; }
    setBulkDirLoading(true);
    const selected = getSelectedContacts();
    let added = 0;
    let failed = 0;
    for (const c of selected) {
      const handle = (c.metadata?.username as string) || c.email.split("@")[0];
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || handle;
      const { error } = await addToDirectory(bulkDirId, {
        handle,
        display_name: name,
        platform: (c.metadata?.platform as string) || "instagram",
        avatar_url: (c.metadata?.avatar as string) || null,
        follower_count: c.metadata?.followers ? Number(c.metadata.followers) : null,
        engagement_rate: c.metadata?.engagement_rate ? Number(c.metadata.engagement_rate) : null,
        bio: (c.metadata?.bio as string) || null,
        enrichment_data: c.metadata || {},
      });
      if (error) failed++; else added++;
    }
    toast.success(`Added ${added} to directory${failed > 0 ? ` (${failed} failed/duplicates)` : ""}`);
    setBulkDirLoading(false);
    setBulkDirOpen(false);
    clearSelection();
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

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortCol(null); setSortDir("asc"); }
  };
  const sortArrow = (col: typeof sortCol) =>
    sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const filtered = (() => {
    const list = getFilteredContacts();
    if (sortCol) {
      const dir = sortDir === "asc" ? 1 : -1;
      list.sort((a, b) => {
        let av = "", bv = "";
        switch (sortCol) {
          case "first_name": av = (a.first_name || "").toLowerCase(); bv = (b.first_name || "").toLowerCase(); break;
          case "last_name": av = (a.last_name || "").toLowerCase(); bv = (b.last_name || "").toLowerCase(); break;
          case "email": av = a.email.toLowerCase(); bv = b.email.toLowerCase(); break;
          case "source": av = (a.source || "manual").toLowerCase(); bv = (b.source || "manual").toLowerCase(); break;
          case "status": av = (a.status || "").toLowerCase(); bv = (b.status || "").toLowerCase(); break;
          case "added": return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        return dir * av.localeCompare(bv);
      });
    }
    return list;
  })();
  const visibleIds = filtered.slice(0, 100).map((c) => c.id);

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
          <Button variant="ghost" size="sm" onClick={() => navigate("/brand/email/contacts")} className="mb-4" data-back-nav>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Contacts
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xl font-bold overflow-hidden shrink-0">
                <span>{initials(detail.first_name, detail.last_name, detail.email)}</span>
                <img
                  src={avatarUrl(detail.email, detail.first_name, detail.metadata?.avatar as string)}
                  alt=""
                  className="absolute inset-0 w-14 h-14 rounded-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
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
            {(!Array.isArray(detail.activity) || detail.activity.length === 0) ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {(Array.isArray(detail.activity) ? detail.activity : []).slice(0, 20).map((a, i) => (
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
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))}
                    onCheckedChange={() => toggleSelectAll(visibleIds)}
                  />
                </TableHead>
                <TableHead className="w-10"></TableHead>
                {([["first_name","First Name"],["last_name","Last Name"],["email","Email"],["source","Source"],["status","Status"],["added","Added"]] as const).map(([col, label]) => (
                  <TableHead key={col} className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(col)}>
                    {label}{sortArrow(col)}
                  </TableHead>
                ))}
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((c, idx) => {
                const sc = CONTACT_STATUS_COLORS[c.status] || CONTACT_STATUS_COLORS.subscribed;
                const src = c.source || "manual";
                const isSelected = selectedIds.has(c.id);
                return (
                  <TableRow key={c.id} className={cn("cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30", isSelected && "bg-blue-50/50 dark:bg-blue-900/10")} onClick={() => openDrawer(c, idx)}>
                    <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(c.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="relative h-8 w-8 rounded-full bg-[#1e3a5f]/20 text-[#1e3a5f] flex items-center justify-center text-xs font-bold overflow-hidden">
                        <span>{initials(c.first_name, c.last_name, c.email)}</span>
                        <img
                          src={avatarUrl(c.email, c.first_name, c.metadata?.avatar as string)}
                          alt=""
                          className="absolute inset-0 w-8 h-8 rounded-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
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
      {/* ── Floating Bulk Action Bar ──────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-background">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setBulkListId(""); setBulkListOpen(true); }}>
            <ListPlus className="h-4 w-4 mr-1.5" />
            Add to List
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={openBulkEventModal}>
            <Ticket className="h-4 w-4 mr-1.5" />
            Add to Event
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg text-blue-800 border-blue-400 hover:bg-blue-50 dark:text-blue-500 dark:border-blue-800 dark:hover:bg-blue-950/30" onClick={openBulkDirModal}>
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Add to Directory
          </Button>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={clearSelection}>
            <X className="h-4 w-4 mr-1.5" />
            Clear
          </Button>
        </div>
      )}

      {/* ── Bulk: Add to List Modal ────────────────────────────────── */}
      <Dialog open={bulkListOpen} onOpenChange={setBulkListOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {selectedIds.size} Contacts to Email List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select List</Label>
              <Select value={bulkListId} onValueChange={setBulkListId}>
                <SelectTrigger><SelectValue placeholder="Choose a list..." /></SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Duplicates will be skipped automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkListOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAddToList} disabled={bulkListLoading || !bulkListId}>
              {bulkListLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add to List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk: Add to Event Modal ───────────────────────────────── */}
      <Dialog open={bulkEventOpen} onOpenChange={setBulkEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register {selectedIds.size} Contacts to Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Event</Label>
              <Select value={bulkEventId} onValueChange={loadTicketsForEvent}>
                <SelectTrigger><SelectValue placeholder="Choose an event..." /></SelectTrigger>
                <SelectContent>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkEventId && eventTickets.length > 0 && (
              <div className="space-y-2">
                <Label>Ticket Type (optional)</Label>
                <Select value={bulkTicketId} onValueChange={setBulkTicketId}>
                  <SelectTrigger><SelectValue placeholder="General Admission" /></SelectTrigger>
                  <SelectContent>
                    {eventTickets.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Each contact will get a unique registration code (MIC2026-XXXX).
              Contacts already registered for this event will be skipped.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEventOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAddToEvent} disabled={bulkEventLoading || !bulkEventId}>
              {bulkEventLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Register Contacts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk: Add to Directory Modal ───────────────────────────── */}
      <Dialog open={bulkDirOpen} onOpenChange={setBulkDirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {selectedIds.size} Contacts to Directory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Directory</Label>
              <Select value={bulkDirId} onValueChange={setBulkDirId}>
                <SelectTrigger><SelectValue placeholder="Choose a directory..." /></SelectTrigger>
                <SelectContent>
                  {directories.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Contacts will be added as directory members with their enrichment data.
              Duplicates (same handle) will be skipped.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDirOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAddToDir} disabled={bulkDirLoading || !bulkDirId}>
              {bulkDirLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add to Directory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Drawer */}
      <ContactDrawer
        contact={drawerContact}
        open={drawerOpen}
        onClose={closeDrawer}
        lists={lists}
        contactLists={drawerLists}
        onEdit={handleDrawerEdit}
        onDelete={() => { if (drawerContact) { setDeleteId(drawerContact.id); closeDrawer(); } }}
        onUnsubscribe={handleDrawerUnsubscribe}
        onAddToList={handleDrawerAddToList}
        contactIndex={drawerIndex}
      />
    </>
  );
};

export default EmailContacts;
