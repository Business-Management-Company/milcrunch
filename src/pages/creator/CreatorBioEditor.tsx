import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User,
  Palette,
  Layers,
  Share2,
  Link2,
  ExternalLink,
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Clapperboard,
  MonitorPlay,
  CalendarCheck,
  BookOpen,
  Ticket,
  ShoppingBag,
  HandCoins,
  Link,
  Mic,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Smartphone,
  Tablet,
  Monitor,
  Pencil,
  MessageSquare,
  CreditCard,
  Wifi,
} from "lucide-react";
import type { BioSectionConfig, SectionType, SectionCatalogEntry } from "@/types/bio-page";
import { SECTION_CATALOG, normalizeCustomLinks } from "@/types/bio-page";

/* ── Icon map for section catalog entries ── */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clapperboard,
  MonitorPlay,
  Share2,
  CalendarCheck,
  BookOpen,
  Ticket,
  ShoppingBag,
  HandCoins,
  Link,
  Mic,
  Mail,
};

function getSectionIcon(entry: SectionCatalogEntry) {
  const Icon = ICON_MAP[entry.icon];
  return Icon ? <Icon className="h-5 w-5" /> : <Link2 className="h-5 w-5" />;
}

function generateId() {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ── Sidebar tab definitions ── */
type EditorTab = "profile" | "theme" | "sections" | "share";

const SIDEBAR_TABS: {
  id: EditorTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeColor: string;
  activeBg: string;
}[] = [
  { id: "profile", label: "Profile", icon: User, activeColor: "text-blue-600", activeBg: "bg-blue-100" },
  { id: "theme", label: "Theme", icon: Palette, activeColor: "text-fuchsia-600", activeBg: "bg-gradient-to-br from-pink-100 to-purple-100" },
  { id: "sections", label: "Sections", icon: Layers, activeColor: "text-emerald-600", activeBg: "bg-emerald-100" },
  { id: "share", label: "Share", icon: Share2, activeColor: "text-violet-600", activeBg: "bg-violet-100" },
];

/* ── Phone preview device selector ── */
type PreviewDevice = "phone" | "tablet" | "desktop";

export default function CreatorBioEditor() {
  const { user, creatorProfile } = useAuth();
  const navigate = useNavigate();
  const handle = creatorProfile?.handle ?? "";
  const displayName = (user?.user_metadata?.full_name as string) ?? handle;
  const avatarUrl = (user?.user_metadata?.avatar_url as string) ?? null;
  const bioUrl = handle
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${handle}`
    : "";

  const [sections, setSections] = useState<BioSectionConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("sections");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("phone");
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("preview");

  /* ── Load sections from user_metadata ── */
  useEffect(() => {
    if (!user?.id) return;
    const meta = user.user_metadata ?? {};
    const cl = meta.custom_links;
    const config = normalizeCustomLinks(cl);
    setSections(config.sections ?? []);
    setLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    if (!handle && loaded) {
      navigate("/creator/profile");
    }
  }, [handle, navigate, loaded]);

  /* ── Persist sections to Supabase ── */
  const persistSections = useCallback(
    async (updated: BioSectionConfig[]) => {
      if (!user?.id) return;
      setSaving(true);
      const meta = user.user_metadata ?? {};
      const cl =
        typeof meta.custom_links === "object" && meta.custom_links
          ? (meta.custom_links as Record<string, unknown>)
          : {};
      const { error } = await supabase.auth.updateUser({
        data: { custom_links: { ...cl, sections: updated } },
      });
      setSaving(false);
      if (error) toast.error("Failed to save: " + error.message);
    },
    [user],
  );

  const addSection = (entry: SectionCatalogEntry) => {
    if (sections.find((s) => s.type === entry.type)) {
      toast.info(`${entry.label} is already added.`);
      setModalOpen(false);
      return;
    }
    const newSection: BioSectionConfig = {
      id: generateId(),
      type: entry.type,
      label: entry.label,
      visible: true,
      order: sections.length + 1,
    };
    const updated = [...sections, newSection];
    setSections(updated);
    persistSections(updated);
    setModalOpen(false);
    toast.success(`Added ${entry.label}`);
  };

  const removeSection = (id: string) => {
    const updated = sections
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setSections(updated);
    persistSections(updated);
  };

  const toggleVisibility = (id: string) => {
    const updated = sections.map((s) =>
      s.id === id ? { ...s, visible: !s.visible } : s,
    );
    setSections(updated);
    persistSections(updated);
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sections.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...sections];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setSections(reordered);
    persistSections(reordered);
  };

  const catalogEntryFor = (type: SectionType) =>
    SECTION_CATALOG.find((e) => e.type === type);

  const copyUrl = () => {
    if (!bioUrl) return;
    navigator.clipboard.writeText(bioUrl);
    toast.success("Link copied!");
  };

  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  /* ── Phone frame width per device ── */
  const deviceWidth: Record<PreviewDevice, string> = {
    phone: "w-[280px]",
    tablet: "w-[380px]",
    desktop: "w-[480px]",
  };

  /* ────────────────────────────────────────────────────────────────────── */
  return (
    <CreatorLayout>
      {/* Full-height wrapper — fills the CreatorLayout content area */}
      <div className="flex flex-col h-[calc(100vh-2rem)] -mt-2">
        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card rounded-t-xl shrink-0">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">My Page Builder</h1>
            <p className="text-xs text-muted-foreground">Create your perfect profile</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                persistSections(sections);
                toast.success("Published!");
              }}
            >
              Publish
            </Button>
          </div>
        </div>

        {/* ── BODY: sidebar + content + preview ── */}
        <div className="flex flex-1 min-h-0 bg-muted/30 rounded-b-xl overflow-hidden">
          {/* ── ICON SIDEBAR (hidden on mobile) ── */}
          <div className="hidden md:flex flex-col items-center gap-1 py-4 px-1.5 w-[68px] shrink-0 border-r border-border bg-card">
            {SIDEBAR_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl p-2 w-14 transition-colors ${
                    active ? `${tab.activeBg} ${tab.activeColor}` : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── MOBILE TAB BAR (visible only on small screens) ── */}
          <div className="flex md:hidden items-center gap-1 px-2 py-2 border-b border-border bg-card w-full absolute z-10">
            {SIDEBAR_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? `${tab.activeBg} ${tab.activeColor}` : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── CONTENT PANEL ── */}
          <div className="flex-1 md:max-w-[400px] overflow-y-auto border-r border-border bg-card p-4 pt-14 md:pt-4">
            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Profile</h2>
                <p className="text-xs text-muted-foreground">
                  Edit your display info in&nbsp;
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => navigate("/creator/profile")}
                  >
                    My Profile
                  </button>.
                </p>
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                        {(displayName || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{displayName || "No name set"}</p>
                      <p className="text-xs text-muted-foreground truncate">@{handle}</p>
                    </div>
                  </div>
                  {user?.user_metadata?.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {user.user_metadata.bio as string}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/creator/profile")}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit Profile
                </Button>
              </div>
            )}

            {/* ── THEME TAB ── */}
            {activeTab === "theme" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Theme</h2>
                <p className="text-xs text-muted-foreground">
                  Customize your page theme in&nbsp;
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => navigate("/creator/profile")}
                  >
                    My Profile
                  </button>.
                </p>
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Current theme: <span className="font-medium text-foreground capitalize">{(user?.user_metadata?.bio_page_theme as string) || "light"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hero format: <span className="font-medium text-foreground capitalize">{(user?.user_metadata?.hero_image_format as string) || "landscape"}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/creator/profile")}
                >
                  <Palette className="h-3.5 w-3.5 mr-2" />
                  Edit Theme
                </Button>
              </div>
            )}

            {/* ── SECTIONS TAB ── */}
            {activeTab === "sections" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Page Sections</h2>
                  <span className="text-[11px] text-muted-foreground">
                    {sections.length} section{sections.length === 1 ? "" : "s"}
                  </span>
                </div>

                {sections.map((section, idx) => {
                  const entry = catalogEntryFor(section.type);
                  if (!entry) return null;
                  return (
                    <div
                      key={section.id}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                        section.visible
                          ? "bg-card border-border"
                          : "bg-muted/50 border-border/50 opacity-60"
                      }`}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 cursor-grab" />
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary shrink-0">
                        {getSectionIcon(entry)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-xs truncate">{section.label}</span>
                          {entry.comingSoon && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">
                              Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{entry.description}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveSection(section.id, "up")}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === sections.length - 1} onClick={() => moveSection(section.id, "down")}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Switch
                          checked={section.visible}
                          onCheckedChange={() => toggleVisibility(section.id)}
                          aria-label={section.visible ? "Hide" : "Show"}
                          className="scale-75 origin-center"
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeSection(section.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  className="w-full border-dashed text-xs h-9"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Section
                </Button>
              </div>
            )}

            {/* ── SHARE TAB ── */}
            {activeTab === "share" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Share Your Page</h2>

                {/* URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Your Page URL</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={bioUrl}
                      className="text-xs font-mono h-9 bg-muted/50"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={copyUrl}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs" onClick={copyUrl}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Copy My Page Link
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: displayName, url: bioUrl });
                      } else {
                        copyUrl();
                      }
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5 mr-2" />
                    Share via...
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs"
                    onClick={() => {
                      window.open(`sms:?body=${encodeURIComponent(`Check out my page: ${bioUrl}`)}`, "_blank");
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-2" />
                    Share via Text Message
                  </Button>
                  <Button variant="outline" className="w-full h-9 text-xs" asChild>
                    <a href={bioUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Open My Page
                    </a>
                  </Button>
                </div>

                {/* QR Code */}
                {bioUrl && (
                  <div className="rounded-lg border border-border p-4 flex flex-col items-center gap-3">
                    <p className="text-xs font-medium text-foreground">QR Code</p>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bioUrl)}`}
                      alt="QR Code"
                      className="w-[180px] h-[180px] rounded-md"
                    />
                    <p className="text-[11px] text-muted-foreground text-center">
                      Scan to visit your page
                    </p>
                  </div>
                )}

                {/* NFC Card */}
                <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-violet-100 text-violet-600 shrink-0">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium">NFC Creator Card</p>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">Coming Soon</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Tap-to-share physical card linked to your bio page</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => toast.info("NFC Creator Cards are coming soon!")}>
                    <Wifi className="h-3 w-3 mr-1.5" />
                    Join Waitlist
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── PHONE PREVIEW ── */}
          <div className="hidden lg:flex flex-1 flex-col items-center bg-muted/20 p-4 overflow-y-auto">
            {/* Device & mode toggles */}
            <div className="flex items-center justify-between w-full max-w-[500px] mb-4">
              <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-0.5">
                {([
                  { id: "phone" as PreviewDevice, icon: Smartphone },
                  { id: "tablet" as PreviewDevice, icon: Tablet },
                  { id: "desktop" as PreviewDevice, icon: Monitor },
                ] as const).map(({ id, icon: DIcon }) => (
                  <button
                    key={id}
                    onClick={() => setPreviewDevice(id)}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewDevice === id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <DIcon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-0.5">
                <button
                  onClick={() => setPreviewMode("edit")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    previewMode === "edit"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setPreviewMode("preview")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    previewMode === "preview"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Phone frame */}
            <div className={`${deviceWidth[previewDevice]} transition-all duration-300`}>
              <div className="bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
                {/* Notch */}
                <div className="flex justify-center mb-1">
                  <div className="w-24 h-5 bg-black rounded-full" />
                </div>
                {/* Screen */}
                <div className="bg-white rounded-[2rem] overflow-hidden min-h-[500px] max-h-[600px] overflow-y-auto">
                  {/* Profile header inside phone */}
                  <div className="bg-gradient-to-b from-gray-100 to-white p-5 flex flex-col items-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow" />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-400">
                        {(displayName || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">{displayName || "Your Name"}</h3>
                    <p className="text-[11px] text-gray-500">@{handle}</p>
                  </div>

                  {/* Sections inside phone */}
                  <div className="px-4 pb-6 space-y-2.5">
                    {visibleSections.length === 0 ? (
                      <div className="py-12 text-center">
                        <Layers className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-xs text-gray-400">No sections enabled yet</p>
                        <p className="text-[11px] text-gray-300 mt-1">Add sections from the Sections tab</p>
                      </div>
                    ) : (
                      visibleSections.map((section) => {
                        const entry = catalogEntryFor(section.type);
                        if (!entry) return null;
                        return (
                          <div
                            key={section.id}
                            className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 p-3"
                          >
                            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                              {getSectionIcon(entry)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-gray-900 truncate">{section.label}</span>
                                {entry.comingSoon && (
                                  <span className="text-[8px] bg-gray-200 text-gray-500 px-1 py-px rounded font-medium">SOON</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate">{entry.description}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                {/* Home indicator */}
                <div className="flex justify-center mt-2">
                  <div className="w-28 h-1 bg-gray-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADD SECTION MODAL ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a Section</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {SECTION_CATALOG.map((entry) => {
              const alreadyAdded = sections.some((s) => s.type === entry.type);
              return (
                <button
                  key={entry.type}
                  onClick={() => addSection(entry)}
                  disabled={alreadyAdded}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    alreadyAdded
                      ? "border-border/40 bg-muted/30 opacity-50 cursor-not-allowed"
                      : "border-border hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">
                    {getSectionIcon(entry)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{entry.label}</span>
                      {entry.comingSoon && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Coming Soon
                        </Badge>
                      )}
                      {alreadyAdded && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Added
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </CreatorLayout>
  );
}
