import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getConnectedAccounts, type ConnectedAccountRow } from "@/lib/upload-post-sync";
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
  Upload,
  ImagePlus,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  Twitter,
  Settings,
} from "lucide-react";
import { getDominantColorFromFile } from "@/lib/dominant-color";
import type { BioSectionConfig, SectionType, SectionCatalogEntry, HeroImageFormat } from "@/types/bio-page";
import { SECTION_CATALOG, normalizeCustomLinks } from "@/types/bio-page";

/* ── Icon map for section catalog entries ── */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clapperboard, MonitorPlay, Share2, CalendarCheck, BookOpen,
  Ticket, ShoppingBag, HandCoins, Link, Mic, Mail,
};

function getSectionIcon(entry: SectionCatalogEntry) {
  const Icon = ICON_MAP[entry.icon];
  return Icon ? <Icon className="h-5 w-5" /> : <Link2 className="h-5 w-5" />;
}

function generateId() {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ── Social platform icon helper ── */
const SOCIAL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram, youtube: Youtube, facebook: Facebook,
  linkedin: Linkedin, x: Twitter, twitter: Twitter, tiktok: Share2,
};
function socialIcon(platform: string) {
  return SOCIAL_ICON[platform.toLowerCase()] ?? Share2;
}
const SOCIAL_BRAND_COLORS: Record<string, string> = {
  instagram: "#E4405F", youtube: "#FF0000", facebook: "#1877F2",
  linkedin: "#0A66C2", twitter: "#1DA1F2", x: "#000000", tiktok: "#000000",
};

