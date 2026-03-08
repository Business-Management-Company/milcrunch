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
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
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
  Settings,
  Type,
  Contrast,
  Shapes,
  Paintbrush,
  Droplets,
  QrCode,
  X,
  Check,
} from "lucide-react";
import { getDominantColorFromFile } from "@/lib/dominant-color";
import { PlatformIcon } from "@/lib/platform-icons";
import type { BioSectionConfig, SectionType, SectionCatalogEntry, HeroImageFormat } from "@/types/bio-page";
import { SECTION_CATALOG, normalizeCustomLinks } from "@/types/bio-page";

/* ── Icon map for section catalog entries ── */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clapperboard, MonitorPlay, Share2, CalendarCheck, BookOpen,
  Ticket, ShoppingBag, HandCoins, Link, Mic, Mail, Type,
};

function getSectionIcon(entry: SectionCatalogEntry) {
  const Icon = ICON_MAP[entry.icon];
  return Icon ? <Icon className="h-5 w-5" /> : <Link2 className="h-5 w-5" />;
}

function generateId() {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ── Sidebar tab definitions ── */
type EditorTab = "profile" | "design" | "sections" | "share";
const SIDEBAR_TABS: { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "design", label: "Design", icon: Palette },
  { id: "sections", label: "Content", icon: Layers },
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
  bgImageUrl?: string;
  cardStyle: CardStyle;
  fontFamily: string;
  darkMode: boolean;
  shade: string;
  linkShape: string;
  linkStyle: string;
  linkColor: string;
  showBranding: boolean;
  showProfileImage: boolean;
  showHeroImage: boolean;
  showUsername: boolean;
  profileImageSize: "s" | "m" | "l";
  template?: string;
  showSocialIcons?: boolean;
  socialIconsOrder?: string[];
  socialIconsEnabled?: Record<string, boolean>;
}

/* ── Design sub-tab definitions ── */
type DesignSubTab = "color" | "shade" | "font" | "link-shape" | "link-style" | "link-color" | "background" | "branding";
const DESIGN_ITEMS: { id: DesignSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "color", label: "Color", icon: Palette },
  { id: "shade", label: "Shade", icon: Contrast },
  { id: "font", label: "Font", icon: Type },
  { id: "link-shape", label: "Shape", icon: Shapes },
  { id: "link-style", label: "Style", icon: Paintbrush },
  { id: "link-color", label: "Link", icon: Droplets },
  { id: "background", label: "BG", icon: ImagePlus },
  { id: "branding", label: "Brand", icon: QrCode },
];

/* ── Unified 14-color swatch set (used across all Design sub-tabs) ── */
const SWATCH_COLORS = [
  "#FFFFFF", "#D1D5DB", "#9CA3AF", "#6B7280", "#000000", "#991B1B", "#DC2626",
  "#EA580C", "#CA8A04", "#DB2777", "#7C3AED", "#1E3A8A", "#0D9488", "#16A34A",
];

/* ── Font options ── */
const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "IBM Plex Mono", label: "IBM Plex Mono" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
];

/* ── Link shape options ── */
const LINK_SHAPES = [
  { value: "pill", label: "Pill", radius: "9999px" },
  { value: "rounded", label: "Rounded", radius: "12px" },
  { value: "square", label: "Square", radius: "2px" },
  { value: "squircle", label: "Squircle", radius: "18px" },
];

/* ── Link style options ── */
const LINK_STYLES = [
  { value: "fill", label: "Fill" },
  { value: "outline", label: "Outline" },
  { value: "soft-shadow", label: "Soft Shadow" },
  { value: "hard-shadow", label: "Hard Shadow" },
];

/* ── Template definitions ── */
type TemplateId = "classic" | "bold" | "minimal" | "vibrant" | "portrait";

