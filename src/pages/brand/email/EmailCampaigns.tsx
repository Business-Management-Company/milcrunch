import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, ArrowLeft, ArrowRight, Loader2, Trash2, Mail, Send, Settings, Users,
  Palette, Eye, Calendar as CalendarIcon, BarChart3, CheckCircle2,
  FolderOpen, ClipboardList, Search,
} from "lucide-react";
import {
  getEmailCampaigns, upsertEmailCampaign, deleteEmailCampaign,
  getEmailLists, getContactCount, getSubscribedContacts, sendEmail,
} from "@/lib/email-db";
import { getEmailTemplates } from "@/lib/email-db";
import { BUILT_IN_TEMPLATES } from "@/lib/email-templates-html";
import { CAMPAIGN_STEPS, STATUS_COLORS } from "@/lib/email-types";
import type { EmailCampaign, EmailList, EmailTemplate, CampaignStats } from "@/lib/email-types";
import { supabase } from "@/integrations/supabase/client";
import { fetchDirectories, fetchDirectoryMembers, type Directory, type DirectoryMember } from "@/lib/directories";
import { useLists } from "@/contexts/ListContext";

interface DirectoryRecipient {
  email: string;
  first_name: string;
  source: string;
}

function extractEmailFromMember(m: DirectoryMember): string | null {
  // Check enrichment_data for emails
  const ed = m.enrichment_data as any;
  if (!ed) return null;
  if (ed.emails?.length) return ed.emails[0];
  if (ed.email) return ed.email;
  if (ed.contact_email) return ed.contact_email;
  if (ed.contact?.email) return ed.contact.email;
  return null;
}

