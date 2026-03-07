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

/* ── SVG icons for social platforms ── */
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" />
  </svg>
);
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007C5.965 24 2.615 20.272 2.615 14.71v-.586C2.615 8.478 6.236 4.635 12.051 4.635c5.587 0 8.964 3.525 8.964 8.527v.31c0 3.63-1.96 5.895-5.058 5.895-1.576 0-2.769-.658-3.308-1.85-.596 1.14-1.683 1.75-3.133 1.75-2.35 0-3.886-1.81-3.886-4.576 0-2.893 1.624-4.784 4.136-4.784 1.22 0 2.17.518 2.724 1.38l.07-.008V9.68h2.39v5.98c0 1.41.58 2.23 1.652 2.23 1.384 0 2.163-1.29 2.163-3.59v-.31c0-3.78-2.4-6.367-6.614-6.367-4.504 0-7.186 2.883-7.186 7.504v.586c0 4.38 2.387 7.127 6.688 7.127h.007c1.476 0 2.81-.302 3.963-.899l.867 1.877C14.923 23.65 13.595 24 12.186 24zM12.217 12c-1.427 0-2.256 1.066-2.256 2.689 0 1.62.76 2.614 2.073 2.614 1.336 0 2.132-1.048 2.132-2.674 0-1.585-.787-2.63-1.949-2.63z" />
  </svg>
);
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);
const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.39c.042.266.064.537.064.814 0 2.893-3.283 5.242-7.33 5.242-4.046 0-7.328-2.349-7.328-5.242 0-.277.022-.548.064-.814a1.606 1.606 0 01-.634-1.282 1.62 1.62 0 012.786-1.126c1.268-.868 2.98-1.42 4.895-1.47l.975-4.588a.36.36 0 01.432-.278l3.256.694a1.15 1.15 0 012.147.547 1.15 1.15 0 01-2.146.547l-2.836-.605-.868 4.082c1.876.065 3.548.618 4.79 1.472a1.615 1.615 0 012.783 1.126c0 .51-.236.965-.604 1.262zm-9.068 1.186a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3zm5.282 2.044c-1.16 1.16-3.386 1.25-4.28 1.25s-3.12-.1-4.28-1.25a.386.386 0 01.546-.546c.73.73 2.29.99 3.734.99 1.444 0 3.004-.26 3.734-.99a.386.386 0 01.546.546zM14.85 14.576a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3z" />
  </svg>
);
const BlueskyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.418 5.097 5.115 8.475 4.24 11.414c-.947 3.183.28 5.23 2.478 5.583-1.174.458-2.555 1.252-2.345 3.156.255 2.308 2.228 2.078 5.11 1.488.96-.196 1.632-.388 2.517-.388.885 0 1.557.192 2.517.388 2.882.59 4.855.82 5.11-1.488.21-1.904-1.171-2.698-2.345-3.156 2.198-.352 3.425-2.4 2.478-5.583C18.885 8.475 15.582 5.097 12 2z" />
  </svg>
);
const GoogleBizIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/* ── Social platform icon helper ── */
const SOCIAL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram, youtube: Youtube, facebook: Facebook,
  linkedin: Linkedin, x: Twitter, twitter: Twitter, tiktok: TikTokIcon,
  threads: ThreadsIcon, pinterest: PinterestIcon, reddit: RedditIcon,
  bluesky: BlueskyIcon, google_business: GoogleBizIcon,
};
function socialIcon(platform: string) {
  return SOCIAL_ICON[platform.toLowerCase()] ?? Share2;
}
const SOCIAL_BRAND_COLORS: Record<string, string> = {
  instagram: "#E4405F", youtube: "#FF0000", facebook: "#1877F2",
  linkedin: "#0A66C2", twitter: "#1DA1F2", x: "#000000", tiktok: "#000000",
  threads: "#000000", pinterest: "#E60023", reddit: "#FF4500",
  bluesky: "#0085FF", google_business: "#4285F4",
};

/* ── Sidebar tab definitions ── */
type EditorTab = "profile" | "design" | "sections" | "share";
const SIDEBAR_TABS: { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "design", label: "Design", icon: Palette },
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
  bgImageUrl?: string;
  cardStyle: CardStyle;
  fontFamily: string;
  darkMode: boolean;
  shade: string;
  linkShape: string;
  linkStyle: string;
  linkColor: string;
  showBranding: boolean;
  template?: string;
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