/* ── Sidebar tab definitions ── */
type EditorTab = "profile" | "theme" | "sections" | "share";
const SIDEBAR_TABS: { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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
type ImageStyle = "circular" | "square" | "portrait";

interface ThemeSettings {
  themeColor: string;
  bgMode: BgMode;
  bgColor: string;
  cardStyle: CardStyle;
  fontFamily: string;
  darkMode: boolean;
}

/* ── 4×6 swatch grid (Seeksy-style) ── */
const THEME_SWATCHES = [
  "#000000", "#374151", "#78350f", "#dc2626",
  "#f97316", "#ea580c", "#db2777", "#9333ea",
  "#1e3a8a", "#3b82f6", "#0d9488", "#16a34a",
  "#6366f1", "#8b5cf6", "#14b8a6", "#22c55e",
  "#d1d5db", "#fce7f3", "#fca5a5", "#fed7aa",
  "#bfdbfe", "#e9d5ff", "#a7f3d0", "#ffffff",
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

  /* ── Profile fields (inline editing) ── */
  const [profileName, setProfileName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState<ImageStyle>("circular");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Hero image fields (migrated from CreatorProfile) ── */
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageFormat, setHeroImageFormat] = useState<HeroImageFormat>("landscape");
  const [heroDominantColor, setHeroDominantColor] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  /* ── Connected social accounts ── */
  const [socialAccounts, setSocialAccounts] = useState<ConnectedAccountRow[]>([]);

  const handle = profileHandle || creatorProfile?.handle || "";
  const displayName = profileName || handle;
  const avatarUrl = profileAvatar;
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
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const sectionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Theme state ── */
  const [theme, setTheme] = useState<ThemeSettings>({
    themeColor: "#3b82f6", bgMode: "solid", bgColor: "#ffffff",
    cardStyle: "round", fontFamily: "Inter", darkMode: false,
  });
  const updateTheme = (patch: Partial<ThemeSettings>) =>
    setTheme((prev) => ({ ...prev, ...patch }));

  /* ── Load from user_metadata ── */
  useEffect(() => {
    if (!user?.id) return;
    const meta = user.user_metadata ?? {};
    setProfileName((meta.full_name as string) ?? "");
    setProfileHandle((meta.handle as string) ?? "");
    setProfileBio((meta.bio as string) ?? "");
    setProfileAvatar((meta.avatar_url as string) ?? null);
    if (meta.image_style) setImageStyle(meta.image_style as ImageStyle);
    setHeroImageUrl((meta.hero_image_url as string) ?? null);
    setHeroImageFormat((meta.hero_image_format as HeroImageFormat) ?? "landscape");
    setHeroDominantColor((meta.hero_dominant_color as string) ?? null);
    const cl = meta.custom_links;
    const config = normalizeCustomLinks(cl);
    setSections(config.sections ?? []);
    if (cl && typeof cl === "object") {
      const saved = (cl as Record<string, unknown>).themeSettings;
      if (saved && typeof saved === "object")
        setTheme((prev) => ({ ...prev, ...(saved as Partial<ThemeSettings>) }));
    }
    setLoaded(true);
    // Fetch connected accounts (fallback to creator_social_connections)
    getConnectedAccounts(user.id).then((accs) => {
      if (accs.length > 0) { setSocialAccounts(accs); return; }
      supabase
        .from("creator_social_connections")
        .select("*")
        .eq("user_id", user.id)
        .order("platform")
        .then(({ data }) => {
          if (data?.length) {
            setSocialAccounts(
              data.map((r: any) => ({
                id: r.id, user_id: r.user_id, platform: r.platform,
                platform_user_id: r.upload_post_account_id ?? null,
                platform_username: r.account_name ?? null,
                profile_image_url: r.account_avatar ?? null,
                followers_count: null, raw_data: null,
                created_at: r.connected_at, updated_at: r.connected_at,
              }))
            );
          }
        });
    });
  }, [user?.id]);

  useEffect(() => {
    if (!handle && loaded) setActiveTab("profile");
  }, [handle, loaded]);

  /* ── Debounced profile save (1s after last keystroke) ── */
  const debouncedProfileSave = useCallback(
    (fields: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!user?.id) return;
        setSaving(true);
        const { error } = await supabase.auth.updateUser({ data: fields });
        setSaving(false);
        if (error) toast.error("Failed to save: " + error.message);
      }, 1000);
    },
    [user],
  );

  /* ── Avatar upload ── */
  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    setUploadingAvatar(true);
    try {
      const { error: upErr } = await supabase.storage
        .from("bio-images")
        .upload(path, file, { upsert: true });
      if (upErr) { toast.error(upErr.message); return; }
      const { data: urlData } = supabase.storage.from("bio-images").getPublicUrl(path);
      const url = urlData.publicUrl;
      setProfileAvatar(url);
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      toast.success("Profile image uploaded");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  /* ── Hero image upload ── */
  const uploadHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/hero-${Date.now()}.${ext}`;
    setUploadingHero(true);
    try {
      const { error: upErr } = await supabase.storage
        .from("bio-images")
        .upload(path, file, { upsert: true });
      if (upErr) { toast.error(upErr.message); return; }
      const { data: urlData } = supabase.storage.from("bio-images").getPublicUrl(path);
      const url = urlData.publicUrl;
      setHeroImageUrl(url);
      const color = await getDominantColorFromFile(file);
      if (color) setHeroDominantColor(color);
      await supabase.auth.updateUser({
        data: { hero_image_url: url, hero_dominant_color: color || null },
      });
      toast.success("Hero image uploaded");
    } finally {
      setUploadingHero(false);
      e.target.value = "";
    }
  };

  /* ── Persist sections to Supabase ── */
  const persistSections = useCallback(
    async (updated: BioSectionConfig[]) => {
      if (!user?.id) return;
      setSaving(true);
      const meta = user.user_metadata ?? {};
      const cl = typeof meta.custom_links === "object" && meta.custom_links
        ? (meta.custom_links as Record<string, unknown>) : {};
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
      const cl = typeof meta.custom_links === "object" && meta.custom_links
        ? (meta.custom_links as Record<string, unknown>) : {};
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
      id: generateId(), type: entry.type, label: entry.label,
      visible: true, order: sections.length + 1,
    };
    const updated = [...sections, newSection];
    setSections(updated);
    persistSections(updated);
    setModalOpen(false);
    toast.success(`Added ${entry.label}`);
  };

  const removeSection = (id: string) => {
    const updated = sections.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 }));
    setSections(updated);
    persistSections(updated);
  };

  const toggleVisibility = (id: string) => {
    const updated = sections.map((s) => s.id === id ? { ...s, visible: !s.visible } : s);
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

  const catalogEntryFor = (type: SectionType) => SECTION_CATALOG.find((e) => e.type === type);

  /** Update a section's config and debounce-save to Supabase. */
  const updateSectionConfig = useCallback(
    (sectionId: string, patch: Record<string, unknown>) => {
      setSections((prev) => {
        const updated = prev.map((s) =>
          s.id === sectionId ? { ...s, config: { ...(s.config ?? {}), ...patch } } : s
        );
        if (sectionSaveTimerRef.current) clearTimeout(sectionSaveTimerRef.current);
        sectionSaveTimerRef.current = setTimeout(() => persistSections(updated), 1000);
        return updated;
      });
    },
    [persistSections],
  );

  const copyUrl = () => {
    if (!bioUrl) return;
    navigator.clipboard.writeText(bioUrl);
    toast.success("Link copied!");
  };

  const visibleSections = sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);

  /* ── Phone frame width per device (Seeksy-style: 380px phone frame) ── */
  const deviceWidth: Record<PreviewDevice, string> = {
    phone: "w-[380px]",
    tablet: "w-[480px]",
    desktop: "w-[560px]",
  };

  /* ── Preview avatar shape from imageStyle ── */
  const avatarRadius = imageStyle === "circular" ? "9999px" : imageStyle === "square" ? "0.5rem" : "0.5rem";
  const avatarAspect = imageStyle === "portrait" ? "aspect-[3/4]" : "aspect-square";

  /* ── Compute phone preview styles from theme ── */
  const phoneBg = theme.darkMode ? "#111827" : theme.bgColor;
  const phoneText = theme.darkMode ? "#f9fafb" : "#111827";
  const phoneSubtext = theme.darkMode ? "#9ca3af" : "#6b7280";
  const phoneSectionBg = theme.darkMode ? "#1f2937" : "#f9fafb";
  const phoneSectionBorder = theme.darkMode ? "#374151" : "#f3f4f6";
  const phoneCardRadius = theme.cardStyle === "round" ? "0.75rem" : "0.375rem";
  const phoneCardShadow = theme.cardStyle === "shadow"
    ? "0 1px 3px rgba(0,0,0,0.12)" : theme.cardStyle === "glass"
      ? "0 0 0 1px rgba(255,255,255,0.1)" : "none";
  const phoneCardBackdrop = theme.cardStyle === "glass" ? "blur(8px)" : undefined;
  const phoneGlassBg = theme.cardStyle === "glass"
    ? theme.darkMode ? "rgba(31,41,55,0.6)" : "rgba(249,250,251,0.6)"
    : phoneSectionBg;

  /* ────────────────────────────────────────────────────────────────── */
  return (
    <CreatorLayout>
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
              onClick={() => { persistSections(sections); toast.success("Published!"); }}
            >
              Publish
            </Button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex flex-1 min-h-0 bg-muted/30 rounded-b-xl overflow-hidden">
          {/* ── ICON SIDEBAR (desktop) ── */}
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
                  style={active ? { background: "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)" } : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── MOBILE TAB BAR ── */}
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
                  style={active ? { background: "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)" } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── CONTENT PANEL ── */}
          <div className="flex-1 md:max-w-[400px] overflow-y-auto border-r border-border bg-card p-4 pt-14 md:pt-4">

            {/* ── PROFILE TAB (inline editor) ── */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                <h2 className="text-sm font-semibold text-foreground">Profile</h2>

                {/* 1. Profile Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Profile Image</label>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={uploadAvatar}
                    className="hidden"
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-border hover:border-blue-400 transition-colors p-4 flex flex-col items-center gap-2"
                  >
                    {profileAvatar ? (
                      <img
                        src={profileAvatar}
                        alt="Profile"
                        className="h-20 w-20 object-cover"
                        style={{ borderRadius: avatarRadius }}
                      />
                    ) : uploadingAvatar ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">
                      {profileAvatar ? "Change profile image" : "Upload profile image"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">PNG, JPG up to 5MB</span>
                  </button>
                </div>

                {/* 2. Image Style */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Image Style</label>
                  <div className="flex gap-1 rounded-full border border-border p-0.5">
                    {(["circular", "square", "portrait"] as ImageStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          setImageStyle(style);
                          debouncedProfileSave({ image_style: style });
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                          imageStyle === style
                            ? "bg-[#3B82F6] text-white"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Hero / Cover Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Hero / Cover Image</label>
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={uploadHero}
                    className="hidden"
                  />
                  <button
                    onClick={() => heroInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-border hover:border-blue-400 transition-colors p-4 flex flex-col items-center gap-2"
                  >
                    {heroImageUrl ? (
                      <img
                        src={heroImageUrl}
                        alt="Hero"
                        className="w-full h-24 object-cover rounded-md"
                      />
                    ) : uploadingHero ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">
                      {heroImageUrl ? "Change hero image" : "Upload hero image"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">PNG, JPG up to 10MB</span>
                  </button>
                  {heroImageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        setHeroImageUrl(null);
                        setHeroDominantColor(null);
                        debouncedProfileSave({ hero_image_url: null, hero_dominant_color: null });
                      }}
                    >
                      Remove hero image
                    </Button>
                  )}
                  {heroDominantColor && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-sm border border-border" style={{ backgroundColor: heroDominantColor }} />
                      <span className="text-[10px] text-muted-foreground">Extracted accent: {heroDominantColor}</span>
                    </div>
                  )}
                </div>

                {/* 4. Hero Image Format */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Hero Format</label>
                  <p className="text-[10px] text-muted-foreground/80">How the hero image displays on your public bio page.</p>
                  <div className="flex gap-1 rounded-full border border-border p-0.5">
                    {(["portrait", "square", "landscape"] as HeroImageFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => {
                          setHeroImageFormat(fmt);
                          debouncedProfileSave({ hero_image_format: fmt });
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                          heroImageFormat === fmt
                            ? "bg-[#3B82F6] text-white"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                  <Input
                    value={profileName}
                    onChange={(e) => {
                      setProfileName(e.target.value);
                      debouncedProfileSave({ full_name: e.target.value });
                    }}
                    placeholder="Your name"
                    className="h-9 text-sm"
                  />
                </div>

                {/* 6. Username / Handle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Username</label>
                  <Input
                    value={profileHandle}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
                      setProfileHandle(v);
                      debouncedProfileSave({ handle: v });
                    }}
                    placeholder="your-username"
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    milcrunch.com/c/{profileHandle || "your-username"}
                  </p>
                </div>

                {/* 7. Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Bio</label>
                  <Textarea
                    value={profileBio}
                    onChange={(e) => {
                      setProfileBio(e.target.value);
                      debouncedProfileSave({ bio: e.target.value });
                    }}
                    placeholder="Tell your audience about yourself..."
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Social Links */}
                {socialAccounts.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Social Links</label>
                    <div className="space-y-1.5">
                      {socialAccounts.map((acc) => {
                        const SIcon = socialIcon(acc.platform);
                        return (
                          <div key={acc.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                            <SIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate capitalize">{acc.platform}</p>
                              {acc.platform_username && (
                                <p className="text-[11px] text-muted-foreground truncate">@{acc.platform_username}</p>
                              )}
                            </div>
                            <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" title="Connected" />
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => navigate("/creator/socials")}
                    >
                      Manage Connections
                    </Button>
                  </div>
                )}
                {socialAccounts.length === 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Social Links</label>
                    <div className="rounded-lg border border-dashed border-border p-4 text-center">
                      <p className="text-xs text-muted-foreground">No accounts connected yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs h-8"
                        onClick={() => navigate("/creator/socials")}
                      >
                        Connect Accounts
                      </Button>
                    </div>
                  </div>
                )}
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
                    <div className="h-9 w-9 rounded-md border border-border shrink-0" style={{ backgroundColor: theme.themeColor }} />
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
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {THEME_SWATCHES.map((color) => (
                      <button
                        key={color}
                        onClick={() => { updateTheme({ themeColor: color }); persistTheme({ ...theme, themeColor: color }); }}
                        className={`h-9 w-full rounded-lg border-2 transition-all ${
                          theme.themeColor.toLowerCase() === color.toLowerCase()
                            ? "border-blue-500 ring-2 ring-blue-500/30 scale-105"
                            : "border-transparent hover:scale-[1.02]"
                        }`}
                        style={{ backgroundColor: color, ...(color === "#ffffff" ? { border: "1px solid #e5e7eb" } : {}) }}
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
                        onClick={() => { updateTheme({ bgMode: mode }); persistTheme({ ...theme, bgMode: mode }); }}
                        className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                          theme.bgMode === mode ? "bg-[#3B82F6] text-white" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  {theme.bgMode === "solid" && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-8 w-8 rounded-md border border-border shrink-0" style={{ backgroundColor: theme.bgColor }} />
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
                    <p className="text-[11px] text-muted-foreground">Gradient uses your theme color fading to the background color.</p>
                  )}
                  {theme.bgMode === "image" && (
                    <p className="text-[11px] text-muted-foreground">Background image upload coming soon.</p>
                  )}
                </div>

                {/* Card Style */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Card Style</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["round", "square", "shadow", "glass"] as CardStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => { updateTheme({ cardStyle: style }); persistTheme({ ...theme, cardStyle: style }); }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                          theme.cardStyle === style ? "bg-[#3B82F6] text-white" : "bg-muted text-muted-foreground hover:text-foreground"
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
                      onChange={(e) => { updateTheme({ fontFamily: e.target.value }); persistTheme({ ...theme, fontFamily: e.target.value }); }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 pr-8 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
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
                    onCheckedChange={(v) => { updateTheme({ darkMode: v }); persistTheme({ ...theme, darkMode: v }); }}
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
                        section.visible ? "bg-card border-border" : "bg-muted/50 border-border/50 opacity-60"
                      }`}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 cursor-grab" />
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary shrink-0">
                        {getSectionIcon(entry)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-xs truncate">{section.label}</span>
                          {entry.comingSoon && <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">Soon</Badge>}
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
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingSectionId(section.id)} title="Edit section">
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                        <Switch checked={section.visible} onCheckedChange={() => toggleVisibility(section.id)} aria-label={section.visible ? "Hide" : "Show"} className="scale-75 origin-center" />
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeSection(section.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button variant="outline" className="w-full border-dashed text-xs h-9" onClick={() => setModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Section
                </Button>
              </div>
            )}

            {/* ── SHARE TAB ── */}
            {activeTab === "share" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Share Your Page</h2>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Your Page URL</label>
                  <div className="flex gap-2">
                    <Input readOnly value={bioUrl} className="text-xs font-mono h-9 bg-muted/50" onClick={(e) => (e.target as HTMLInputElement).select()} />
                    <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={copyUrl}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs" onClick={copyUrl}>
                    <Copy className="h-3.5 w-3.5 mr-2" />Copy My Page Link
                  </Button>
                  <Button variant="outline" className="w-full h-9 text-xs" onClick={() => { if (navigator.share) navigator.share({ title: displayName, url: bioUrl }); else copyUrl(); }}>
                    <Share2 className="h-3.5 w-3.5 mr-2" />Share via...
                  </Button>
                  <Button variant="outline" className="w-full h-9 text-xs" onClick={() => window.open(`sms:?body=${encodeURIComponent(`Check out my page: ${bioUrl}`)}`, "_blank")}>
                    <MessageSquare className="h-3.5 w-3.5 mr-2" />Share via Text Message
                  </Button>
                  <Button variant="outline" className="w-full h-9 text-xs" asChild>
                    <a href={bioUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-2" />Open My Page</a>
                  </Button>
                </div>
                {bioUrl && (
                  <div className="rounded-lg border border-border p-4 flex flex-col items-center gap-3">
                    <p className="text-xs font-medium text-foreground">QR Code</p>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bioUrl)}`} alt="QR Code" className="w-[180px] h-[180px] rounded-md" />
                    <p className="text-[11px] text-muted-foreground text-center">Scan to visit your page</p>
                  </div>
                )}
                <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-violet-100 text-violet-600 shrink-0"><CreditCard className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium">NFC Creator Card</p>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">Coming Soon</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Tap-to-share physical card linked to your bio page</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => toast.info("NFC Creator Cards are coming soon!")}>
                    <Wifi className="h-3 w-3 mr-1.5" />Join Waitlist
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── PHONE PREVIEW ── */}
          <div className="hidden lg:flex flex-1 flex-col items-center bg-muted/20 p-4 overflow-y-auto">
            {/* Device & mode toggles */}
            <div className="flex items-center justify-between w-full max-w-[600px] mb-4">
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
                      previewDevice === id ? "bg-[#3B82F6] text-white" : "text-gray-500 hover:text-foreground"
                    }`}
                  >
                    <DIcon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0 rounded-full border border-border bg-card p-1">
                <button onClick={() => setPreviewMode("edit")} className={`px-4 h-[30px] rounded-full text-xs font-medium transition-colors ${previewMode === "edit" ? "bg-[#3B82F6] text-white" : "text-gray-500 hover:text-foreground"}`}>Edit</button>
                <button onClick={() => setPreviewMode("preview")} className={`px-4 h-[30px] rounded-full text-xs font-medium transition-colors ${previewMode === "preview" ? "bg-[#3B82F6] text-white" : "text-gray-500 hover:text-foreground"}`}>Preview</button>
              </div>
            </div>

            {/* Phone frame — Seeksy-style mockup (380×780, 348×720 screen) */}
            <div className={`${deviceWidth[previewDevice]} transition-all duration-300 relative`}>
              {/* Side buttons — volume (left), power (right) */}
              <div className="absolute -left-[3px] top-[130px] w-[3px] h-[30px] bg-[#1a1a1a] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[180px] w-[3px] h-[56px] bg-[#1a1a1a] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[248px] w-[3px] h-[56px] bg-[#1a1a1a] rounded-l-sm" />
              <div className="absolute -right-[3px] top-[200px] w-[3px] h-[80px] bg-[#1a1a1a] rounded-r-sm" />

              {/* Bezel — dark frame */}
              <div
                className="rounded-[48px] relative"
                style={{
                  padding: "30px 16px",
                  backgroundColor: "#1a1a1a",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
                }}
              >
                {/* Dynamic Island — true black pill */}
                <div className="absolute top-[16px] left-1/2 -translate-x-1/2 z-10">
                  <div className="w-32 h-7 rounded-full bg-black" />
                </div>

                {/* Screen — 348×720 */}
                <div
                  className="rounded-[32px] overflow-hidden overflow-y-auto relative"
                  style={{
                    width: "348px",
                    height: "720px",
                    backgroundColor: phoneBg,
                    backgroundImage: theme.bgMode === "gradient" ? `linear-gradient(180deg, ${theme.themeColor}22 0%, ${phoneBg} 60%)` : undefined,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  {/* Hero image */}
                  {heroImageUrl && (
                    <div className="w-full overflow-hidden" style={{ height: heroImageFormat === "portrait" ? "200px" : heroImageFormat === "square" ? "160px" : "120px" }}>
                      <img src={heroImageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Profile header */}
                  <div className={`px-5 ${heroImageUrl ? "pt-4" : "pt-14"} pb-3 flex flex-col items-center`}>
                    {/* Avatar — 64px circular */}
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover shadow-sm" style={{ border: `2px solid ${theme.themeColor}` }} />
                    ) : (
                      <div className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-semibold" style={{ backgroundColor: theme.darkMode ? "#374151" : "#e5e7eb", color: phoneSubtext }}>
                        {(displayName || "?")[0].toUpperCase()}
                      </div>
                    )}
                    {/* Name — 18px bold */}
                    <h3 className="mt-2.5 font-bold leading-tight" style={{ fontSize: "18px", color: phoneText, fontFamily: theme.fontFamily }}>
                      {displayName || "Your Name"}
                    </h3>
                    {/* Username — 13px gray */}
                    <p className="mt-0.5" style={{ fontSize: "13px", color: phoneSubtext }}>@{handle || "username"}</p>
                    {/* Certified Voice badge */}
                    <div className="flex items-center gap-1 mt-2 px-3 py-1 rounded-full border" style={{ borderColor: theme.themeColor, color: theme.themeColor }}>
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      <span className="text-[11px] font-medium">Certified Voice</span>
                    </div>
                    {/* Bio */}
                    {profileBio && (
                      <p className="text-xs mt-2 text-center max-w-[280px] leading-relaxed line-clamp-3" style={{ color: phoneSubtext }}>
                        {profileBio}
                      </p>
                    )}
                  </div>

                  {/* Sections — render actual content per type */}
                  <div className="px-4 pb-10 space-y-3">
                    {visibleSections.length === 0 ? (
                      <div className="py-12 text-center">
                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: phoneSubtext }} />
                        <p className="text-sm" style={{ color: phoneSubtext }}>No sections yet</p>
                        <p className="text-[11px] mt-0.5 opacity-60" style={{ color: phoneSubtext }}>Add sections from the Sections tab</p>
                      </div>
                    ) : (
                      visibleSections.map((section) => {
                        const entry = catalogEntryFor(section.type);
                        if (!entry) return null;
                        const cfg = (section.config ?? {}) as Record<string, any>;

                        /* Card style from theme */
                        const cardBg = theme.cardStyle === "glass"
                          ? theme.darkMode ? "rgba(31,41,55,0.6)" : "rgba(255,255,255,0.7)"
                          : theme.darkMode ? "#1f2937" : "#ffffff";
                        const cardRadius = theme.cardStyle === "square" ? "6px" : "12px";
                        const cardShadow = theme.cardStyle === "shadow"
                          ? "0 2px 8px rgba(0,0,0,0.08)"
                          : theme.cardStyle === "glass"
                            ? "0 0 0 1px rgba(255,255,255,0.1)"
                            : "0 1px 3px rgba(0,0,0,0.04)";
                        const cardBackdrop = theme.cardStyle === "glass" ? "blur(12px)" : undefined;
                        const cStyle: React.CSSProperties = {
                          borderRadius: cardRadius,
                          backgroundColor: cardBg,
                          boxShadow: cardShadow,
                          backdropFilter: cardBackdrop,
                          padding: "16px",
                        };

                        /* ── Social Links ── */
                        if (section.type === "social_links") {
                          const accs = socialAccounts.filter((acc) => {
                            const toggles = (cfg.platformToggles as any[]) ?? [];
                            const t = toggles.find((t: any) => t.platform === acc.platform);
                            return t ? t.enabled : true;
                          });
                          return (
                            <div key={section.id} style={cStyle}>
                              <p className="text-xs font-semibold mb-3" style={{ color: phoneText }}>Social Links</p>
                              {accs.length > 0 ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {accs.map((acc) => {
                                    const SIcon = socialIcon(acc.platform);
                                    const brandColor = SOCIAL_BRAND_COLORS[acc.platform.toLowerCase()] ?? theme.themeColor;
                                    return (
                                      <div key={acc.id} className="flex items-center justify-center rounded-full shadow-sm" style={{ width: 40, height: 40, backgroundColor: brandColor }}>
                                        <SIcon className="h-5 w-5 text-white" />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs" style={{ color: phoneSubtext }}>No social accounts connected yet</p>
                              )}
                            </div>
                          );
                        }

                        /* ── Podcast ── */
                        if (section.type === "podcast") {
                          return (
                            <div key={section.id} style={cStyle}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold tracking-wide" style={{ color: theme.themeColor, fontSize: "14px" }}>&bull;&bull;&bull;</span>
                                <span className="text-sm font-semibold" style={{ color: theme.themeColor }}>{section.label}</span>
                              </div>
                              <p className="text-xs mt-1" style={{ color: phoneSubtext }}>Display your podcast episodes</p>
                            </div>
                          );
                        }

                        /* ── Custom Links ── */
                        if (section.type === "custom_links") {
                          const links = (cfg.links as any[]) ?? [];
                          return (
                            <div key={section.id} style={cStyle}>
                              <div className="flex items-center gap-2 mb-2">
                                <Link className="h-4 w-4" style={{ color: theme.themeColor }} />
                                <span className="text-sm font-semibold" style={{ color: theme.themeColor }}>Custom Links</span>
                              </div>
                              {links.length > 0 ? (
                                <div className="space-y-1.5">
                                  {links.slice(0, 3).map((link: any) => (
                                    <div key={link.id} className="text-xs py-1.5 px-3 rounded-lg truncate" style={{ backgroundColor: `${theme.themeColor}10`, color: phoneText }}>
                                      {link.label || link.url || "Untitled link"}
                                    </div>
                                  ))}
                                  {links.length > 3 && (
                                    <p className="text-[10px] pl-3" style={{ color: phoneSubtext }}>+{links.length - 3} more</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs" style={{ color: phoneSubtext }}>Add links to display here</p>
                              )}
                            </div>
                          );
                        }

                        /* ── Book a Meeting ── */
                        if (section.type === "book_meeting") {
                          return (
                            <div key={section.id} style={cStyle}>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-10 w-10 rounded-lg shrink-0" style={{ backgroundColor: `${theme.themeColor}15` }}>
                                  <CalendarCheck className="h-5 w-5" style={{ color: theme.themeColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold" style={{ color: phoneText }}>{(cfg.buttonLabel as string) || "Book a Meeting"}</p>
                                  <p className="text-xs" style={{ color: phoneSubtext }}>Schedule time with me</p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        /* ── Default section card ── */
                        return (
                          <div key={section.id} style={cStyle}>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-10 w-10 rounded-lg shrink-0" style={{ backgroundColor: `${theme.themeColor}15`, color: theme.themeColor }}>
                                {getSectionIcon(entry)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium truncate" style={{ color: phoneText }}>{section.label}</span>
                                  {entry.comingSoon && (
                                    <span className="text-[9px] px-1.5 py-px rounded font-medium" style={{ backgroundColor: theme.darkMode ? "#374151" : "#e5e7eb", color: phoneSubtext }}>SOON</span>
                                  )}
                                </div>
                                <p className="text-xs truncate" style={{ color: phoneSubtext }}>{entry.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Home indicator bar — inside screen at bottom */}
                  <div className="sticky bottom-0 flex justify-center pb-2 pt-1">
                    <div className="w-28 h-1 rounded-full" style={{ backgroundColor: theme.darkMode ? "#4b5563" : "#d1d5db" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION EDITOR SLIDE-OUT PANEL ── */}
      {editingSectionId && (() => {
        const section = sections.find((s) => s.id === editingSectionId);
        if (!section) return null;
        const entry = catalogEntryFor(section.type);
        if (!entry) return null;
        const cfg = (section.config ?? {}) as Record<string, any>;
        const showAddBtn = section.type === "custom_links";

        return (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setEditingSectionId(null)} />
            {/* Panel */}
            <div className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary shrink-0">
                  {getSectionIcon(entry)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">{section.label}</h3>
                  <p className="text-[11px] text-muted-foreground">{entry.description}</p>
                </div>
                <button
                  onClick={() => setEditingSectionId(null)}
                  className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Add button bar (for applicable types) */}
              {showAddBtn && (
                <div className="px-5 py-2.5 border-b border-border flex justify-end shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      const links = (cfg.links ?? []) as any[];
                      updateSectionConfig(section.id, {
                        links: [...links, { id: generateId(), label: "", url: "", thumbnail: "", group: "" }],
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />Add Link
                  </Button>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* ── SOCIAL LINKS ── */}
                {section.type === "social_links" && (
                  <div className="space-y-2">
                    {socialAccounts.length === 0 ? (
                      <div className="text-center py-6">
                        <Share2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">No social accounts connected.</p>
                        <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => navigate("/creator/socials")}>
                          Connect Accounts
                        </Button>
                      </div>
                    ) : (
                      socialAccounts.map((acc) => {
                        const SIcon = socialIcon(acc.platform);
                        const toggles = (cfg.platformToggles ?? []) as Array<{ platform: string; enabled: boolean }>;
                        const toggle = toggles.find((t) => t.platform === acc.platform);
                        const enabled = toggle ? toggle.enabled : true;
                        return (
                          <div key={acc.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                            <SIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium capitalize">{acc.platform}</p>
                              {acc.platform_username && (
                                <p className="text-[11px] text-muted-foreground truncate">@{acc.platform_username}</p>
                              )}
                            </div>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(v) => {
                                const newToggles = socialAccounts.map((a) => ({
                                  platform: a.platform,
                                  enabled: a.platform === acc.platform
                                    ? v
                                    : ((toggles.find((t) => t.platform === a.platform)?.enabled) ?? true),
                                }));
                                updateSectionConfig(section.id, { platformToggles: newToggles });
                              }}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ── CUSTOM LINKS ── */}
                {section.type === "custom_links" && (() => {
                  const links = (cfg.links ?? []) as Array<{ id: string; label: string; url: string; thumbnail?: string; group?: string }>;
                  return (
                    <div className="space-y-3">
                      {links.length === 0 && (
                        <div className="text-center py-6">
                          <Link2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">No links added yet.</p>
                        </div>
                      )}
                      {links.map((link, linkIdx) => (
                        <div key={link.id} className="rounded-lg border border-border p-3 space-y-2">
                          <Input
                            value={link.label}
                            onChange={(e) => {
                              const updated = [...links];
                              updated[linkIdx] = { ...link, label: e.target.value };
                              updateSectionConfig(section.id, { links: updated });
                            }}
                            placeholder="Link Label"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={link.url}
                            onChange={(e) => {
                              const updated = [...links];
                              updated[linkIdx] = { ...link, url: e.target.value };
                              updateSectionConfig(section.id, { links: updated });
                            }}
                            placeholder="https://..."
                            className="h-8 text-xs"
                          />
                          <Input
                            value={link.thumbnail ?? ""}
                            onChange={(e) => {
                              const updated = [...links];
                              updated[linkIdx] = { ...link, thumbnail: e.target.value };
                              updateSectionConfig(section.id, { links: updated });
                            }}
                            placeholder="Thumbnail URL (optional)"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={link.group ?? ""}
                            onChange={(e) => {
                              const updated = [...links];
                              updated[linkIdx] = { ...link, group: e.target.value };
                              updateSectionConfig(section.id, { links: updated });
                            }}
                            placeholder="Group Name (optional)"
                            className="h-8 text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs flex-1"
                              onClick={() => { persistSections(sections); toast.success("Link saved!"); }}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                const updated = links.filter((_, i) => i !== linkIdx);
                                updateSectionConfig(section.id, { links: updated });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-full border-dashed text-xs h-8"
                        onClick={() => {
                          updateSectionConfig(section.id, {
                            links: [...links, { id: generateId(), label: "", url: "", thumbnail: "", group: "" }],
                          });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1.5" />Add Link
                      </Button>
                    </div>
                  );
                })()}

                {/* ── BOOK A MEETING ── */}
                {section.type === "book_meeting" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Calendly URL</label>
                      <Input
                        value={(cfg.calendlyUrl as string) ?? ""}
                        onChange={(e) => updateSectionConfig(section.id, { calendlyUrl: e.target.value })}
                        onBlur={() => persistSections(sections)}
                        placeholder="https://calendly.com/yourname"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Button Label</label>
                      <Input
                        value={(cfg.buttonLabel as string) ?? ""}
                        onChange={(e) => updateSectionConfig(section.id, { buttonLabel: e.target.value })}
                        onBlur={() => persistSections(sections)}
                        placeholder="Book a Meeting"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Textarea
                        value={(cfg.description as string) ?? ""}
                        onChange={(e) => updateSectionConfig(section.id, { description: e.target.value })}
                        onBlur={() => persistSections(sections)}
                        placeholder="Describe what the meeting is about..."
                        rows={3}
                        className="text-xs resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* ── PODCAST ── */}
                {section.type === "podcast" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">RSS Feed or Podcast URL</label>
                      <Input
                        value={(cfg.feedUrl as string) ?? ""}
                        onChange={(e) => updateSectionConfig(section.id, { feedUrl: e.target.value })}
                        onBlur={() => persistSections(sections)}
                        placeholder="https://feeds.example.com/podcast"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Display Title</label>
                      <Input
                        value={(cfg.displayTitle as string) ?? ""}
                        onChange={(e) => updateSectionConfig(section.id, { displayTitle: e.target.value })}
                        onBlur={() => persistSections(sections)}
                        placeholder="My Podcast"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ── GENERIC (all other section types) ── */}
                {!["social_links", "custom_links", "book_meeting", "podcast"].includes(section.type) && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <Input
                        value={(cfg.title as string) ?? ""}
                        onChange={(e) => updateSectionConfig(section.id, { title: e.target.value })}
                        onBlur={() => persistSections(sections)}
                        placeholder="Section title"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Textarea
                        value={(cfg.sectionDescription as string) ?? ""}
                        onChange={(e) => updateSectionConfig(section.id, { sectionDescription: e.target.value })}
                        onBlur={() => persistSections(sections)}
                        placeholder="Section description..."
                        rows={3}
                        className="text-xs resize-none"
                      />
                    </div>
                    {/* Type-specific extra fields */}
                    {section.type === "featured_video" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Video URL</label>
                        <Input
                          value={(cfg.videoUrl as string) ?? ""}
                          onChange={(e) => updateSectionConfig(section.id, { videoUrl: e.target.value })}
                          onBlur={() => persistSections(sections)}
                          placeholder="https://youtube.com/watch?v=..."
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {section.type === "streaming_channel" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Channel URL</label>
                        <Input
                          value={(cfg.channelUrl as string) ?? ""}
                          onChange={(e) => updateSectionConfig(section.id, { channelUrl: e.target.value })}
                          onBlur={() => persistSections(sections)}
                          placeholder="https://twitch.tv/yourchannel"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {section.type === "store" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Store URL</label>
                        <Input
                          value={(cfg.storeUrl as string) ?? ""}
                          onChange={(e) => updateSectionConfig(section.id, { storeUrl: e.target.value })}
                          onBlur={() => persistSections(sections)}
                          placeholder="https://your-store.com"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {section.type === "tips" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Tips / Donation URL</label>
                        <Input
                          value={(cfg.tipsUrl as string) ?? ""}
                          onChange={(e) => updateSectionConfig(section.id, { tipsUrl: e.target.value })}
                          onBlur={() => persistSections(sections)}
                          placeholder="https://buymeacoffee.com/you"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {section.type === "promo_codes" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Promo Code</label>
                        <Input
                          value={(cfg.promoCode as string) ?? ""}
                          onChange={(e) => updateSectionConfig(section.id, { promoCode: e.target.value })}
                          onBlur={() => persistSections(sections)}
                          placeholder="SAVE20"
                          className="h-8 text-xs"
                        />
                        <label className="text-xs font-medium text-muted-foreground">Promo URL</label>
                        <Input
                          value={(cfg.promoUrl as string) ?? ""}
                          onChange={(e) => updateSectionConfig(section.id, { promoUrl: e.target.value })}
                          onBlur={() => persistSections(sections)}
                          placeholder="https://store.com?code=SAVE20"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {section.type === "blog" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Blog URL</label>
                        <Input
                          value={(cfg.blogUrl as string) ?? ""}
                          onChange={(e) => updateSectionConfig(section.id, { blogUrl: e.target.value })}
                          onBlur={() => persistSections(sections)}
                          placeholder="https://yourblog.com"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border shrink-0">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => {
                    persistSections(sections);
                    toast.success("Changes saved!");
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </>
        );
      })()}

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
                    alreadyAdded ? "border-border/40 bg-muted/30 opacity-50 cursor-not-allowed" : "border-border hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">{getSectionIcon(entry)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{entry.label}</span>
                      {entry.comingSoon && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Coming Soon</Badge>}
                      {alreadyAdded && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Added</Badge>}
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