interface TemplateConfig {
  id: TemplateId;
  label: string;
  themeOverrides: Partial<ThemeSettings>;
  imageStyle: ImageStyle;
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: "classic", label: "Classic",
    themeOverrides: { bgMode: "solid", bgColor: "#FFFFFF", shade: "none", darkMode: false, cardStyle: "shadow", linkStyle: "soft-shadow", linkShape: "rounded", fontFamily: "Inter" },
    imageStyle: "circular",
  },
  {
    id: "bold", label: "Bold",
    themeOverrides: { bgMode: "solid", bgColor: "#0f1117", shade: "dark", darkMode: true, cardStyle: "square", linkStyle: "fill", linkShape: "rounded", fontFamily: "Inter" },
    imageStyle: "circular",
  },
  {
    id: "minimal", label: "Minimal",
    themeOverrides: { bgMode: "solid", bgColor: "#FAFAFA", shade: "minimal", darkMode: false, cardStyle: "square", linkStyle: "outline", linkShape: "square", fontFamily: "Merriweather" },
    imageStyle: "square",
  },
  {
    id: "vibrant", label: "Vibrant",
    themeOverrides: { bgMode: "solid", shade: "color", darkMode: false, cardStyle: "round", linkStyle: "fill", linkShape: "pill", fontFamily: "Poppins" },
    imageStyle: "circular",
  },
  {
    id: "portrait", label: "Portrait",
    themeOverrides: { bgMode: "solid", bgColor: "#000000", shade: "dark", darkMode: true, cardStyle: "glass", linkStyle: "soft-shadow", linkShape: "pill", fontFamily: "Inter" },
    imageStyle: "circular",
  },
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
  const [heroImageFormat, setHeroImageFormat] = useState<HeroImageFormat>("portrait");
  const [heroDominantColor, setHeroDominantColor] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  /* ── Background image upload ── */
  const [uploadingBgImage, setUploadingBgImage] = useState(false);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

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
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateId | null>(null);
  const [carouselCenterIdx, setCarouselCenterIdx] = useState(0);
  const [carouselBgColor, setCarouselBgColor] = useState<string | null>(null);
  const [carouselAccent, setCarouselAccent] = useState<string | null>(null);
  const [carouselFont, setCarouselFont] = useState<string | null>(null);
  const sectionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionIconInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const linkImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /* ── Design scroll-spy state ── */
  const [designSubTab, setDesignSubTab] = useState<DesignSubTab>("color");
  const designScrollRef = useRef<HTMLDivElement>(null);
  const designSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingRef = useRef(false);

  const scrollToDesignSection = (id: DesignSubTab) => {
    const el = designSectionRefs.current[id];
    if (!el) return;
    isScrollingRef.current = true;
    setDesignSubTab(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { isScrollingRef.current = false; }, 800);
  };

  /* ── Theme state ── */
  const [theme, setTheme] = useState<ThemeSettings>({
    themeColor: "#1B3A6B", bgMode: "solid", bgColor: "#ffffff",
    cardStyle: "round", fontFamily: "Inter", darkMode: false,
    shade: "none", linkShape: "pill", linkStyle: "fill",
    linkColor: "#1B3A6B", showBranding: true,
    showProfileImage: true, showHeroImage: true,
    showUsername: true, profileImageSize: "m",
    showSocialIcons: true, socialIconsOrder: [], socialIconsEnabled: {},
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
    const rawFmt = (meta.hero_image_format as string) ?? "portrait";
    setHeroImageFormat((rawFmt === "square" ? "portrait" : rawFmt) as HeroImageFormat);
    setHeroDominantColor((meta.hero_dominant_color as string) ?? null);
    const cl = meta.custom_links;
    const config = normalizeCustomLinks(cl);
    // Strip legacy social_links sections (now handled by Profile tab social icons)
    setSections((config.sections ?? []).filter((s) => s.type !== "social_links"));
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

  /* ── Design scroll-spy IntersectionObserver ── */
  useEffect(() => {
    if (activeTab !== "design") return;
    const container = designScrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-section") as DesignSubTab;
            if (id) setDesignSubTab(id);
          }
        }
      },
      { root: container, rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );
    DESIGN_ITEMS.forEach((item) => {
      const el = designSectionRefs.current[item.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [activeTab]);

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

  /* ── Background image upload ── */
  const uploadBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/bg-${Date.now()}.${ext}`;
    setUploadingBgImage(true);
    try {
      const { error: upErr } = await supabase.storage.from("bio-images").upload(path, file, { upsert: true });
      if (upErr) { toast.error(upErr.message); return; }
      const { data: urlData } = supabase.storage.from("bio-images").getPublicUrl(path);
      const url = urlData.publicUrl;
      const updated = { ...theme, bgImageUrl: url };
      setTheme(updated);
      persistTheme(updated);
      toast.success("Background image uploaded");
    } finally {
      setUploadingBgImage(false);
      e.target.value = "";
    }
  };

  /* ── Section icon upload ── */
  const uploadSectionIcon = async (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/section-icon-${sectionId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("bio-images").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); e.target.value = ""; return; }
    const { data: urlData } = supabase.storage.from("bio-images").getPublicUrl(path);
    updateSectionConfig(sectionId, { iconUrl: urlData.publicUrl });
    toast.success("Section icon uploaded");
    e.target.value = "";
  };

  /* ── Link image upload ── */
  const uploadLinkImage = async (sectionId: string, linkId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/link-${linkId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("bio-images").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); e.target.value = ""; return; }
    const { data: urlData } = supabase.storage.from("bio-images").getPublicUrl(path);
    setSections((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== sectionId) return s;
        const cfg = (s.config ?? {}) as Record<string, any>;
        const links = ((cfg.links ?? []) as any[]).map((l: any) =>
          l.id === linkId ? { ...l, imageUrl: urlData.publicUrl } : l
        );
        return { ...s, config: { ...cfg, links } };
      });
      if (sectionSaveTimerRef.current) clearTimeout(sectionSaveTimerRef.current);
      sectionSaveTimerRef.current = setTimeout(() => persistSections(updated), 1000);
      return updated;
    });
    toast.success("Image uploaded");
    e.target.value = "";
  };

  const addSection = (entry: SectionCatalogEntry) => {
    const newId = generateId();
    const isST = entry.type === "section_title";
    const newSection: BioSectionConfig = {
      id: newId,
      type: entry.type,
      label: isST ? "New Section" : entry.label,
      visible: true,
      order: sections.length + 1,
      ...((!isST && targetGroupId) ? { groupId: targetGroupId } : {}),
    };
    const updated = [...sections, newSection];
    setSections(updated);
    persistSections(updated);
    setModalOpen(false);
    toast.success(`Added ${isST ? "Section Title" : entry.label}`);
    if (isST) {
      setTimeout(() => setRenamingId(newId), 100);
    }
  };

  const removeSection = (id: string) => {
    const removed = sections.find((s) => s.id === id);
    let updated = sections.filter((s) => s.id !== id);
    // Ungroup children when deleting a section_title
    if (removed?.type === "section_title") {
      updated = updated.map((s) => s.groupId === id ? { ...s, groupId: undefined } : s);
    }
    updated = updated.map((s, i) => ({ ...s, order: i + 1 }));
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

  const toggleGroupCollapse = (sectionTitleId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sectionTitleId)) next.delete(sectionTitleId);
      else next.add(sectionTitleId);
      return next;
    });
  };

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

  /* ── Phone frame width per device (scaled 85% from original 380px) ── */
  const deviceWidth: Record<PreviewDevice, string> = {
    phone: "w-[323px]",
    tablet: "w-[408px]",
    desktop: "w-[476px]",
  };

  /* ── Preview avatar shape from imageStyle ── */
  const avatarRadius = imageStyle === "circular" ? "9999px" : imageStyle === "square" ? "0.5rem" : "0.5rem";
  const avatarAspect = imageStyle === "portrait" ? "aspect-[3/4]" : "aspect-square";

  /* ── Compute phone preview styles from theme ── */
  const isDark = theme.darkMode || theme.shade === "dark";
  const phoneText = isDark ? "#ffffff" : "#111827";
  const phoneSubtext = isDark ? "#9ca3af" : "#6b7280";

  /* Screen background — varies by bgMode; shade and dark mode modify the result */
  const phoneScreenBg: React.CSSProperties = (() => {
    if (isDark) return { backgroundColor: "#0f1117" };
    let base: React.CSSProperties;
    if (theme.bgMode === "gradient") {
      base = { background: `linear-gradient(180deg, ${theme.themeColor}33 0%, ${theme.bgColor} 100%)` };
    } else if (theme.bgMode === "image" && theme.bgImageUrl) {
      base = { backgroundImage: `url(${theme.bgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
    } else {
      base = { backgroundColor: theme.bgColor };
    }
    // Apply shade overlays
    if (theme.shade === "minimal") {
      // Subtle white overlay — lighten bg slightly
      base = { ...base, backgroundBlendMode: "lighten" as any };
      if (base.backgroundColor) {
        base.backgroundImage = `linear-gradient(rgba(255,255,255,0.10), rgba(255,255,255,0.10))`;
        base.backgroundBlendMode = undefined;
        base.background = `linear-gradient(rgba(255,255,255,0.10), rgba(255,255,255,0.10)), ${base.backgroundColor}`;
        delete base.backgroundColor;
      }
    } else if (theme.shade === "light") {
      // Force light/white background
      base = { backgroundColor: "#ffffff" };
    }
    return base;
  })();

  /* Link rendering helpers */
  const linkRadius = LINK_SHAPES.find((s) => s.value === theme.linkShape)?.radius ?? "9999px";
  const linkColor = theme.linkColor || theme.themeColor;
  const getLinkItemStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { borderRadius: linkRadius };
    switch (theme.linkStyle) {
      case "outline":
        return { ...base, border: `2px solid ${linkColor}`, color: linkColor, backgroundColor: "transparent" };
      case "soft-shadow":
        return { ...base, backgroundColor: isDark ? "#1e2433" : "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", color: linkColor };
      case "hard-shadow":
        return { ...base, backgroundColor: isDark ? "#1e2433" : "#ffffff", boxShadow: `4px 4px 0px ${linkColor}`, border: `1px solid ${linkColor}`, color: isDark ? "#ffffff" : "#111827" };
      default: // fill
        return { ...base, backgroundColor: linkColor, color: "#ffffff" };
    }
  };

  /* ── Apply a template preset ── */
  const applyTemplate = async (tplId: TemplateId) => {
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const updated: ThemeSettings = { ...theme, ...tpl.themeOverrides, template: tpl.id };
    if (tpl.id === "vibrant") updated.bgColor = theme.themeColor;
    if (tpl.id === "portrait" && heroImageUrl) updated.bgImageUrl = heroImageUrl;
    // Set all state immediately so phone mockup re-renders
    setTheme(updated);
    setImageStyle(tpl.imageStyle);
    // Save to Supabase immediately (not debounced)
    if (user?.id) {
      const meta = user.user_metadata ?? {};
      const cl = typeof meta.custom_links === "object" && meta.custom_links
        ? (meta.custom_links as Record<string, unknown>) : {};
      await supabase.auth.updateUser({
        data: {
          image_style: tpl.imageStyle,
          custom_links: { ...cl, themeSettings: updated },
        },
      });
    }
    toast.success(`Applied "${tpl.label}" template`);
  };

  /* ────────────────────────────────────────────────────────────────── */
  return (
    <CreatorLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] -mt-2">
        {/* ── TOP BAR ── */}
        <div className="shrink-0 border-b border-border bg-card rounded-t-xl">
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <h1 className="text-lg font-semibold text-foreground">My Page Builder</h1>
            <div className="flex items-center gap-2 shrink-0">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Button
                size="sm"
                className="bg-[#1B3A6B] hover:bg-[#152e55] text-white"
                onClick={() => { persistSections(sections); toast.success("Published!"); }}
              >
                Publish
              </Button>
            </div>
          </div>
          {/* ── Tab pills (shared on all breakpoints) ── */}
          <div className="flex items-center gap-1 px-5 pb-3 overflow-x-auto">
            {SIDEBAR_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-full px-5 py-3 font-medium transition-all whitespace-nowrap ${
                    active ? "text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  style={{ fontSize: "15px", ...(active ? { backgroundColor: "#1B3A6B" } : {}) }}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex flex-1 min-h-0 bg-muted/30 rounded-b-xl overflow-hidden">
          {/* ── CONTENT PANEL ── */}
          <div className={`flex-1 md:max-w-[420px] overflow-y-auto border-r border-border bg-card ${activeTab === "design" ? "" : "p-5"}`}>

            {/* ── PROFILE TAB (inline editor) ── */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                <h2 className="text-sm font-semibold text-foreground">Profile</h2>

                {/* 0. Template Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Choose a Template</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="rounded-full text-xs h-9 gap-1.5"
                      onClick={() => { setPendingTemplate(theme.template as TemplateId ?? null); setTemplateModalOpen(true); }}
                    >
                      <Palette className="h-3.5 w-3.5" />
                      Browse Templates
                    </Button>
                    {theme.template && (
                      <span className="text-[11px] text-muted-foreground">
                        Current: <span className="font-medium text-foreground capitalize">{theme.template}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Profile Image Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Profile Image</label>
                    <Switch
                      checked={theme.showProfileImage}
                      onCheckedChange={(v) => {
                        const updated = { ...theme, showProfileImage: v };
                        setTheme(updated);
                        persistTheme(updated);
                      }}
                      className="scale-75 origin-right data-[state=checked]:bg-[#1B3A6B]"
                    />
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={uploadAvatar}
                    className="hidden"
                  />
                  <button
                    onClick={() => theme.showProfileImage && avatarInputRef.current?.click()}
                    className={`w-full rounded-lg border-2 border-dashed transition-colors p-4 flex flex-col items-center gap-2 ${
                      theme.showProfileImage ? "border-border hover:border-[#1B3A6B]" : "border-border/50 opacity-50 cursor-not-allowed"
                    }`}
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

                {/* 2. Layout Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Layout Mode</label>
                  <p className="text-[10px] text-muted-foreground/80">Controls how your profile and hero images display on your bio page.</p>
                  <div className="flex gap-1 rounded-full border border-border p-0.5">
                    {(["portrait", "landscape", "full_blend"] as HeroImageFormat[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setHeroImageFormat(mode);
                          if (mode === "portrait") {
                            setImageStyle("circular");
                            debouncedProfileSave({ hero_image_format: mode, image_style: "circular" });
                          } else {
                            debouncedProfileSave({ hero_image_format: mode });
                          }
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          heroImageFormat === mode
                            ? "bg-[#1B3A6B] text-white"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode === "full_blend" ? "Full Blend" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2b. Profile Image Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Profile Image Size</label>
                  <div className="flex gap-1 rounded-full border border-border p-0.5">
                    {(["s", "m", "l"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => {
                          const updated = { ...theme, profileImageSize: sz };
                          setTheme(updated);
                          persistTheme(updated);
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors uppercase ${
                          theme.profileImageSize === sz
                            ? "bg-[#1B3A6B] text-white"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Hero / Cover Image Upload (Portrait mode only) */}
                {heroImageFormat === "portrait" ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Hero / Cover Image</label>
                      <Switch
                        checked={theme.showHeroImage}
                        onCheckedChange={(v) => {
                          const updated = { ...theme, showHeroImage: v };
                          setTheme(updated);
                          persistTheme(updated);
                        }}
                        className="scale-75 origin-right data-[state=checked]:bg-[#1B3A6B]"
                      />
                    </div>
                    <input
                      ref={heroInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={uploadHero}
                      className="hidden"
                    />
                    <button
                      onClick={() => theme.showHeroImage && heroInputRef.current?.click()}
                      className={`w-full rounded-lg border-2 border-dashed transition-colors p-4 flex flex-col items-center gap-2 ${
                        theme.showHeroImage ? "border-border hover:border-[#1B3A6B]" : "border-border/50 opacity-50 cursor-not-allowed"
                      }`}
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
                      <button
                        className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline transition-colors mt-1"
                        onClick={() => {
                          setHeroImageUrl(null);
                          setHeroDominantColor(null);
                          debouncedProfileSave({ hero_image_url: null, hero_dominant_color: null });
                        }}
                      >
                        Remove hero image
                      </button>
                    )}
                    {heroDominantColor && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm border border-border" style={{ backgroundColor: heroDominantColor }} />
                        <span className="text-[10px] text-muted-foreground">Extracted accent: {heroDominantColor}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Hero / Cover Image</label>
                    <p className="text-[10px] text-muted-foreground/80 italic">Hero image not used in this layout.</p>
                  </div>
                )}

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

                {/* 5b. Show Username toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Show Username</label>
                  <Switch
                    checked={theme.showUsername}
                    onCheckedChange={(v) => {
                      const updated = { ...theme, showUsername: v };
                      setTheme(updated);
                      persistTheme(updated);
                    }}
                    className="scale-75 origin-right data-[state=checked]:bg-[#1B3A6B]"
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

                {/* Social Icons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Social Icons</label>
                    <Switch
                      checked={theme.showSocialIcons ?? true}
                      onCheckedChange={(v) => {
                        const updated = { ...theme, showSocialIcons: v };
                        setTheme(updated);
                        persistTheme(updated);
                      }}
                      className="scale-75 origin-right data-[state=checked]:bg-[#1B3A6B]"
                    />
                  </div>
                  {(theme.showSocialIcons ?? true) && socialAccounts.length > 0 && (
                    <div className="space-y-1.5">
                      {(() => {
                        const order = theme.socialIconsOrder ?? [];
                        const enabled = theme.socialIconsEnabled ?? {};
                        // Show accounts in saved order, appending any new ones
                        const sorted = [...socialAccounts].sort((a, b) => {
                          const ai = order.indexOf(a.platform);
                          const bi = order.indexOf(b.platform);
                          if (ai === -1 && bi === -1) return 0;
                          if (ai === -1) return 1;
                          if (bi === -1) return -1;
                          return ai - bi;
                        });
                        return sorted.map((acc, idx) => {
                          const isEnabled = enabled[acc.platform] ?? true;
                          return (
                            <div key={acc.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const curOrder = sorted.map((a) => a.platform);
                                    [curOrder[idx - 1], curOrder[idx]] = [curOrder[idx], curOrder[idx - 1]];
                                    const updated = { ...theme, socialIconsOrder: curOrder };
                                    setTheme(updated);
                                    persistTheme(updated);
                                  }}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  disabled={idx === sorted.length - 1}
                                  onClick={() => {
                                    const curOrder = sorted.map((a) => a.platform);
                                    [curOrder[idx], curOrder[idx + 1]] = [curOrder[idx + 1], curOrder[idx]];
                                    const updated = { ...theme, socialIconsOrder: curOrder };
                                    setTheme(updated);
                                    persistTheme(updated);
                                  }}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                              <PlatformIcon platform={acc.platform} size={18} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate capitalize">{acc.platform}</p>
                                {acc.platform_username && (
                                  <p className="text-[11px] text-muted-foreground truncate">@{acc.platform_username}</p>
                                )}
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(v) => {
                                  const updated = {
                                    ...theme,
                                    socialIconsEnabled: { ...(theme.socialIconsEnabled ?? {}), [acc.platform]: v },
                                  };
                                  setTheme(updated);
                                  persistTheme(updated);
                                }}
                                className="scale-75 origin-right data-[state=checked]:bg-[#1B3A6B]"
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                  {(theme.showSocialIcons ?? true) && socialAccounts.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center">
                      <p className="text-xs text-muted-foreground">No accounts connected yet</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={() => navigate("/creator/socials")}
                  >
                    {socialAccounts.length > 0 ? "Manage Connections" : "Connect Accounts"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── DESIGN TAB (left nav + single-scroll right panel) ── */}
            {activeTab === "design" && (
              <div className="flex h-full">
                {/* Left icon nav — scroll spy highlights active section */}
                <div className="w-[76px] shrink-0 border-r border-border bg-muted/30 py-2 flex flex-col items-center gap-0.5 overflow-y-auto">
                  {DESIGN_ITEMS.map((item) => {
                    const active = designSubTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => scrollToDesignSection(item.id)}
                        className={`flex flex-col items-center justify-center gap-1 w-[68px] h-[72px] rounded-xl transition-colors ${
                          active
                            ? "text-[#1B3A6B] dark:text-[#1B3A6B]"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className={`h-[28px] w-[28px] rounded-full flex items-center justify-center transition-colors ${active ? "bg-[#1B3A6B]/15 dark:bg-[#1B3A6B]/20" : ""}`}>
                          <Icon className="h-[14px] w-[14px]" />
                        </div>
                        <span className="text-[11px] font-medium leading-none">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right content — all sections stacked, single scroll */}
                <div ref={designScrollRef} className="flex-1 overflow-y-auto">

                  {/* ── COLOR ── */}
                  <div data-section="color" ref={(el) => { designSectionRefs.current["color"] = el; }} className="p-4 pb-2">
                    <h3 className="text-sm font-bold text-foreground mb-1">Theme Color</h3>
                    <p className="text-xs text-muted-foreground mb-3">Accent for headings, badges, and buttons.</p>
                    <div className="grid grid-cols-7 gap-2 mb-3">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => { updateTheme({ themeColor: c }); persistTheme({ ...theme, themeColor: c }); }}
                          className={`h-9 w-9 rounded-full border-2 transition-all mx-auto ${
                            theme.themeColor.toLowerCase() === c.toLowerCase()
                              ? "border-foreground ring-2 ring-foreground/20 scale-110"
                              : `${c.toUpperCase() === "#FFFFFF" ? "border-gray-300" : "border-transparent"} hover:scale-105`
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full border border-border shrink-0" style={{ backgroundColor: theme.themeColor }} />
                      <Input
                        value={theme.themeColor}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateTheme({ themeColor: v });
                          if (/^#[0-9a-fA-F]{6}$/.test(v)) persistTheme({ ...theme, themeColor: v });
                        }}
                        className="h-8 text-xs font-mono uppercase flex-1"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="mx-4 border-b border-border" />

                  {/* ── SHADE ── */}
                  <div data-section="shade" ref={(el) => { designSectionRefs.current["shade"] = el; }} className="p-4 pb-2">
                    <h3 className="text-sm font-bold text-foreground mb-1">Shade</h3>
                    <p className="text-xs text-muted-foreground mb-3">Overall page brightness tone.</p>
                    <div className="space-y-2">
                      {([
                        { value: "none", label: "None", bg: "#ffffff", text: "#111827" },
                        { value: "minimal", label: "Minimal", bg: "#f9fafb", text: "#111827" },
                        { value: "light", label: "Light", bg: "#f3f4f6", text: "#111827" },
                        { value: "color", label: "Color Tint", bg: `${theme.themeColor}15`, text: "#111827" },
                        { value: "dark", label: "Dark", bg: "#0f1117", text: "#ffffff" },
                      ] as const).map((s) => (
                        <button
                          key={s.value}
                          onClick={() => {
                            const updated = { ...theme, shade: s.value, darkMode: s.value === "dark" };
                            setTheme(updated);
                            persistTheme(updated);
                          }}
                          className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                            theme.shade === s.value
                              ? "border-[#1B3A6B] ring-2 ring-[#1B3A6B]/20"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <div
                            className="h-10 w-16 rounded-lg border border-border/50 shrink-0"
                            style={{ backgroundColor: s.bg }}
                          >
                            <div className="flex flex-col items-center justify-center h-full gap-0.5">
                              <div className="w-6 h-1 rounded-full" style={{ backgroundColor: s.text, opacity: 0.7 }} />
                              <div className="w-4 h-1 rounded-full" style={{ backgroundColor: s.text, opacity: 0.4 }} />
                            </div>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-medium text-foreground">{s.label}</p>
                          </div>
                          {theme.shade === s.value && (
                            <div className="h-5 w-5 rounded-full bg-[#1B3A6B] flex items-center justify-center shrink-0">
                              <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mx-4 border-b border-border" />

                  {/* ── FONT ── */}
                  <div data-section="font" ref={(el) => { designSectionRefs.current["font"] = el; }} className="p-4 pb-2">
                    <h3 className="text-sm font-bold text-foreground mb-1">Font</h3>
                    <p className="text-xs text-muted-foreground mb-3">Choose a typeface for your page.</p>
                    <div className="space-y-1.5">
                      {FONT_OPTIONS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => { updateTheme({ fontFamily: f.value }); persistTheme({ ...theme, fontFamily: f.value }); }}
                          className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ${
                            theme.fontFamily === f.value
                              ? "border-[#1B3A6B] ring-2 ring-[#1B3A6B]/20 bg-[#1B3A6B]/5 dark:bg-[#1B3A6B]/10"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <span className="text-sm" style={{ fontFamily: f.value }}>{f.label}</span>
                          <span className="text-lg font-semibold" style={{ fontFamily: f.value }}>Aa</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mx-4 border-b border-border" />

                  {/* ── LINK SHAPE ── */}
                  <div data-section="link-shape" ref={(el) => { designSectionRefs.current["link-shape"] = el; }} className="p-4 pb-2">
                    <h3 className="text-sm font-bold text-foreground mb-1">Link Shape</h3>
                    <p className="text-xs text-muted-foreground mb-3">Corner style for your link buttons.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {LINK_SHAPES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => { updateTheme({ linkShape: s.value }); persistTheme({ ...theme, linkShape: s.value }); }}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                            theme.linkShape === s.value
                              ? "border-[#1B3A6B] ring-2 ring-[#1B3A6B]/20"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <div
                            className="w-full h-8 bg-muted-foreground/20"
                            style={{ borderRadius: s.radius }}
                          />
                          <span className="text-[11px] font-medium text-foreground">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mx-4 border-b border-border" />

                  {/* ── LINK STYLE ── */}
                  <div data-section="link-style" ref={(el) => { designSectionRefs.current["link-style"] = el; }} className="p-4 pb-2">
                    <h3 className="text-sm font-bold text-foreground mb-1">Link Style</h3>
                    <p className="text-xs text-muted-foreground mb-3">How your link buttons are styled.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {LINK_STYLES.map((s) => {
                        const previewStyle: React.CSSProperties = { borderRadius: linkRadius };
                        if (s.value === "fill") Object.assign(previewStyle, { backgroundColor: linkColor, color: "#fff" });
                        else if (s.value === "outline") Object.assign(previewStyle, { border: `2px solid ${linkColor}`, color: linkColor, backgroundColor: "transparent" });
                        else if (s.value === "soft-shadow") Object.assign(previewStyle, { backgroundColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", color: linkColor });
                        else Object.assign(previewStyle, { backgroundColor: "#fff", boxShadow: `4px 4px 0px ${linkColor}`, border: `1px solid ${linkColor}`, color: "#111827" });
                        return (
                          <button
                            key={s.value}
                            onClick={() => { updateTheme({ linkStyle: s.value }); persistTheme({ ...theme, linkStyle: s.value }); }}
                            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                              theme.linkStyle === s.value
                                ? "border-[#1B3A6B] ring-2 ring-[#1B3A6B]/20"
                                : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="w-full h-8 flex items-center justify-center text-[10px] font-medium" style={previewStyle}>
                              Sample
                            </div>
                            <span className="text-[11px] font-medium text-foreground">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mx-4 border-b border-border" />

                  {/* ── LINK COLOR ── */}
                  <div data-section="link-color" ref={(el) => { designSectionRefs.current["link-color"] = el; }} className="p-4 pb-2">
                    <h3 className="text-sm font-bold text-foreground mb-1">Link Color</h3>
                    <p className="text-xs text-muted-foreground mb-3">Color for your link buttons.</p>
                    <div className="grid grid-cols-7 gap-2 mb-3">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => { updateTheme({ linkColor: c }); persistTheme({ ...theme, linkColor: c }); }}
                          className={`h-9 w-9 rounded-full border-2 transition-all mx-auto ${
                            theme.linkColor.toLowerCase() === c.toLowerCase()
                              ? "border-foreground ring-2 ring-foreground/20 scale-110"
                              : `${c.toUpperCase() === "#FFFFFF" ? "border-gray-300" : "border-transparent"} hover:scale-105`
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full border border-border shrink-0" style={{ backgroundColor: theme.linkColor }} />
                      <Input
                        value={theme.linkColor}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateTheme({ linkColor: v });
                          if (/^#[0-9a-fA-F]{6}$/.test(v)) persistTheme({ ...theme, linkColor: v });
                        }}
                        className="h-8 text-xs font-mono uppercase flex-1"
                        maxLength={7}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => { updateTheme({ linkColor: theme.themeColor }); persistTheme({ ...theme, linkColor: theme.themeColor }); }}
                    >
                      Reset to theme color
                    </Button>
                  </div>
                  <div className="mx-4 border-b border-border" />

                  {/* ── BACKGROUND ── */}
                  <div data-section="background" ref={(el) => { designSectionRefs.current["background"] = el; }} className="p-4 pb-2">
                    <h3 className="text-sm font-bold text-foreground mb-1">Background</h3>
                    <p className="text-xs text-muted-foreground mb-3">Set your page background style.</p>
                    <div className="flex gap-1 rounded-full border border-border p-0.5 mb-3">
                      {(["solid", "gradient", "image"] as BgMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { updateTheme({ bgMode: mode }); persistTheme({ ...theme, bgMode: mode }); }}
                          className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                            theme.bgMode === mode ? "bg-[#1B3A6B] text-white" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    {/* Solid — unified color swatches + hex */}
                    {theme.bgMode === "solid" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-7 gap-2">
                          {SWATCH_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => { updateTheme({ bgColor: c }); persistTheme({ ...theme, bgColor: c }); }}
                              className={`h-9 w-9 rounded-full border-2 transition-all mx-auto ${
                                theme.bgColor.toLowerCase() === c.toLowerCase()
                                  ? "border-foreground ring-2 ring-foreground/20 scale-110"
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full border border-border shrink-0" style={{ backgroundColor: theme.bgColor }} />
                          <Input
                            value={theme.bgColor}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateTheme({ bgColor: v });
                              if (/^#[0-9a-fA-F]{6}$/.test(v)) persistTheme({ ...theme, bgColor: v });
                            }}
                            className="h-8 text-xs font-mono uppercase flex-1"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    )}
                    {/* Gradient — live preview + bottom color */}
                    {theme.bgMode === "gradient" && (
                      <div className="space-y-3">
                        <div className="h-16 w-full rounded-xl border border-border" style={{ background: `linear-gradient(180deg, ${theme.themeColor}33 0%, ${theme.bgColor} 100%)` }} />
                        <p className="text-[11px] text-muted-foreground">Top: theme color &rarr; Bottom:</p>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full border border-border shrink-0" style={{ backgroundColor: theme.bgColor }} />
                          <Input
                            value={theme.bgColor}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateTheme({ bgColor: v });
                              if (/^#[0-9a-fA-F]{6}$/.test(v)) persistTheme({ ...theme, bgColor: v });
                            }}
                            className="h-8 text-xs font-mono uppercase flex-1"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    )}
                    {/* Image — file upload */}
                    {theme.bgMode === "image" && (
                      <div className="space-y-3">
                        <input
                          ref={bgImageInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={uploadBgImage}
                          className="hidden"
                        />
                        <button
                          onClick={() => bgImageInputRef.current?.click()}
                          className="w-full rounded-xl border-2 border-dashed border-border hover:border-[#1B3A6B] transition-colors p-4 flex flex-col items-center gap-2"
                        >
                          {theme.bgImageUrl ? (
                            <img src={theme.bgImageUrl} alt="Background" className="w-full h-20 object-cover rounded-lg" />
                          ) : uploadingBgImage ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          ) : (
                            <ImagePlus className="h-8 w-8 text-muted-foreground" />
                          )}
                          <span className="text-xs font-medium text-muted-foreground">
                            {theme.bgImageUrl ? "Change image" : "Upload image"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">PNG, JPG up to 10MB</span>
                        </button>
                        {theme.bgImageUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              const updated = { ...theme, bgImageUrl: undefined };
                              setTheme(updated);
                              persistTheme(updated);
                            }}
                          >
                            Remove image
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mx-4 border-b border-border" />

                  {/* ── BRANDING ── */}
                  <div data-section="branding" ref={(el) => { designSectionRefs.current["branding"] = el; }} className="p-4 pb-6">
                    <h3 className="text-sm font-bold text-foreground mb-1">Branding</h3>
                    <p className="text-xs text-muted-foreground mb-3">Control visible branding on your page.</p>
                    <div className="flex items-center justify-between rounded-xl border border-border p-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground">Show "Powered by MilCrunch"</p>
                        <p className="text-[11px] text-muted-foreground">Footer badge on your public page</p>
                      </div>
                      <Switch
                        checked={theme.showBranding}
                        onCheckedChange={(v) => { updateTheme({ showBranding: v }); persistTheme({ ...theme, showBranding: v }); }}
                      />
                    </div>
                    {theme.showBranding && (
                      <div className="rounded-xl border border-border p-3 mt-3 flex items-center justify-center">
                        <p className="text-[11px] text-muted-foreground">Powered by <span className="font-semibold text-foreground">MilCrunch</span></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTIONS TAB ── */}
            {activeTab === "sections" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Page Content</h2>
                  <span className="text-[11px] text-muted-foreground">
                    {sections.length} item{sections.length === 1 ? "" : "s"}
                  </span>
                </div>
                {sections.map((section, idx) => {
                  const entry = catalogEntryFor(section.type);
                  if (!entry) return null;

                  const isSectionTitle = section.type === "section_title";
                  const isGrouped = !!section.groupId && !isSectionTitle;

                  // Hide grouped items when parent is collapsed
                  if (section.groupId && collapsedGroups.has(section.groupId)) return null;

                  // ── SECTION TITLE ROW ──
                  if (isSectionTitle) {
                    const groupChildCount = sections.filter((s) => s.groupId === section.id).length;
                    const isCollapsed = collapsedGroups.has(section.id);
                    const isRenaming = renamingId === section.id;
                    const titleText = ((section.config as Record<string, unknown>)?.title as string) || section.label;
                    return (
                      <div
                        key={section.id}
                        className="flex items-center gap-2 rounded-lg p-2.5 transition-colors bg-[#F0F4FF] border border-[#1B3A6B]/15"
                      >
                        <GripVertical className="h-3.5 w-3.5 text-[#1B3A6B]/40 shrink-0 cursor-grab" />
                        <button
                          onClick={() => toggleGroupCollapse(section.id)}
                          className="h-5 w-5 flex items-center justify-center shrink-0 text-[#1B3A6B]/60 hover:text-[#1B3A6B]"
                        >
                          {isCollapsed
                            ? <ChevronRightIcon className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        <div className="flex items-center justify-center h-6 w-6 rounded bg-[#1B3A6B]/15 text-[#1B3A6B] shrink-0">
                          <Type className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <Input
                              autoFocus
                              defaultValue={titleText}
                              className="h-7 text-xs font-semibold text-[#1B3A6B] bg-white"
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => {
                                const val = e.target.value.trim() || "New Section";
                                const updated = sections.map((s) =>
                                  s.id === section.id
                                    ? { ...s, label: val, config: { ...(s.config ?? {}), title: val } }
                                    : s
                                );
                                setSections(updated);
                                persistSections(updated);
                                setRenamingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                            />
                          ) : (
                            <span className="font-semibold text-xs text-[#1B3A6B] truncate block">
                              {titleText}
                              {groupChildCount > 0 && (
                                <span className="font-normal text-[10px] text-[#1B3A6B]/50 ml-1.5">
                                  ({groupChildCount} item{groupChildCount !== 1 ? "s" : ""})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveSection(section.id, "up")}>
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === sections.length - 1} onClick={() => moveSection(section.id, "down")}>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#1B3A6B]" onClick={() => setRenamingId(section.id)} title="Rename">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeSection(section.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  // ── REGULAR CONTENT ROW (grouped or ungrouped) ──
                  return (
                    <div
                      key={section.id}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                        section.visible ? "bg-card border-border" : "bg-muted/50 border-border/50 opacity-60"
                      } ${isGrouped ? "ml-5 border-l-[3px] border-l-[#1B3A6B]" : ""}`}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 cursor-grab" />
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#1B3A6B]/10 text-[#1B3A6B] shrink-0">
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
                <Button
                  variant="outline"
                  className="w-full border-dashed text-xs h-9"
                  onClick={() => {
                    const lastST = [...sections].reverse().find(s => s.type === "section_title");
                    setTargetGroupId(lastST?.id ?? null);
                    setModalOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Content
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
                  <Button className="w-full bg-[#1B3A6B] hover:bg-[#152e55] text-white h-9 text-xs" onClick={copyUrl}>
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
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#1B3A6B]/10 text-[#1B3A6B] shrink-0"><CreditCard className="h-4 w-4" /></div>
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
            <div className="flex items-center justify-center w-full max-w-[600px] mb-4">
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
                      previewDevice === id ? "bg-[#1B3A6B] text-white" : "text-gray-500 hover:text-foreground"
                    }`}
                  >
                    <DIcon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Device frame — rendered via IIFE for proper nesting */}
            {(() => {
              /* Shared bio page content rendered inside whichever frame */
              const bioContent = (
                <>
                  {/* Hero + Avatar composite header */}
                  {(() => {
                    const heroVisible = !!(heroImageUrl && theme.showHeroImage);
                    const avatarVisible = theme.showProfileImage;
                    const avSize = theme.profileImageSize === "s" ? 48 : theme.profileImageSize === "l" ? 96 : 72;
                    const headerHeight = heroVisible
                      ? (avatarVisible ? 160 + avSize / 2 + 10 : 168)
                      : (avatarVisible ? avSize + 40 : 40);
                    return (
                      <div className="relative w-full" style={{ height: headerHeight }}>
                        {heroVisible && (
                          <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: 160 }}>
                            <img src={heroImageUrl!} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {avatarVisible && (
                          <div className="absolute left-1/2 -translate-x-1/2 z-[2]" style={{ top: heroVisible ? 160 - avSize / 2 : 28 }}>
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="rounded-full object-cover shadow-md" style={{ width: avSize, height: avSize, border: "3px solid #ffffff" }} />
                            ) : (
                              <div className="rounded-full flex items-center justify-center font-semibold shadow-md" style={{ width: avSize, height: avSize, fontSize: avSize * 0.3, backgroundColor: isDark ? "#2d3548" : "#e5e7eb", color: phoneSubtext, border: "3px solid #ffffff" }}>
                                {(displayName || "?")[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Name / Username / Bio */}
                  <div className="px-4 pb-2.5 flex flex-col items-center">
                    <h3 className="font-bold leading-tight" style={{ fontSize: "15px", color: phoneText, fontFamily: theme.fontFamily }}>{displayName || "Your Name"}</h3>
                    {theme.showUsername && (
                      <p className="mt-0.5" style={{ fontSize: "11px", color: phoneSubtext }}>@{handle || "username"}</p>
                    )}
                    {profileBio && (
                      <p className="text-[11px] mt-1.5 text-center max-w-[240px] leading-relaxed line-clamp-3" style={{ color: phoneSubtext }}>{profileBio}</p>
                    )}

                    {/* Social Icons row */}
                    {(theme.showSocialIcons ?? true) && socialAccounts.length > 0 && (() => {
                      const iconSize = theme.profileImageSize === "s" ? 20 : theme.profileImageSize === "l" ? 28 : 24;
                      const order = theme.socialIconsOrder ?? [];
                      const enabled = theme.socialIconsEnabled ?? {};
                      const filtered = socialAccounts
                        .filter((acc) => enabled[acc.platform] ?? true)
                        .sort((a, b) => {
                          const ai = order.indexOf(a.platform);
                          const bi = order.indexOf(b.platform);
                          if (ai === -1 && bi === -1) return 0;
                          if (ai === -1) return 1;
                          if (bi === -1) return -1;
                          return ai - bi;
                        });
                      if (filtered.length === 0) return null;
                      return (
                        <div className="flex items-center justify-center gap-2 mt-2.5">
                          {filtered.map((acc) => (
                            <PlatformIcon key={acc.id} platform={acc.platform} size={iconSize} />
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sections */}
                  <div className="px-3 pb-8 space-y-2.5">
                    {visibleSections.length === 0 ? (
                      <div className="py-12 text-center">
                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: phoneSubtext }} />
                        <p className="text-sm" style={{ color: phoneSubtext }}>No sections yet</p>
                        <p className="text-[11px] mt-0.5 opacity-60" style={{ color: phoneSubtext }}>Add content from the Content tab</p>
                      </div>
                    ) : (
                      visibleSections.map((section) => {
                        const entry = catalogEntryFor(section.type);
                        if (!entry) return null;
                        const cfg = (section.config ?? {}) as Record<string, any>;
                        const cardBg = theme.cardStyle === "glass" ? (isDark ? "rgba(30,36,51,0.6)" : "rgba(255,255,255,0.7)") : isDark ? "#1e2433" : "#ffffff";
                        const cardShadow = theme.cardStyle === "shadow" ? "0 2px 8px rgba(0,0,0,0.08)" : theme.cardStyle === "glass" ? "0 0 0 1px rgba(255,255,255,0.1)" : "0 1px 3px rgba(0,0,0,0.04)";
                        const cardBackdrop = theme.cardStyle === "glass" ? "blur(12px)" : undefined;
                        const cStyle: React.CSSProperties = { borderRadius: linkRadius, backgroundColor: cardBg, boxShadow: cardShadow, backdropFilter: cardBackdrop, padding: "12px" };

                        /* Section Title / Divider */
                        if (section.type === "section_title") {
                          const stStyle = (cfg.style as string) || "heading";
                          const stAlign = (cfg.align as string) || "center";
                          const stTitle = (cfg.title as string) || section.label;
                          const alignClass = stAlign === "left" ? "text-left" : stAlign === "right" ? "text-right" : "text-center";
                          return (
                            <div key={section.id} className={`px-1 ${alignClass}`}>
                              {(stStyle === "heading" || stStyle === "heading_divider") && (
                                <p className="font-bold text-[13px]" style={{ color: phoneText }}>{stTitle}</p>
                              )}
                              {(stStyle === "divider" || stStyle === "heading_divider") && (
                                <div className="mt-1.5 border-t" style={{ borderColor: isDark ? "#374151" : "#e5e7eb" }} />
                              )}
                            </div>
                          );
                        }

                        if (section.type === "podcast") {
                          return (
                            <div key={section.id} style={cStyle}>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold tracking-wide" style={{ color: theme.themeColor, fontSize: "12px" }}>&bull;&bull;&bull;</span>
                                <span className="text-[11px] font-semibold" style={{ color: theme.themeColor }}>{section.label}</span>
                              </div>
                              <p className="text-[10px] mt-0.5" style={{ color: phoneSubtext }}>Display your podcast episodes</p>
                            </div>
                          );
                        }

                        if (section.type === "custom_links") {
                          const links = (cfg.links as any[]) ?? [];
                          return (
                            <div key={section.id} style={cStyle}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Link className="h-3.5 w-3.5" style={{ color: theme.themeColor }} />
                                <span className="text-[11px] font-semibold" style={{ color: theme.themeColor }}>Custom Links</span>
                              </div>
                              {links.length > 0 ? (
                                <div className="space-y-1.5">
                                  {links.slice(0, 3).map((link: any) => (
                                    <div key={link.id} className="text-[11px] py-2 px-3 text-center truncate font-medium" style={getLinkItemStyle()}>{link.label || link.url || "Untitled link"}</div>
                                  ))}
                                  {links.length > 3 && <p className="text-[10px] pl-3" style={{ color: phoneSubtext }}>+{links.length - 3} more</p>}
                                </div>
                              ) : (
                                <p className="text-xs" style={{ color: phoneSubtext }}>Add links to display here</p>
                              )}
                            </div>
                          );
                        }

                        if (section.type === "book_meeting") {
                          return (
                            <div key={section.id} style={cStyle}>
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0" style={{ backgroundColor: `${theme.themeColor}15` }}><CalendarCheck className="h-4 w-4" style={{ color: theme.themeColor }} /></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold" style={{ color: theme.themeColor }}>{(cfg.buttonLabel as string) || "Book a Meeting"}</p>
                                  <p className="text-[10px]" style={{ color: phoneSubtext }}>Schedule time with me</p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={section.id} style={cStyle}>
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0" style={{ backgroundColor: `${theme.themeColor}15`, color: theme.themeColor }}>{getSectionIcon(entry)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-medium truncate" style={{ color: theme.themeColor }}>{section.label}</span>
                                  {entry.comingSoon && <span className="text-[9px] px-1.5 py-px rounded font-medium" style={{ backgroundColor: isDark ? "#2d3548" : "#e5e7eb", color: phoneSubtext }}>SOON</span>}
                                </div>
                                <p className="text-[10px] truncate" style={{ color: phoneSubtext }}>{entry.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );

              const screenStyle: React.CSSProperties = { fontFamily: theme.fontFamily, ...phoneScreenBg };

              /* PHONE */
              if (previewDevice === "phone") {
                return (
                  <div className="transition-all duration-300 relative" style={{ width: 323 }}>
                    <div className="absolute -left-[3px] top-[110px] w-[3px] h-[26px] bg-[#1a1a1a] rounded-l-sm" />
                    <div className="absolute -left-[3px] top-[153px] w-[3px] h-[48px] bg-[#1a1a1a] rounded-l-sm" />
                    <div className="absolute -left-[3px] top-[211px] w-[3px] h-[48px] bg-[#1a1a1a] rounded-l-sm" />
                    <div className="absolute -right-[3px] top-[170px] w-[3px] h-[68px] bg-[#1a1a1a] rounded-r-sm" />
                    <div className="rounded-[41px] relative" style={{ padding: "26px 14px", backgroundColor: "#1a1a1a", boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>
                      <div className="absolute top-[14px] left-1/2 -translate-x-1/2 z-10"><div className="w-[109px] h-[24px] rounded-full bg-black" /></div>
                      <div className="rounded-[27px] overflow-hidden overflow-y-auto relative" style={{ width: 296, height: 612, ...screenStyle }}>
                        {bioContent}
                        <div className="sticky bottom-0 flex justify-center pb-1.5 pt-1"><div className="w-24 h-1 rounded-full" style={{ backgroundColor: isDark ? "#4b5563" : "#d1d5db" }} /></div>
                      </div>
                    </div>
                  </div>
                );
              }

              /* TABLET */
              if (previewDevice === "tablet") {
                return (
                  <div className="transition-all duration-300" style={{ width: 480 }}>
                    <div className="rounded-2xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                      <div className="overflow-y-auto" style={{ width: 480, height: 640, ...screenStyle }}>
                        {bioContent}
                      </div>
                    </div>
                  </div>
                );
              }

              /* DESKTOP */
              return (
                <div className="transition-all duration-300" style={{ width: 720 }}>
                  <div className="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="bg-white dark:bg-gray-700 rounded-md px-3 py-1 text-[11px] text-muted-foreground font-mono min-w-[200px] text-center border border-gray-200 dark:border-gray-600">
                          milcrunch.com/c/{handle || "username"}
                        </div>
                      </div>
                      <div className="w-[54px]" />
                    </div>
                    <div className="overflow-y-auto" style={{ width: 720, height: 462, ...screenStyle }}>
                      {bioContent}
                    </div>
                  </div>
                </div>
              );
            })()}
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
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#1B3A6B]/10 text-[#1B3A6B] shrink-0">
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

                {/* ── SECTION ICON UPLOAD (all types) ── */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Section Icon</label>
                  <input
                    ref={(el) => { sectionIconInputRefs.current[section.id] = el; }}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={(e) => uploadSectionIcon(section.id, e)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    {cfg.iconUrl ? (
                      <div className="relative">
                        <img src={cfg.iconUrl as string} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />
                        <button
                          onClick={() => updateSectionConfig(section.id, { iconUrl: undefined })}
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => sectionIconInputRefs.current[section.id]?.click()}
                        className="h-12 w-12 rounded-lg border-2 border-dashed border-border hover:border-[#1B3A6B] transition-colors flex items-center justify-center"
                      >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      <p>Optional icon shown next to section title</p>
                      <p>PNG, JPG, SVG up to 5MB</p>
                    </div>
                  </div>
                </div>
                <div className="border-b border-border" />

                {/* ── SECTION TITLE / DIVIDER ── */}
                {section.type === "section_title" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Heading Text</label>
                      <Input
                        value={(cfg.title as string) ?? ""}
                        onChange={(e) => updateSectionConfig(section.id, { title: e.target.value })}
                        onBlur={() => persistSections(sections)}
                        placeholder="Section heading..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Style</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { value: "heading", label: "Heading" },
                          { value: "divider", label: "Divider" },
                          { value: "heading_divider", label: "Both" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateSectionConfig(section.id, { style: opt.value })}
                            className={`rounded-lg border-2 p-2 text-[11px] font-medium transition-all ${
                              (cfg.style || "heading") === opt.value
                                ? "border-[#1B3A6B] bg-[#1B3A6B]/5 text-[#1B3A6B]"
                                : "border-border text-muted-foreground hover:border-muted-foreground/30"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Alignment</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["left", "center", "right"] as const).map((a) => (
                          <button
                            key={a}
                            onClick={() => updateSectionConfig(section.id, { align: a })}
                            className={`rounded-lg border-2 p-2 text-[11px] font-medium transition-all capitalize ${
                              (cfg.align || "center") === a
                                ? "border-[#1B3A6B] bg-[#1B3A6B]/5 text-[#1B3A6B]"
                                : "border-border text-muted-foreground hover:border-muted-foreground/30"
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CUSTOM LINKS (Linktree-style) ── */}
                {section.type === "custom_links" && (() => {
                  const links = (cfg.links ?? []) as Array<{ id: string; label: string; url: string; thumbnail?: string; group?: string; imageDisplayType?: string; imageUrl?: string; description?: string }>;
                  return (
                    <div className="space-y-3">
                      {links.length === 0 && (
                        <div className="text-center py-6">
                          <Link2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">No links added yet.</p>
                        </div>
                      )}
                      {links.map((link, linkIdx) => {
                        const imgType = link.imageDisplayType || "none";
                        return (
                          <div key={link.id} className="rounded-lg border border-border p-3 space-y-3">
                            {/* Image Display Type selector */}
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-medium text-muted-foreground">Image Display Type</label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {([
                                  { value: "none", label: "No image", icon: <Link className="h-4 w-4" /> },
                                  { value: "icon", label: "Icon", icon: <ImagePlus className="h-4 w-4" /> },
                                  { value: "featured", label: "Featured", icon: <Eye className="h-4 w-4" /> },
                                ] as const).map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => {
                                      const updated = [...links];
                                      updated[linkIdx] = { ...link, imageDisplayType: opt.value };
                                      updateSectionConfig(section.id, { links: updated });
                                    }}
                                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all ${
                                      imgType === opt.value ? "border-[#1B3A6B] bg-[#1B3A6B]/5" : "border-border hover:border-muted-foreground/30"
                                    }`}
                                  >
                                    <div className={imgType === opt.value ? "text-[#1B3A6B]" : "text-muted-foreground"}>{opt.icon}</div>
                                    <span className="text-[10px] font-medium">{opt.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Upload zone (hidden when "none") */}
                            {imgType !== "none" && (
                              <div className="space-y-1.5">
                                <input
                                  ref={(el) => { linkImageInputRefs.current[link.id] = el; }}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={(e) => uploadLinkImage(section.id, link.id, e)}
                                  className="hidden"
                                />
                                {link.imageUrl ? (
                                  <div className="relative">
                                    <img src={link.imageUrl} alt="" className={`w-full object-cover rounded-lg border border-border ${imgType === "icon" ? "h-16 w-16" : "h-24"}`} />
                                    <button
                                      onClick={() => {
                                        const updated = [...links];
                                        updated[linkIdx] = { ...link, imageUrl: undefined };
                                        updateSectionConfig(section.id, { links: updated });
                                      }}
                                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => linkImageInputRefs.current[link.id]?.click()}
                                    className="w-full rounded-lg border-2 border-dashed border-border hover:border-[#1B3A6B] transition-colors p-3 flex flex-col items-center gap-1"
                                  >
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">Upload {imgType === "icon" ? "icon" : "image"}</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Title */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground">Title</label>
                              <Input
                                value={link.label}
                                onChange={(e) => {
                                  const updated = [...links];
                                  updated[linkIdx] = { ...link, label: e.target.value };
                                  updateSectionConfig(section.id, { links: updated });
                                }}
                                placeholder="Link title"
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* URL */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground">URL</label>
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
                            </div>

                            {/* Description with counter */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-medium text-muted-foreground">Description</label>
                                <span className="text-[10px] text-muted-foreground">{(link.description || "").length}/500</span>
                              </div>
                              <Textarea
                                value={link.description || ""}
                                onChange={(e) => {
                                  if (e.target.value.length > 500) return;
                                  const updated = [...links];
                                  updated[linkIdx] = { ...link, description: e.target.value };
                                  updateSectionConfig(section.id, { links: updated });
                                }}
                                placeholder="Brief description (optional)"
                                rows={2}
                                className="text-xs resize-none"
                              />
                            </div>

                            {/* Delete button */}
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => {
                                  const updated = links.filter((_, i) => i !== linkIdx);
                                  updateSectionConfig(section.id, { links: updated });
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <Button
                        variant="outline"
                        className="w-full border-dashed text-xs h-8"
                        onClick={() => {
                          updateSectionConfig(section.id, {
                            links: [...links, { id: generateId(), label: "", url: "", imageDisplayType: "none", description: "" }],
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
                {!["custom_links", "book_meeting", "podcast", "section_title"].includes(section.type) && (
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
                  className="w-full bg-[#1B3A6B] hover:bg-[#152e55] text-white text-xs"
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

      {/* ── ADD CONTENT MODAL ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Content</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {/* Section Title — featured at top */}
            {(() => {
              const stEntry = SECTION_CATALOG.find((e) => e.type === "section_title")!;
              const count = sections.filter((s) => s.type === "section_title").length;
              return (
                <button
                  onClick={() => addSection(stEntry)}
                  className="flex items-center gap-3 rounded-lg border-2 border-[#1B3A6B]/20 p-3.5 text-left transition-colors bg-[#EEF2FF] hover:bg-[#E0E7FF] cursor-pointer"
                >
                  <div className="flex items-center justify-center h-11 w-11 rounded-md bg-[#1B3A6B]/15 text-[#1B3A6B] shrink-0">
                    {getSectionIcon(stEntry)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#1B3A6B]">{stEntry.label}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#1B3A6B]/10 text-[#1B3A6B]">
                          &times;{count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#1B3A6B]/70">Organize your content into named groups</p>
                  </div>
                </button>
              );
            })()}

            {/* Divider */}
            <div className="border-t border-border my-1" />

            {/* Remaining catalog items (social_links removed — handled by Profile tab) */}
            {SECTION_CATALOG.filter((e) => e.type !== "section_title" && e.type !== "social_links").map((entry) => {
              const count = sections.filter((s) => s.type === entry.type).length;
              const isComingSoon = entry.comingSoon;
              return (
                <button
                  key={entry.type}
                  onClick={() => !isComingSoon && addSection(entry)}
                  disabled={isComingSoon}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    isComingSoon
                      ? "border-border/40 bg-muted/30 opacity-50 cursor-not-allowed"
                      : "border-border hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-[#1B3A6B]/10 text-[#1B3A6B] shrink-0">
                    {getSectionIcon(entry)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{entry.label}</span>
                      {isComingSoon && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Coming Soon</Badge>}
                      {count > 0 && !isComingSoon && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">&times;{count}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                </button>
              );
            })}

            {/* "Add to" group selector */}
            {sections.some((s) => s.type === "section_title") && (
              <div className="flex items-center gap-2 pt-2 border-t border-border mt-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Add to:</span>
                <select
                  value={targetGroupId ?? ""}
                  onChange={(e) => setTargetGroupId(e.target.value || null)}
                  className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Top of page</option>
                  {sections.filter((s) => s.type === "section_title").map((s) => (
                    <option key={s.id} value={s.id}>
                      {((s.config as Record<string, unknown>)?.title as string) || s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── TEMPLATE CAROUSEL MODAL ── */}
      {templateModalOpen && (() => {
        const cIdx = carouselCenterIdx;
        const totalT = TEMPLATES.length;
        const shiftCarousel = (dir: -1 | 1) => setCarouselCenterIdx((cIdx + dir + totalT) % totalT);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setTemplateModalOpen(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl mx-4 flex flex-col"
              style={{ height: "85vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <h2 className="text-lg font-semibold text-foreground">Choose a Template</h2>
                <button onClick={() => setTemplateModalOpen(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Carousel Area */}
              <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative px-4">
                {/* Left / Right arrows */}
                <button onClick={() => shiftCarousel(-1)} className="absolute left-4 z-20 h-10 w-10 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => shiftCarousel(1)} className="absolute right-4 z-20 h-10 w-10 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors">
                  <ChevronRightIcon className="h-5 w-5" />
                </button>

                {/* Cards row */}
                <div className="flex items-center justify-center gap-0 relative" style={{ width: "100%", height: "580px" }}>
                  {TEMPLATES.map((tpl, i) => {
                    const dist = ((i - cIdx + totalT + Math.floor(totalT / 2)) % totalT) - Math.floor(totalT / 2);
                    const absDist = Math.abs(dist);
                    const scale = absDist === 0 ? 1 : absDist === 1 ? 0.82 : 0.65;
                    const opacity = absDist === 0 ? 1 : absDist === 1 ? 0.7 : 0.45;
                    const zIndex = 10 - absDist;
                    const translateX = dist * 220;
                    const cardW = absDist === 0 ? 280 : absDist === 1 ? 240 : 200;
                    const cardH = absDist === 0 ? 500 : absDist === 1 ? 430 : 360;

                    const tDark = tpl.themeOverrides.darkMode;
                    const effBg = carouselBgColor && i === cIdx ? carouselBgColor : (tpl.id === "vibrant" ? theme.themeColor : tpl.themeOverrides.bgColor ?? "#ffffff");
                    const effAccent = carouselAccent && i === cIdx ? carouselAccent : theme.themeColor;
                    const effFont = carouselFont && i === cIdx ? carouselFont : (tpl.themeOverrides.fontFamily ?? "Inter");
                    const tText = tDark ? "#ffffff" : "#111827";
                    const tSub = tDark ? "#9ca3af" : "#6b7280";
                    const tAvatarR = tpl.imageStyle === "square" ? "4px" : "9999px";
                    const tLinkRadius = LINK_SHAPES.find((s) => s.value === tpl.themeOverrides.linkShape)?.radius ?? "9999px";
                    const tCardBg = tpl.id === "glass" ? (tDark ? "rgba(30,36,51,0.6)" : "rgba(255,255,255,0.7)") : tDark ? "#1e2433" : tpl.id === "minimal" ? "transparent" : "#ffffff";
                    const tCardBorder = tpl.id === "minimal" ? "1px solid #d1d5db" : "none";

                    const tLinkStyle = (): React.CSSProperties => {
                      const base: React.CSSProperties = { borderRadius: tLinkRadius, height: 28, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500 };
                      switch (tpl.themeOverrides.linkStyle) {
                        case "outline": return { ...base, border: `1.5px solid ${effAccent}`, backgroundColor: "transparent", color: effAccent };
                        case "soft-shadow": return { ...base, backgroundColor: tDark ? "#1e2433" : "#ffffff", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", color: effAccent };
                        case "fill": return { ...base, backgroundColor: effAccent, color: "#ffffff" };
                        default: return { ...base, backgroundColor: tDark ? "#1e2433" : "#ffffff", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", color: effAccent };
                      }
                    };

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => { setCarouselCenterIdx(i); setPendingTemplate(tpl.id); }}
                        className="absolute cursor-pointer"
                        style={{
                          width: cardW, height: cardH,
                          transform: `translateX(${translateX}px) scale(${scale})`,
                          opacity, zIndex,
                          transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
                          left: "50%", marginLeft: -cardW / 2,
                        }}
                      >
                        {/* Phone frame */}
                        <div className="w-full h-full rounded-[36px] overflow-hidden relative" style={{ backgroundColor: "#1a1a1a", padding: "12px 8px" }}>
                          {/* Dynamic Island */}
                          <div className="absolute top-[6px] left-1/2 -translate-x-1/2 z-10">
                            <div className="w-[72px] h-[16px] rounded-full bg-black" />
                          </div>
                          {/* Screen */}
                          <div
                            className="w-full h-full rounded-[28px] overflow-hidden overflow-y-auto"
                            style={{
                              fontFamily: effFont,
                              ...(tpl.id === "portrait" && heroImageUrl
                                ? { backgroundImage: `url(${heroImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                                : { backgroundColor: effBg }),
                            }}
                          >
                            {/* Portrait overlay */}
                            {tpl.id === "portrait" && (
                              <div className="absolute inset-0 rounded-[28px]" style={{ background: "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.75) 100%)" }} />
                            )}
                            <div className="relative flex flex-col h-full">
                              {/* Hero for bold */}
                              {(tpl.id === "bold" || tpl.id === "classic") && heroImageUrl && (
                                <div className="w-full shrink-0 overflow-hidden" style={{ height: "35%" }}>
                                  <img src={heroImageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                              {/* Profile area */}
                              <div className={`flex flex-col ${tpl.id === "minimal" ? "items-start px-4" : "items-center"} ${
                                tpl.id === "portrait" ? "mt-auto pb-2" : (tpl.id === "bold" || tpl.id === "classic") && heroImageUrl ? "-mt-6 z-[2]" : "mt-8"
                              }`}>
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt="" className="object-cover" style={{
                                    width: 48, height: 48, borderRadius: tAvatarR,
                                    border: "3px solid #ffffff",
                                  }} />
                                ) : (
                                  <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: tAvatarR, backgroundColor: tDark ? "#2d3548" : "#e5e7eb", fontSize: 16, fontWeight: 700, color: tSub, border: "3px solid #ffffff" }}>
                                    {(displayName || "?")[0]?.toUpperCase()}
                                  </div>
                                )}
                                <p className="mt-1.5 truncate max-w-full font-bold" style={{ fontSize: 14, color: tText, fontFamily: effFont }}>{displayName || "Your Name"}</p>
                                <p style={{ fontSize: 10, color: tSub }}>@{handle || "username"}</p>
                              </div>
                              {/* Section cards */}
                              <div className={`px-3 space-y-1.5 ${tpl.id === "portrait" ? "pb-4 mt-2" : "mt-3"} flex-1`}>
                                {/* Social Links card */}
                                <div className="p-2 rounded-lg" style={{ backgroundColor: tCardBg, border: tCardBorder, backdropFilter: tpl.themeOverrides.cardStyle === "glass" ? "blur(12px)" : undefined }}>
                                  <p style={{ fontSize: 9, fontWeight: 600, color: effAccent, marginBottom: 4 }}>Social Links</p>
                                  <div className="flex gap-1">
                                    {["instagram", "tiktok", "youtube"].map((p) => (
                                      <PlatformIcon key={p} platform={p} size={22} />
                                    ))}
                                  </div>
                                </div>
                                {/* Book a Meeting card */}
                                <div className="p-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: tCardBg, border: tCardBorder }}>
                                  <div className="rounded-md flex items-center justify-center shrink-0" style={{ width: 24, height: 24, backgroundColor: `${effAccent}15` }}>
                                    <CalendarCheck className="h-3 w-3" style={{ color: effAccent }} />
                                  </div>
                                  <div>
                                    <p style={{ fontSize: 9, fontWeight: 600, color: effAccent }}>Book a Meeting</p>
                                    <p style={{ fontSize: 8, color: tSub }}>Schedule time</p>
                                  </div>
                                </div>
                                {/* Custom Links */}
                                <div className="space-y-1">
                                  {["My Website", "Latest Video"].map((lbl) => (
                                    <div key={lbl} style={tLinkStyle()}>{lbl}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Template name below carousel */}
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => shiftCarousel(-1)} className="text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-sm font-semibold text-foreground min-w-[120px] text-center capitalize">{TEMPLATES[cIdx].label}</span>
                  <button onClick={() => shiftCarousel(1)} className="text-muted-foreground hover:text-foreground transition-colors"><ChevronRightIcon className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Bottom Controls Bar */}
              <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
                {/* Colors */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Colors:</span>
                  <label className="relative cursor-pointer">
                    <div className="h-7 w-7 rounded-md border border-border" style={{ backgroundColor: carouselBgColor || (TEMPLATES[cIdx].id === "vibrant" ? theme.themeColor : TEMPLATES[cIdx].themeOverrides.bgColor ?? "#ffffff") }} />
                    <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={carouselBgColor || (TEMPLATES[cIdx].themeOverrides.bgColor ?? "#ffffff")} onChange={(e) => setCarouselBgColor(e.target.value)} />
                  </label>
                  <label className="relative cursor-pointer">
                    <div className="h-7 w-7 rounded-md border border-border" style={{ backgroundColor: carouselAccent || theme.themeColor }} />
                    <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={carouselAccent || theme.themeColor} onChange={(e) => setCarouselAccent(e.target.value)} />
                  </label>
                </div>
                {/* Font */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Font:</span>
                  <select
                    value={carouselFont || TEMPLATES[cIdx].themeOverrides.fontFamily || "Inter"}
                    onChange={(e) => setCarouselFont(e.target.value)}
                    className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                  >
                    {["Inter", "Poppins", "Merriweather", "IBM Plex Mono", "Montserrat"].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                {/* Buttons */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-[#1B3A6B] hover:bg-[#152e55] text-white text-xs"
                    onClick={() => {
                      const tplId = TEMPLATES[cIdx].id;
                      const tpl = TEMPLATES[cIdx];
                      const overrides: Partial<ThemeSettings> = { ...tpl.themeOverrides };
                      if (carouselBgColor) overrides.bgColor = carouselBgColor;
                      if (carouselAccent) { overrides.themeColor = carouselAccent; overrides.linkColor = carouselAccent; }
                      if (carouselFont) overrides.fontFamily = carouselFont;
                      const updated: ThemeSettings = { ...theme, ...overrides, template: tplId };
                      if (tplId === "vibrant" && !carouselBgColor) updated.bgColor = carouselAccent || theme.themeColor;
                      if (tplId === "portrait" && heroImageUrl) updated.bgImageUrl = heroImageUrl;
                      setTheme(updated);
                      setImageStyle(tpl.imageStyle);
                      if (user?.id) {
                        const meta = user.user_metadata ?? {};
                        const cl = typeof meta.custom_links === "object" && meta.custom_links ? (meta.custom_links as Record<string, unknown>) : {};
                        supabase.auth.updateUser({ data: { image_style: tpl.imageStyle, custom_links: { ...cl, themeSettings: updated } } });
                      }
                      setCarouselBgColor(null);
                      setCarouselAccent(null);
                      setCarouselFont(null);
                      setTemplateModalOpen(false);
                      toast.success(`Applied "${tpl.label}" template`);
                    }}
                  >
                    Apply Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </CreatorLayout>
  );
}