const EmailCampaigns = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isNewRoute = location.pathname.endsWith("/new");

  // List view state
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Campaign builder state
  const [isBuilding, setIsBuilding] = useState(isNewRoute);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);

  // Step 1 — Setup
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [fromName, setFromName] = useState("MilCrunch");
  const [fromEmail, setFromEmail] = useState("noreply@milcrunch.com");

  // Step 2 — Recipients
  const [recipientTab, setRecipientTab] = useState<"email" | "directory" | "lists">("email");
  const [lists, setLists] = useState<EmailList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [listCounts, setListCounts] = useState<Record<string, number>>({});
  // Directory recipients
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [dirMembers, setDirMembers] = useState<DirectoryMember[]>([]);
  const [dirRecipients, setDirRecipients] = useState<DirectoryRecipient[]>([]);
  const [selectedDirRecipients, setSelectedDirRecipients] = useState<Set<string>>(new Set());
  const [dirSearch, setDirSearch] = useState("");
  const [loadingDir, setLoadingDir] = useState(false);
  // Influencer list recipients
  const { lists: influencerLists } = useLists();
  const [selectedInfluencerListIds, setSelectedInfluencerListIds] = useState<Set<string>>(new Set());

  // Step 3 — Design
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [htmlContent, setHtmlContent] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Step 4 — Review
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // Stats dialog
  const [statsDialog, setStatsDialog] = useState<EmailCampaign | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, l, t, dirs] = await Promise.all([
        getEmailCampaigns(), getEmailLists(), getEmailTemplates(), fetchDirectories(),
      ]);
      setCampaigns(c);
      setLists(l);
      setTemplates(t);
      setDirectories(dirs);
      const counts: Record<string, number> = {};
      await Promise.all(l.map(async li => { counts[li.id] = await getContactCount(li.id); }));
      setListCounts(counts);
      setLoading(false);

      // Load directory members and extract emails
      if (dirs.length > 0) {
        setLoadingDir(true);
        const allMembers: DirectoryMember[] = [];
        await Promise.all(dirs.map(async d => {
          const members = await fetchDirectoryMembers(d.id);
          allMembers.push(...members);
        }));
        setDirMembers(allMembers);
        // Extract emails from enrichment_data
        const recipients: DirectoryRecipient[] = [];
        const seen = new Set<string>();
        for (const m of allMembers) {
          const email = extractEmailFromMember(m);
          if (email && !seen.has(email.toLowerCase())) {
            seen.add(email.toLowerCase());
            recipients.push({
              email: email.toLowerCase(),
              first_name: m.creator_name || m.creator_handle,
              source: "directory",
            });
          }
        }
        setDirRecipients(recipients);
        setLoadingDir(false);
      }
    })();
  }, []);

  const hasAnyRecipients = !!selectedListId || selectedDirRecipients.size > 0 || selectedInfluencerListIds.size > 0;

  const resetBuilder = () => {
    setIsBuilding(false);
    setCurrentStep(0);
    setEditingCampaign(null);
    setCampaignName("");
    setSubject("");
    setPreviewText("");
    setFromName("MilCrunch");
    setFromEmail("noreply@milcrunch.com");
    setSelectedListId("");
    setSelectedDirRecipients(new Set());
    setSelectedInfluencerListIds(new Set());
    setRecipientTab("email");
    setHtmlContent("");
    setSending(false);
    setSendProgress(0);
    if (isNewRoute) navigate("/brand/email/campaigns");
  };

  const openBuilder = (campaign?: EmailCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignName(campaign.name);
      setSubject(campaign.subject || "");
      setPreviewText(campaign.preview_text || "");
      setFromName(campaign.from_name || "MilCrunch");
      setFromEmail(campaign.from_email || "noreply@milcrunch.com");
      setSelectedListId(campaign.list_ids?.[0] || "");
      setHtmlContent(campaign.html_content || "");
    }
    setIsBuilding(true);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!campaignName.trim() && !!subject.trim();
      case 1: return hasAnyRecipients;
      case 2: return !!htmlContent.trim();
      case 3: return true;
      default: return false;
    }
  };

  const handleSaveDraft = async () => {
    const result = await upsertEmailCampaign({
      id: editingCampaign?.id,
      name: campaignName.trim(),
      subject: subject.trim(),
      preview_text: previewText.trim() || null,
      from_name: fromName,
      from_email: fromEmail,
      list_ids: selectedListId ? [selectedListId] : [],
      html_content: htmlContent,
      status: "draft",
    });
    if (result) {
      setCampaigns(prev => {
        const idx = prev.findIndex(c => c.id === result.id);
        return idx >= 0 ? prev.map(c => c.id === result.id ? result : c) : [result, ...prev];
      });
      setEditingCampaign(result);
      toast.success("Draft saved");
    } else {
      toast.error("Failed to save draft");
    }
  };

  const handleSendNow = async () => {
    if (!hasAnyRecipients) { toast.error("Select at least one recipient source"); return; }
    setSending(true);
    setSendProgress(0);

    // Save campaign first
    let campaign = await upsertEmailCampaign({
      id: editingCampaign?.id,
      name: campaignName.trim(),
      subject: subject.trim(),
      preview_text: previewText.trim() || null,
      from_name: fromName,
      from_email: fromEmail,
      list_ids: selectedListId ? [selectedListId] : [],
      html_content: htmlContent,
      status: "sending",
    });
    if (!campaign) { toast.error("Failed to save campaign"); setSending(false); return; }

    // Gather all recipients with deduplication
    const allRecipients: Array<{ email: string; first_name: string; id?: string }> = [];
    const seenEmails = new Set<string>();

    // From email lists
    if (selectedListId) {
      const contacts = await getSubscribedContacts(selectedListId);
      for (const c of contacts) {
        const key = c.email.toLowerCase();
        if (!seenEmails.has(key)) {
          seenEmails.add(key);
          allRecipients.push({ email: c.email, first_name: c.first_name || "there", id: c.id });
        }
      }
    }

    // From creator directories
    for (const email of selectedDirRecipients) {
      const key = email.toLowerCase();
      if (!seenEmails.has(key)) {
        seenEmails.add(key);
        const r = dirRecipients.find(d => d.email === email);
        allRecipients.push({ email, first_name: r?.first_name || "there" });
      }
    }

    // From influencer lists (in-memory, no emails typically — skip if no email data)

    if (allRecipients.length === 0) { toast.error("No recipients with valid email addresses"); setSending(false); return; }

    const contacts = allRecipients;

    let sentCount = 0;
    let failCount = 0;
    const batchSize = 10;
    const from = `${fromName} <${fromEmail}>`;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(contact => {
          const personalized = htmlContent
            .replace(/\{\{first_name\}\}/g, contact.first_name || "there")
            .replace(/\{\{email\}\}/g, contact.email)
            .replace(/\{\{unsubscribe_url\}\}/g, `${window.location.origin}/unsubscribe/${contact.id}`);
          return sendEmail({ to: contact.email, from, subject: subject.trim(), html: personalized });
        })
      );
      results.forEach(r => {
        if (r.status === "fulfilled" && r.value.success) sentCount++;
        else failCount++;
      });
      setSendProgress(Math.round(((i + batch.length) / contacts.length) * 100));
      if (i + batchSize < contacts.length) await new Promise(r => setTimeout(r, 1000));
    }

    const stats: CampaignStats = { sent: sentCount, delivered: sentCount, opened: 0, clicked: 0, unsubscribed: 0 };
    const final = await upsertEmailCampaign({
      id: campaign.id,
      name: campaign.name,
      status: failCount === contacts.length ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      stats,
    });
    if (final) setCampaigns(prev => prev.map(c => c.id === final.id ? final : c));

    toast.success(`Campaign sent! ${sentCount} delivered, ${failCount} failed.`);
    setSending(false);
    resetBuilder();
  };

  const handleDeleteCampaign = async () => {
    if (!deleteId) return;
    if (await deleteEmailCampaign(deleteId)) {
      setCampaigns(prev => prev.filter(c => c.id !== deleteId));
      toast.success("Campaign deleted");
    }
    setDeleteId(null);
  };

  // ── Step Content ────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Setup
        return (
          <div className="space-y-5 max-w-2xl">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. March Newsletter" />
            </div>
            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <div className="relative">
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Your weekly update from MilCrunch" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{subject.length}/80</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preview Text</Label>
              <Input value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Shows after subject line in inbox..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input value={fromName} onChange={e => setFromName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} type="email" />
              </div>
            </div>
          </div>
        );

      case 1: { // Recipients
        const filteredDirRecipients = dirRecipients.filter(r =>
          !dirSearch || r.email.includes(dirSearch.toLowerCase()) || r.first_name.toLowerCase().includes(dirSearch.toLowerCase())
        );
        const totalRecipientCount = (selectedListId ? (listCounts[selectedListId] ?? 0) : 0) + selectedDirRecipients.size;

        return (
          <div className="space-y-5 max-w-3xl">
            {/* Tab Pills */}
            <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
              {([
                { key: "email" as const, label: "Email Lists", icon: Mail },
                { key: "directory" as const, label: "Creator Directory", icon: FolderOpen },
                { key: "lists" as const, label: "Influencer Lists", icon: ClipboardList },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setRecipientTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    recipientTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Summary bar */}
            {totalRecipientCount > 0 && (
              <Card className="p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-800 dark:text-green-300">{totalRecipientCount} recipient{totalRecipientCount !== 1 ? "s" : ""} selected</span>
                  <span className="text-green-600 dark:text-green-400">(deduplicated across all sources)</span>
                </div>
              </Card>
            )}

            {/* Email Lists Tab */}
            {recipientTab === "email" && (
              <div className="space-y-4">
                <Label>Select Email List</Label>
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger><SelectValue placeholder="Choose a list..." /></SelectTrigger>
                  <SelectContent>
                    {lists.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({listCounts[l.id] ?? 0} subscribers)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedListId && (
                  <Card className="p-4 bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-pd-blue" />
                      <div>
                        <p className="font-semibold text-foreground">{lists.find(l => l.id === selectedListId)?.name}</p>
                        <p className="text-sm text-muted-foreground">{listCounts[selectedListId] ?? 0} active subscribers</p>
                      </div>
                    </div>
                  </Card>
                )}
                {lists.length === 0 && (
                  <p className="text-sm text-muted-foreground">No lists found. <a href="/brand/email/lists" className="text-pd-blue underline">Create a list first</a>.</p>
                )}
              </div>
            )}

            {/* Creator Directory Tab */}
            {recipientTab === "directory" && (
              <div className="space-y-4">
                {loadingDir ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : dirRecipients.length === 0 ? (
                  <Card className="p-6 text-center">
                    <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">No creators with email addresses found in your directories.</p>
                    <p className="text-xs text-muted-foreground mt-1">Emails are extracted from enrichment data. Enrich creators in Discovery to add email addresses.</p>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{dirRecipients.length}</span> creator{dirRecipients.length !== 1 ? "s" : ""} with email addresses
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedDirRecipients.size === dirRecipients.length) {
                            setSelectedDirRecipients(new Set());
                          } else {
                            setSelectedDirRecipients(new Set(dirRecipients.map(r => r.email)));
                          }
                        }}
                      >
                        {selectedDirRecipients.size === dirRecipients.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={dirSearch}
                        onChange={e => setDirSearch(e.target.value)}
                        placeholder="Search creators..."
                        className="pl-9"
                      />
                    </div>
                    <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                      {filteredDirRecipients.map(r => (
                        <label key={r.email} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0">
                          <Checkbox
                            checked={selectedDirRecipients.has(r.email)}
                            onCheckedChange={(checked) => {
                              setSelectedDirRecipients(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(r.email); else next.delete(r.email);
                                return next;
                              });
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{r.first_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedDirRecipients.size > 0 && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{selectedDirRecipients.size}</span> recipients selected from directories
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Influencer Lists Tab */}
            {recipientTab === "lists" && (
              <div className="space-y-4">
                {influencerLists.length === 0 ? (
                  <Card className="p-6 text-center">
                    <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">No influencer lists found.</p>
                    <p className="text-xs text-muted-foreground mt-1">Create lists in the <a href="/brand/lists" className="text-pd-blue underline">Lists page</a> first.</p>
                  </Card>
                ) : (
                  <>
                    <Label>Select Influencer Lists</Label>
                    <div className="space-y-2">
                      {influencerLists.map(il => (
                        <label key={il.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={selectedInfluencerListIds.has(il.id)}
                            onCheckedChange={(checked) => {
                              setSelectedInfluencerListIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(il.id); else next.delete(il.id);
                                return next;
                              });
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{il.name}</p>
                            <p className="text-xs text-muted-foreground">{il.creators.length} creators</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Note: Only creators with email addresses from enrichment data will receive emails.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        );
      }

      case 2: // Design
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Email Content</Label>
              <Button variant="outline" size="sm" onClick={() => setShowTemplatePicker(true)}>
                <Palette className="h-4 w-4 mr-1" /> Choose Template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use variables: <code className="bg-muted px-1 rounded">{"{{first_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{email}}"}</code>, <code className="bg-muted px-1 rounded">{"{{unsubscribe_url}}"}</code>
            </p>
            <div className="grid grid-cols-2 gap-4" style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}>
              <Textarea value={htmlContent} onChange={e => setHtmlContent(e.target.value)} className="font-mono text-xs resize-none h-full" placeholder="Paste or write your email HTML..." />
              <iframe srcDoc={htmlContent || "<p style='color:#999;padding:20px;font-family:sans-serif;'>Preview will appear here...</p>"} className="w-full border rounded-lg bg-white h-full" title="Email preview" sandbox="" />
            </div>
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6 max-w-3xl">
            {sending ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-pd-blue mb-4" />
                <h3 className="text-xl font-semibold mb-2">Sending Campaign...</h3>
                <Progress value={sendProgress} className="max-w-sm mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{sendProgress}% complete</p>
              </Card>
            ) : (
              <>
                <Card className="p-5">
                  <h3 className="font-semibold text-lg mb-4">Campaign Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{campaignName}</span></div>
                    <div><span className="text-muted-foreground">Subject:</span> <span className="font-medium">{subject}</span></div>
                    <div><span className="text-muted-foreground">From:</span> <span className="font-medium">{fromName} &lt;{fromEmail}&gt;</span></div>
                    <div><span className="text-muted-foreground">Recipients:</span> <span className="font-medium">{(listCounts[selectedListId] ?? 0) + selectedDirRecipients.size} recipients</span></div>
                    {previewText && <div className="col-span-2"><span className="text-muted-foreground">Preview:</span> <span className="font-medium">{previewText}</span></div>}
                  </div>
                </Card>
                <div>
                  <Label className="text-base font-semibold mb-3 block">Email Preview</Label>
                  <iframe srcDoc={htmlContent} className="w-full h-[400px] border rounded-lg bg-white" title="Final preview" sandbox="" />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={handleSaveDraft}>Save as Draft</Button>
                  <Button onClick={handleSendNow} className="bg-green-600 hover:bg-green-700">
                    <Send className="h-4 w-4 mr-2" /> Send Now
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      default: return null;
    }
  };

  // ── Builder View ────────────────────────────────────────────────
  if (isBuilding) {
    const stepIcons = [Settings, Users, Palette, Send];
    return (
      <>
        {/* Template Picker Dialog */}
        <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Choose a Template</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {BUILT_IN_TEMPLATES.map(tpl => (
                <Card key={tpl.category} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-pd-blue transition-all" onClick={() => { setHtmlContent(tpl.html); setShowTemplatePicker(false); toast.success(`"${tpl.name}" template loaded`); }}>
                  <div className="h-20 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${tpl.thumbnail_color}, ${tpl.thumbnail_color}dd)` }}>
                    <Mail className="h-8 w-8 text-white/80" />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  </div>
                </Card>
              ))}
              {templates.map(tpl => (
                <Card key={tpl.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-pd-blue transition-all" onClick={() => { setHtmlContent(tpl.html_content || ""); setShowTemplatePicker(false); toast.success(`"${tpl.name}" template loaded`); }}>
                  <div className="h-20 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${tpl.thumbnail_color || "#6C5CE7"}, ${tpl.thumbnail_color || "#6C5CE7"}dd)` }}>
                    <Mail className="h-8 w-8 text-white/80" />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm">{tpl.name}</p>
                    <Badge variant="secondary" className="text-xs mt-1">Custom</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={resetBuilder} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Campaigns
          </Button>
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white">{editingCampaign ? "Edit Campaign" : "New Campaign"}</h1>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <Progress value={((currentStep + 1) / CAMPAIGN_STEPS.length) * 100} className="mb-4" />
          <div className="flex justify-between">
            {CAMPAIGN_STEPS.map((label, i) => {
              const Icon = stepIcons[i];
              return (
                <button key={i} onClick={() => i < currentStep && setCurrentStep(i)} className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  i === currentStep ? "text-pd-blue" : i < currentStep ? "text-foreground cursor-pointer" : "text-muted-foreground"
                )} disabled={i > currentStep}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    i === currentStep ? "bg-pd-blue text-white" : i < currentStep ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"
                  )}>
                    {i < currentStep ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {renderStep()}

        {/* Navigation */}
        {currentStep < 3 && !sending && (
          <div className="flex justify-between mt-8 pt-4 border-t">
            <Button variant="outline" onClick={() => currentStep > 0 ? setCurrentStep(s => s - 1) : resetBuilder()}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {currentStep === 0 ? "Cancel" : "Back"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
              <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!canProceed()}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── List View ──────────────────────────────────────────────────
  const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
  const sentCampaigns = campaigns.filter(c => c.status === "sent" && c.stats?.sent > 0);
  const avgOpen = sentCampaigns.length > 0 ? Math.round(sentCampaigns.reduce((s, c) => s + ((c.stats?.opened || 0) / (c.stats?.sent || 1)) * 100, 0) / sentCampaigns.length) : 0;
  const avgClick = sentCampaigns.length > 0 ? Math.round(sentCampaigns.reduce((s, c) => s + ((c.stats?.clicked || 0) / (c.stats?.sent || 1)) * 100, 0) / sentCampaigns.length) : 0;

  return (
    <>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Dialog */}
      <Dialog open={!!statsDialog} onOpenChange={() => setStatsDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Campaign Stats</DialogTitle></DialogHeader>
          {statsDialog && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Sent", value: statsDialog.stats?.sent || 0 },
                { label: "Delivered", value: statsDialog.stats?.delivered || 0 },
                { label: "Opened", value: statsDialog.stats?.opened || 0 },
                { label: "Clicked", value: statsDialog.stats?.clicked || 0 },
                { label: "Unsubscribed", value: statsDialog.stats?.unsubscribed || 0 },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Email Campaigns</h1>
          <p className="text-gray-500 dark:text-gray-400">Create, schedule, and track your email campaigns.</p>
        </div>
        <Button onClick={() => openBuilder()}>
          <Plus className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Mail },
          { label: "Emails Sent", value: totalSent.toLocaleString(), icon: Send },
          { label: "Avg Open Rate", value: `${avgOpen}%`, icon: Eye },
          { label: "Avg Click Rate", value: `${avgClick}%`, icon: BarChart3 },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pd-blue/10">
                <stat.icon className="h-5 w-5 text-pd-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Campaigns Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No campaigns yet</p>
          <p className="text-sm mt-1">Create your first email campaign to reach your subscribers.</p>
          <Button className="mt-4" onClick={() => openBuilder()}>
            <Plus className="h-4 w-4 mr-2" /> Create Campaign
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(c => {
                const sc = STATUS_COLORS[c.status] || STATUS_COLORS.draft;
                const listName = lists.find(l => c.list_ids?.includes(l.id))?.name;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {c.subject && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge className={`${sc.bg} ${sc.text}`}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{listName || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{(c.stats?.sent || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{c.stats?.opened || 0}</TableCell>
                    <TableCell className="text-right">{c.stats?.clicked || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status === "draft" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBuilder(c)} title="Edit">
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {c.status === "sent" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStatsDialog(c)} title="Stats">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(c.id)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
};

export default EmailCampaigns;
