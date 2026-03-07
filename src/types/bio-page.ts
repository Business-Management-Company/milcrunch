/** Bio page layout format (Komi-style). */
export type HeroImageFormat = "portrait" | "square" | "landscape";

export type BioPageTheme = "light" | "dark" | "auto";

export type TabType = "links" | "events" | "content" | "shop" | "about";

export interface BioTabConfig {
  label: string;
  type: TabType;
  order: number;
  visible: boolean;
}

export interface BioLinkConfig {
  label: string;
  url: string;
  icon?: string;
}

/** Section types for the bio page editor. */
export type SectionType =
  | "featured_video"
  | "streaming_channel"
  | "social_links"
  | "book_meeting"
  | "books"
  | "promo_codes"
  | "store"
  | "tips"
  | "custom_links"
  | "podcast"
  | "blog"
  | "section_title";

export interface BioSectionConfig {
  id: string;
  type: SectionType;
  label: string;
  visible: boolean;
  order: number;
  /** Optional group: references the id of a section_title this belongs to */
  groupId?: string;
  /** Section-specific configuration (links, URLs, toggles, etc.) */
  config?: Record<string, unknown>;
}

export interface SectionCatalogEntry {
  type: SectionType;
  label: string;
  description: string;
  icon: string;
  comingSoon: boolean;
}

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  { type: "featured_video", label: "Featured Video", description: "Highlight a video from your media library", icon: "Clapperboard", comingSoon: false },
  { type: "streaming_channel", label: "My Streaming Channel", description: "Show your live streams and replays", icon: "MonitorPlay", comingSoon: true },
  { type: "social_links", label: "Social Links", description: "Connect your social media profiles", icon: "Share2", comingSoon: false },
  { type: "book_meeting", label: "Book a Meeting", description: "Let visitors schedule time with you", icon: "CalendarCheck", comingSoon: false },
  { type: "books", label: "Books", description: "Showcase your published books", icon: "BookOpen", comingSoon: true },
  { type: "promo_codes", label: "Promo Codes", description: "Share discount codes and special offers", icon: "Ticket", comingSoon: false },
  { type: "store", label: "Store", description: "Sell products directly from your page", icon: "ShoppingBag", comingSoon: true },
  { type: "tips", label: "Tips / Support Me", description: "Accept tips and donations from supporters", icon: "HandCoins", comingSoon: true },
  { type: "custom_links", label: "Custom Links", description: "Add unlimited custom links with groupings", icon: "Link", comingSoon: false },
  { type: "podcast", label: "Podcast", description: "Showcase your podcast and episodes", icon: "Mic", comingSoon: false },
  { type: "blog", label: "Blog", description: "Display your subscribers", icon: "Mail", comingSoon: true },
  { type: "section_title", label: "Section Title / Divider", description: "Add a heading or visual separator between sections", icon: "Type", comingSoon: false },
];

/** Stored in creator_profiles.custom_links JSONB. */
export interface CustomLinksConfig {
  tabs?: BioTabConfig[];
  links?: BioLinkConfig[];
  sections?: BioSectionConfig[];
}

export const DEFAULT_TABS: BioTabConfig[] = [
  { label: "My Links", type: "links", order: 1, visible: true },
  { label: "Events", type: "events", order: 2, visible: true },
  { label: "Content", type: "content", order: 3, visible: true },
  { label: "Shop", type: "shop", order: 4, visible: true },
  { label: "About", type: "about", order: 5, visible: true },
];

export function normalizeCustomLinks(raw: unknown): CustomLinksConfig {
  if (!raw || typeof raw !== "object") {
    return { tabs: DEFAULT_TABS, links: [], sections: [] };
  }
  const o = raw as Record<string, unknown>;
  const tabs = Array.isArray(o.tabs) && o.tabs.length > 0
    ? (o.tabs as BioTabConfig[])
    : DEFAULT_TABS;
  const links = Array.isArray(o.links) ? (o.links as BioLinkConfig[]) : [];
  const sections = Array.isArray(o.sections) ? (o.sections as BioSectionConfig[]) : [];
  return { tabs, links, sections };
}
