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

/** Stored in creator_profiles.custom_links JSONB. */
export interface CustomLinksConfig {
  tabs?: BioTabConfig[];
  links?: BioLinkConfig[];
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
    return { tabs: DEFAULT_TABS, links: [] };
  }
  const o = raw as Record<string, unknown>;
  const tabs = Array.isArray(o.tabs) && o.tabs.length > 0
    ? (o.tabs as BioTabConfig[])
    : DEFAULT_TABS;
  const links = Array.isArray(o.links) ? (o.links as BioLinkConfig[]) : [];
  return { tabs, links };
}