/* ── Unified 12-color swatch set (used across all Design sub-tabs) ── */
const SWATCH_COLORS = [
  "#000000", "#6B7280", "#991B1B", "#DC2626", "#EA580C", "#CA8A04",
  "#DB2777", "#7C3AED", "#1E3A8A", "#2563EB", "#0D9488", "#16A34A",
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
  { value: "square", label: "Square", radius: "0px" },
  { value: "squircle", label: "Squircle", radius: "20px" },
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
  const [heroImageFormat, setHeroImageFormat] = useState<HeroImageFormat>("landscape");
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
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("preview");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateId | null>(null);
  const sectionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    themeColor: "#3b82f6", bgMode: "solid", bgColor: "#ffffff",
    cardStyle: "round", fontFamily: "Inter", darkMode: false,
    shade: "none", linkShape: "pill", linkStyle: "fill",
    linkColor: "#3b82f6", showBranding: true,
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

  /* Screen background — varies by bgMode; dark mode always overrides */
  const phoneScreenBg: React.CSSProperties = isDark
    ? { backgroundColor: "#0f1117" }
    : theme.bgMode === "gradient"
      ? { background: `linear-gradient(180deg, ${theme.themeColor}33 0%, ${theme.bgColor} 100%)` }
      : theme.bgMode === "image" && theme.bgImageUrl
        ? { backgroundImage: `url(${theme.bgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { backgroundColor: theme.bgColor };

  /* Link rendering helpers */
  const linkRadius = LINK_SHAPES.find((s) => s.value === theme.linkShape)?.radius ?? "9999px";
  const linkColor = theme.linkColor || theme.themeColor;
  const getLinkItemStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { borderRadius: linkRadius };
    switch (theme.linkStyle) {
      case "outline":
        return { ...base, border: `2px solid ${linkColor}`, color: linkColor, backgroundColor: "transparent" };
      case "soft-shadow":
        return { ...base, backgroundColor: isDark ? "#1e2433" : "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", color: linkColor };
      case "hard-shadow":
        return { ...base, backgroundColor: isDark ? "#1e2433" : "#ffffff", boxShadow: `4px 4px 0 0 ${linkColor}`, color: isDark ? "#ffffff" : "#111827" };
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  style={{ fontSize: "15px", ...(active ? { background: "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)" } : {}) }}
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
                            ? "text-green-700 dark:text-green-400"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className={`h-[28px] w-[28px] rounded-full flex items-center justify-center transition-colors ${active ? "bg-green-200 dark:bg-green-800/40" : ""}`}>
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
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => { updateTheme({ themeColor: c }); persistTheme({ ...theme, themeColor: c }); }}
                          className={`h-9 w-9 rounded-full border-2 transition-all mx-auto ${
                            theme.themeColor.toLowerCase() === c.toLowerCase()
                              ? "border-foreground ring-2 ring-foreground/20 scale-110"
                              : "border-transparent hover:scale-105"
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
                              ? "border-green-500 ring-2 ring-green-500/20"
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
                            <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
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
                              ? "border-green-500 ring-2 ring-green-500/20 bg-green-50 dark:bg-green-900/10"
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
                              ? "border-green-500 ring-2 ring-green-500/20"
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
                        else if (s.value === "soft-shadow") Object.assign(previewStyle, { backgroundColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", color: linkColor });
                        else Object.assign(previewStyle, { backgroundColor: "#fff", boxShadow: `4px 4px 0 0 ${linkColor}`, color: "#111827" });
                        return (
                          <button
                            key={s.value}
                            onClick={() => { updateTheme({ linkStyle: s.value }); persistTheme({ ...theme, linkStyle: s.value }); }}
                            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                              theme.linkStyle === s.value
                                ? "border-green-500 ring-2 ring-green-500/20"
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
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => { updateTheme({ linkColor: c }); persistTheme({ ...theme, linkColor: c }); }}
                          className={`h-9 w-9 rounded-full border-2 transition-all mx-auto ${
                            theme.linkColor.toLowerCase() === c.toLowerCase()
                              ? "border-foreground ring-2 ring-foreground/20 scale-110"
                              : "border-transparent hover:scale-105"
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
                            theme.bgMode === mode ? "bg-green-600 text-white" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    {/* Solid — unified color swatches + hex */}
                    {theme.bgMode === "solid" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-6 gap-2">
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
                          className="w-full rounded-xl border-2 border-dashed border-border hover:border-green-400 transition-colors p-4 flex flex-col items-center gap-2"
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

            {/* Phone frame — 85% scale mockup (323×663, 296×612 screen) */}
            <div className={`${deviceWidth[previewDevice]} transition-all duration-300 relative`}>
              {/* Side buttons — volume (left), power (right) */}
              <div className="absolute -left-[3px] top-[110px] w-[3px] h-[26px] bg-[#1a1a1a] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[153px] w-[3px] h-[48px] bg-[#1a1a1a] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[211px] w-[3px] h-[48px] bg-[#1a1a1a] rounded-l-sm" />
              <div className="absolute -right-[3px] top-[170px] w-[3px] h-[68px] bg-[#1a1a1a] rounded-r-sm" />

              {/* Bezel — dark frame */}
              <div
                className="rounded-[41px] relative"
                style={{
                  padding: "26px 14px",
                  backgroundColor: "#1a1a1a",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
                }}
              >
                {/* Dynamic Island — true black pill */}
                <div className="absolute top-[14px] left-1/2 -translate-x-1/2 z-10">
                  <div className="w-[109px] h-[24px] rounded-full bg-black" />
                </div>

                {/* Screen — 296×612 */}
                <div
                  className="rounded-[27px] overflow-hidden overflow-y-auto relative"
                  style={{
                    width: "296px",
                    height: "612px",
                    fontFamily: theme.fontFamily,
                    ...phoneScreenBg,
                  }}
                >
                  {/* Hero image */}
                  {heroImageUrl && (
                    <div className="w-full overflow-hidden" style={{ height: heroImageFormat === "portrait" ? "170px" : heroImageFormat === "square" ? "136px" : "102px" }}>
                      <img src={heroImageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Profile header */}
                  <div className={`px-4 ${heroImageUrl ? "pt-3" : "pt-12"} pb-2.5 flex flex-col items-center`}>
                    {/* Avatar — 54px circular */}
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-[54px] w-[54px] rounded-full object-cover shadow-sm" style={{ border: `2px solid ${theme.themeColor}` }} />
                    ) : (
                      <div className="h-[54px] w-[54px] rounded-full flex items-center justify-center text-lg font-semibold" style={{ backgroundColor: isDark ? "#2d3548" : "#e5e7eb", color: phoneSubtext }}>
                        {(displayName || "?")[0].toUpperCase()}
                      </div>
                    )}
                    {/* Name — 15px bold */}
                    <h3 className="mt-2 font-bold leading-tight" style={{ fontSize: "15px", color: phoneText, fontFamily: theme.fontFamily }}>
                      {displayName || "Your Name"}
                    </h3>
                    {/* Username — 11px gray */}
                    <p className="mt-0.5" style={{ fontSize: "11px", color: phoneSubtext }}>@{handle || "username"}</p>
                    {/* Certified Voice badge */}
                    <div className="flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full border" style={{ borderColor: theme.themeColor, color: theme.themeColor }}>
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      <span className="text-[10px] font-medium">Certified Voice</span>
                    </div>
                    {/* Bio */}
                    {profileBio && (
                      <p className="text-[11px] mt-1.5 text-center max-w-[240px] leading-relaxed line-clamp-3" style={{ color: phoneSubtext }}>
                        {profileBio}
                      </p>
                    )}
                  </div>

                  {/* Sections — render actual content per type */}
                  <div className="px-3 pb-8 space-y-2.5">
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

                        /* Card style from theme — white (light) / #1e2433 (dark) */
                        const cardBg = theme.cardStyle === "glass"
                          ? isDark ? "rgba(30,36,51,0.6)" : "rgba(255,255,255,0.7)"
                          : isDark ? "#1e2433" : "#ffffff";
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
                          padding: "12px",
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
                              <p className="text-[11px] font-semibold mb-2" style={{ color: theme.themeColor }}>Social Links</p>
                              {accs.length > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {accs.map((acc) => {
                                    const SIcon = socialIcon(acc.platform);
                                    const brandColor = SOCIAL_BRAND_COLORS[acc.platform.toLowerCase()] ?? theme.themeColor;
                                    return (
                                      <div key={acc.id} className="flex items-center justify-center rounded-full shadow-sm" style={{ width: 34, height: 34, backgroundColor: brandColor }}>
                                        <SIcon className="h-4 w-4 text-white" />
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
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold tracking-wide" style={{ color: theme.themeColor, fontSize: "12px" }}>&bull;&bull;&bull;</span>
                                <span className="text-[11px] font-semibold" style={{ color: theme.themeColor }}>{section.label}</span>
                              </div>
                              <p className="text-[10px] mt-0.5" style={{ color: phoneSubtext }}>Display your podcast episodes</p>
                            </div>
                          );
                        }

                        /* ── Custom Links ── */
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
                                    <div key={link.id} className="text-[11px] py-2 px-3 text-center truncate font-medium" style={getLinkItemStyle()}>
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
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0" style={{ backgroundColor: `${theme.themeColor}15` }}>
                                  <CalendarCheck className="h-4 w-4" style={{ color: theme.themeColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold" style={{ color: theme.themeColor }}>{(cfg.buttonLabel as string) || "Book a Meeting"}</p>
                                  <p className="text-[10px]" style={{ color: phoneSubtext }}>Schedule time with me</p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        /* ── Default section card ── */
                        return (
                          <div key={section.id} style={cStyle}>
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0" style={{ backgroundColor: `${theme.themeColor}15`, color: theme.themeColor }}>
                                {getSectionIcon(entry)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-medium truncate" style={{ color: theme.themeColor }}>{section.label}</span>
                                  {entry.comingSoon && (
                                    <span className="text-[9px] px-1.5 py-px rounded font-medium" style={{ backgroundColor: isDark ? "#2d3548" : "#e5e7eb", color: phoneSubtext }}>SOON</span>
                                  )}
                                </div>
                                <p className="text-[10px] truncate" style={{ color: phoneSubtext }}>{entry.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Home indicator bar — inside screen at bottom */}
                  <div className="sticky bottom-0 flex justify-center pb-1.5 pt-1">
                    <div className="w-24 h-1 rounded-full" style={{ backgroundColor: isDark ? "#4b5563" : "#d1d5db" }} />
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
                    <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={() => navigate("/creator/socials")}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Go to My Socials
                    </Button>
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

      {/* ── TEMPLATE BROWSER MODAL ── */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setTemplateModalOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          {/* Panel */}
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-foreground">Choose a Template</h2>
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-5">
                {TEMPLATES.map((tpl) => {
                  const selected = pendingTemplate === tpl.id;
                  const tDark = tpl.themeOverrides.darkMode;
                  const tBg = tpl.id === "vibrant" ? theme.themeColor
                    : tpl.themeOverrides.bgColor ?? "#ffffff";
                  const tText = tDark ? "#ffffff" : "#111827";
                  const tSub = tDark ? "#9ca3af" : "#6b7280";
                  const tCardBg = tDark ? "#1e2433" : tpl.id === "minimal" ? "transparent" : "#ffffff";
                  const tCardBorder = tpl.id === "minimal" ? "1px solid #e5e7eb" : "none";
                  const tAvatarR = tpl.imageStyle === "square" ? "4px" : "9999px";
                  const tLinkRadius = LINK_SHAPES.find((s) => s.value === tpl.themeOverrides.linkShape)?.radius ?? "9999px";
                  const tLinkColor = theme.themeColor;

                  /* Link preview style per template */
                  const tLinkStyle = (): React.CSSProperties => {
                    const base: React.CSSProperties = { borderRadius: tLinkRadius, height: 14, width: "100%" };
                    switch (tpl.themeOverrides.linkStyle) {
                      case "outline":
                        return { ...base, border: `1.5px solid ${tLinkColor}`, backgroundColor: "transparent" };
                      case "soft-shadow":
                        return { ...base, backgroundColor: tDark ? "#1e2433" : "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" };
                      case "fill":
                        return { ...base, backgroundColor: tLinkColor };
                      default:
                        return { ...base, backgroundColor: tDark ? "#1e2433" : "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" };
                    }
                  };

                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setPendingTemplate(tpl.id)}
                      className={`relative rounded-2xl overflow-hidden transition-all text-left ${
                        selected ? "ring-3 ring-blue-500 ring-offset-2" : "ring-1 ring-border hover:ring-foreground/30"
                      }`}
                      style={{ height: 360 }}
                    >
                      {/* Background */}
                      <div className="absolute inset-0" style={
                        tpl.id === "portrait" && heroImageUrl
                          ? { backgroundImage: `url(${heroImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : { backgroundColor: tBg }
                      } />
                      {/* Portrait gradient overlay */}
                      {tpl.id === "portrait" && (
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 25%, rgba(0,0,0,0.8) 100%)" }} />
                      )}

                      <div className="relative h-full flex flex-col">
                        {/* Hero strip for bold template */}
                        {tpl.id === "bold" && heroImageUrl && (
                          <div className="w-full h-[72px] overflow-hidden shrink-0">
                            <img src={heroImageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Profile area */}
                        <div className={`flex flex-col ${tpl.id === "minimal" ? "items-start px-5" : "items-center"} ${
                          tpl.id === "portrait" ? "mt-auto" : tpl.id === "bold" && heroImageUrl ? "-mt-5" : "mt-10"
                        }`}>
                          {/* Avatar */}
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="object-cover" style={{
                              width: 40, height: 40, borderRadius: tAvatarR,
                              border: tpl.id === "bold" ? "3px solid #fff"
                                : tpl.id === "vibrant" ? `3px solid ${theme.themeColor}`
                                : "none",
                            }} />
                          ) : (
                            <div className="flex items-center justify-center" style={{
                              width: 40, height: 40, borderRadius: tAvatarR,
                              backgroundColor: tDark ? "#2d3548" : "#e5e7eb",
                              fontSize: 14, fontWeight: 700, color: tSub,
                            }}>
                              {(displayName || "?")[0]?.toUpperCase()}
                            </div>
                          )}
                          {/* Name */}
                          <p className="mt-1.5 truncate max-w-[180px] font-bold" style={{
                            fontSize: 12, color: tText, fontFamily: tpl.themeOverrides.fontFamily,
                          }}>
                            {displayName || "Your Name"}
                          </p>
                          <p style={{ fontSize: 9, color: tSub }}>@{handle || "username"}</p>
                          {/* Mini badge */}
                          <div className="flex items-center gap-0.5 mt-1 px-2 py-0.5 rounded-full border" style={{ borderColor: tLinkColor }}>
                            <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke={tLinkColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                            <span style={{ fontSize: 7, color: tLinkColor, fontWeight: 600 }}>Certified</span>
                          </div>
                        </div>

                        {/* Section placeholder bars */}
                        <div className={`px-4 space-y-2 ${tpl.id === "portrait" ? "pb-6 mt-3" : "mt-4"}`}>
                          {[1, 2, 3].map((i) => (
                            <div key={i} style={tLinkStyle()} />
                          ))}
                        </div>

                        {/* Social icons row */}
                        <div className={`flex ${tpl.id === "minimal" ? "justify-start px-5" : "justify-center"} gap-1 mt-1`}>
                          {["instagram", "tiktok", "youtube"].map((p) => {
                            const brandColor = SOCIAL_BRAND_COLORS[p] ?? tLinkColor;
                            return (
                              <div key={p} className="rounded-full flex items-center justify-center" style={{ width: 16, height: 16, backgroundColor: brandColor }}>
                                <div className="w-2 h-2 rounded-full bg-white/80" />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Template label */}
                      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-6" style={{
                        background: tpl.id === "portrait" || tpl.id === "bold"
                          ? "transparent"
                          : "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
                      }}>
                        <p className="text-[11px] font-bold text-white text-center drop-shadow-md">{tpl.label}</p>
                      </div>

                      {/* Selection checkmark */}
                      {selected && (
                        <div className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border shrink-0">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-sm font-medium"
                disabled={!pendingTemplate}
                onClick={() => {
                  if (pendingTemplate) {
                    applyTemplate(pendingTemplate);
                    setTemplateModalOpen(false);
                  }
                }}
              >
                Apply Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </CreatorLayout>
  );
}
