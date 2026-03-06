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
  ChevronDown as SelectArrow,
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
}[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "sections", label: "Sections", icon: Layers },
  { id: "share", label: "Share", icon: Share2 },
];

/* ── Phone preview device selector ── */
type PreviewDevice = "phone" | "tablet" | "desktop";

/* ── Theme settings types ── */
type BgMode = "solid" | "gradient" | "image";
type CardStyle = "round" | "square" | "shadow" | "glass";

interface ThemeSettings {
  themeColor: string;
  bgMode: BgMode;
  bgColor: string;
  cardStyle: CardStyle;
  fontFamily: string;
  darkMode: boolean;
}

const THEME_SWATCHES = [
  "#000000", "#374151", "#7f1d1d", "#dc2626",
  "#f97316", "#ea580c", "#db2777", "#9333ea",
  "#1e3a8a", "#3b82f6", "#0d9488", "#16a34a",
  "#d1d5db", "#fce7f3", "#fca5a5", "#fed7aa",
];

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Poppins", label: "Poppins" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Montserrat", label: "Montserrat" },
];

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

  /* ── Theme state ── */
  const [theme, setTheme] = useState<ThemeSettings>({
    themeColor: "#3b82f6",
    bgMode: "solid",
    bgColor: "#ffffff",
    cardStyle: "round",
    fontFamily: "Inter",
    darkMode: false,
  });

  const updateTheme = (patch: Partial<ThemeSettings>) =>
    setTheme((prev) => ({ ...prev, ...patch }));

  /* ── Load sections from user_metadata ── */
  useEffect(() => {
    if (!user?.id) return;
    const meta = user.user_metadata ?? {};
    const cl = meta.custom_links;
    const config = normalizeCustomLinks(cl);
    setSections(config.sections ?? []);
    // Load persisted theme settings if they exist
    if (cl && typeof cl === "object") {
      const saved = (cl as Record<string, unknown>).themeSettings;
      if (saved && typeof saved === "object") {
        setTheme((prev) => ({ ...prev, ...(saved as Partial<ThemeSettings>) }));
      }
    }
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
        data: { custom_links: { ...cl, sections: updated, themeSettings: theme } },
      });
      setSaving(false);
      if (error) toast.error("Failed to save: " + error.message);
    },
    [user, theme],
  );

  /* ── Persist theme only ── */
  const persistTheme = useCallback(
    async (updated: ThemeSettings) => {
      if (!user?.id) return;
      const meta = user.user_metadata ?? {};
      const cl =
        typeof meta.custom_links === "object" && meta.custom_links
          ? (meta.custom_links as Record<string, unknown>)
          : {};
      await supabase.auth.updateUser({
        data: { custom_links: { ...cl, themeSettings: updated } },
      });
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

  /* ── Compute phone preview styles from theme ── */
  const phoneBg = theme.darkMode ? "#111827" : theme.bgColor;
  const phoneText = theme.darkMode ? "#f9fafb" : "#111827";
  const phoneSubtext = theme.darkMode ? "#9ca3af" : "#6b7280";
  const phoneSectionBg = theme.darkMode ? "#1f2937" : "#f9fafb";
  const phoneSectionBorder = theme.darkMode ? "#374151" : "#f3f4f6";
  const phoneCardRadius = theme.cardStyle === "round" ? "0.75rem" : "0.375rem";
  const phoneCardShadow =
    theme.cardStyle === "shadow"
      ? "0 1px 3px rgba(0,0,0,0.12)"
      : theme.cardStyle === "glass"
        ? "0 0 0 1px rgba(255,255,255,0.1)"
        : "none";
  const phoneCardBackdrop = theme.cardStyle === "glass" ? "blur(8px)" : undefined;
  const phoneGlassBg =
    theme.cardStyle === "glass"
      ? theme.darkMode
        ? "rgba(31,41,55,0.6)"
        : "rgba(249,250,251,0.6)"
      : phoneSectionBg;

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
                  className={`flex flex-col items-center gap-0.5 rounded-xl p-2 w-14 transition-all ${
                    active ? "text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  style={
                    active
                      ? { background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }
                      : undefined
                  }
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
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active ? "text-white" : "text-muted-foreground hover:bg-muted"
                  }`}
                  style={
                    active
                      ? { background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }
                      : undefined
                  }
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

            {/* ── THEME TAB (inline editor) ── */}
            {activeTab === "theme" && (
              <div className="space-y-5">
                <h2 className="text-sm font-semibold text-foreground">Theme</h2>

                {/* Theme Color */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Theme Color</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-9 w-9 rounded-md border border-border shrink-0"
                      style={{ backgroundColor: theme.themeColor }}
                    />
                    <Input
                      value={theme.themeColor}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateTheme({ themeColor: v });
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) persistTheme({ ...theme, themeColor: v });
                      }}
                      className="h-9 text-xs font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                  <div className="grid grid-cols-8 gap-1.5 mt-2">
                    {THEME_SWATCHES.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          updateTheme({ themeColor: color });
                          persistTheme({ ...theme, themeColor: color });
                        }}
                        className={`h-7 w-full rounded-md border-2 transition-all ${
                          theme.themeColor.toLowerCase() === color.toLowerCase()
                            ? "border-blue-500 ring-2 ring-blue-500/30 scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Background */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Background</label>
                  <div className="flex gap-1 rounded-full border border-border p-0.5">
                    {(["solid", "gradient", "image"] as BgMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          updateTheme({ bgMode: mode });
                          persistTheme({ ...theme, bgMode: mode });
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                          theme.bgMode === mode
                            ? "bg-[#3B82F6] text-white"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  {theme.bgMode === "solid" && (
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="h-8 w-8 rounded-md border border-border shrink-0"
                        style={{ backgroundColor: theme.bgColor }}
                      />
                      <Input
                        value={theme.bgColor}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateTheme({ bgColor: v });
                          if (/^#[0-9a-fA-F]{6}$/.test(v)) persistTheme({ ...theme, bgColor: v });
                        }}
                        className="h-8 text-xs font-mono uppercase"
                        maxLength={7}
                      />
                    </div>
                  )}
                  {theme.bgMode === "gradient" && (
                    <p className="text-[11px] text-muted-foreground">
                      Gradient uses your theme color fading to the background color.
                    </p>
                  )}
                  {theme.bgMode === "image" && (
                    <p className="text-[11px] text-muted-foreground">
                      Background image upload coming soon.
                    </p>
                  )}
                </div>

                {/* Card Style */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Card Style</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["round", "square", "shadow", "glass"] as CardStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          updateTheme({ cardStyle: style });
                          persistTheme({ ...theme, cardStyle: style });
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                          theme.cardStyle === style
                            ? "bg-[#3B82F6] text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Family */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Font Family</label>
                  <div className="relative">
                    <select
                      value={theme.fontFamily}
                      onChange={(e) => {
                        updateTheme({ fontFamily: e.target.value });
                        persistTheme({ ...theme, fontFamily: e.target.value });
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 pr-8 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <SelectArrow className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Dark Mode */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Dark Mode</label>
                  <Switch
                    checked={theme.darkMode}
                    onCheckedChange={(v) => {
                      updateTheme({ darkMode: v });
                      persistTheme({ ...theme, darkMode: v });
                    }}
                  />
                </div>
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
              {/* Device pills with icon + label */}
              <div className="flex items-center gap-0 rounded-full border border-border bg-card p-1">
                {([
                  { id: "phone" as PreviewDevice, icon: Smartphone, label: "Mobile" },
                  { id: "tablet" as PreviewDevice, icon: Tablet, label: "Tablet" },
                  { id: "desktop" as PreviewDevice, icon: Monitor, label: "Desktop" },
                ] as const).map(({ id, icon: DIcon, label }) => (
                  <button
                    key={id}
                    onClick={() => setPreviewDevice(id)}
                    className={`flex items-center gap-1.5 px-4 h-[30px] rounded-full text-xs font-medium transition-colors ${
                      previewDevice === id
                        ? "bg-[#3B82F6] text-white"
                        : "text-gray-500 hover:text-foreground"
                    }`}
                  >
                    <DIcon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0 rounded-full border border-border bg-card p-1">
                <button
                  onClick={() => setPreviewMode("edit")}
                  className={`px-4 h-[30px] rounded-full text-xs font-medium transition-colors ${
                    previewMode === "edit"
                      ? "bg-[#3B82F6] text-white"
                      : "text-gray-500 hover:text-foreground"
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setPreviewMode("preview")}
                  className={`px-4 h-[30px] rounded-full text-xs font-medium transition-colors ${
                    previewMode === "preview"
                      ? "bg-[#3B82F6] text-white"
                      : "text-gray-500 hover:text-foreground"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Phone frame — realistic iPhone mockup */}
            <div className={`${deviceWidth[previewDevice]} transition-all duration-300 relative`}>
              {/* Side buttons — left: silent switch + volume */}
              <div className="absolute -left-[3px] top-[80px] w-[3px] h-[28px] bg-[#2a2a2a] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[120px] w-[3px] h-[44px] bg-[#2a2a2a] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[170px] w-[3px] h-[44px] bg-[#2a2a2a] rounded-l-sm" />
              {/* Side button — right: power */}
              <div className="absolute -right-[3px] top-[130px] w-[3px] h-[64px] bg-[#2a2a2a] rounded-r-sm" />

              {/* Bezel */}
              <div
                className="rounded-[40px] p-[10px] relative"
                style={{
                  background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)",
                  boxShadow:
                    "0 30px 70px -10px rgba(0,0,0,0.45), 0 15px 35px -5px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.4)",
                }}
              >
                {/* Dynamic Island */}
                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 z-10">
                  <div
                    className="w-[100px] h-[25px] rounded-full"
                    style={{
                      backgroundColor: "#000000",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.05), inset 0 0 2px rgba(0,0,0,1)",
                    }}
                  />
                </div>

                {/* Screen */}
                <div
                  className="rounded-[30px] overflow-hidden min-h-[500px] max-h-[600px] overflow-y-auto relative"
                  style={{
                    backgroundColor: phoneBg,
                    backgroundImage:
                      theme.bgMode === "gradient"
                        ? `linear-gradient(180deg, ${theme.themeColor}22 0%, ${phoneBg} 60%)`
                        : undefined,
                    boxShadow: "inset 0 0 12px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.08)",
                    fontFamily: theme.fontFamily,
                  }}
                >
                  {/* Profile header inside phone */}
                  <div
                    className="p-5 pt-10 flex flex-col items-center"
                    style={{
                      background:
                        theme.bgMode === "gradient"
                          ? "transparent"
                          : theme.darkMode
                            ? "linear-gradient(to bottom, #1f293780, transparent)"
                            : "linear-gradient(to bottom, #f3f4f680, transparent)",
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover shadow"
                        style={{ border: `2px solid ${theme.themeColor}` }}
                      />
                    ) : (
                      <div
                        className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-semibold"
                        style={{
                          backgroundColor: theme.darkMode ? "#374151" : "#e5e7eb",
                          color: phoneSubtext,
                        }}
                      >
                        {(displayName || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <h3
                      className="mt-2 text-sm font-semibold"
                      style={{ color: phoneText, fontFamily: theme.fontFamily }}
                    >
                      {displayName || "Your Name"}
                    </h3>
                    <p className="text-[11px]" style={{ color: phoneSubtext }}>
                      @{handle}
                    </p>
                  </div>

                  {/* Sections inside phone */}
                  <div className="px-4 pb-6 space-y-2.5">
                    {visibleSections.length === 0 ? (
                      <div className="py-12 text-center">
                        <Layers className="h-8 w-8 mx-auto mb-2" style={{ color: phoneSectionBorder }} />
                        <p className="text-xs" style={{ color: phoneSubtext }}>No sections enabled yet</p>
                        <p className="text-[11px] mt-1" style={{ color: phoneSectionBorder }}>
                          Add sections from the Sections tab
                        </p>
                      </div>
                    ) : (
                      visibleSections.map((section) => {
                        const entry = catalogEntryFor(section.type);
                        if (!entry) return null;
                        return (
                          <div
                            key={section.id}
                            className="flex items-center gap-2.5 p-3"
                            style={{
                              borderRadius: phoneCardRadius,
                              border: `1px solid ${phoneSectionBorder}`,
                              backgroundColor: phoneGlassBg,
                              boxShadow: phoneCardShadow,
                              backdropFilter: phoneCardBackdrop,
                            }}
                          >
                            <div
                              className="flex items-center justify-center h-9 w-9 shrink-0"
                              style={{
                                borderRadius: theme.cardStyle === "square" ? "0.375rem" : "0.5rem",
                                backgroundColor: `${theme.themeColor}18`,
                                color: theme.themeColor,
                              }}
                            >
                              {getSectionIcon(entry)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-xs font-medium truncate"
                                  style={{ color: phoneText }}
                                >
                                  {section.label}
                                </span>
                                {entry.comingSoon && (
                                  <span
                                    className="text-[8px] px-1 py-px rounded font-medium"
                                    style={{
                                      backgroundColor: theme.darkMode ? "#374151" : "#e5e7eb",
                                      color: phoneSubtext,
                                    }}
                                  >
                                    SOON
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] truncate" style={{ color: phoneSubtext }}>
                                {entry.description}
                              </p>
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
