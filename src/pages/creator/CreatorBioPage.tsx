import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { getCreatorByHandle, getInitials, formatFollowerCount, type CreatorRow } from "@/lib/creators-db";
import {
  getVisitorId,
  getDeviceInfo,
  getUtmSource,
  getCampaignId,
  trackPageView,
  initBehavioralTracking,
  trackBioLinkClick,
  getConsent,
  setConsent,
} from "@/lib/creator-pixel";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeCustomLinks,
  type CustomLinksConfig,
  type BioTabConfig,
  type BioLinkConfig,
  type HeroImageFormat,
  DEFAULT_TABS,
} from "@/types/bio-page";
import {
  Loader2,
  ExternalLink,
  ShieldCheck,
  Instagram,
  Youtube,
  Facebook,
  Globe,
  Mic,
  ShoppingBag,
  X,
} from "lucide-react";

const BRANCH_LABELS: Record<string, string> = {
  army: "Army",
  navy: "Navy",
  marines: "Marines",
  air_force: "Air Force",
  coast_guard: "Coast Guard",
  space_force: "Space Force",
};

interface SocialAccount {
  platform: string;
  platform_username: string | null;
  profile_image_url: string | null;
}

interface BioCreator {
  display_name: string;
  avatar_url: string | null;
  hero_image_url: string | null;
  hero_image_format: HeroImageFormat;
  hero_dominant_color: string | null;
  bio_page_theme: string;
  bio: string | null;
  category: string | null;
  follower_count: number | null;
  is_verified: boolean;
  links: BioLinkConfig[];
  tabs: BioTabConfig[];
  socialAccounts: SocialAccount[];
  branch: string | null;
  is_verified_veteran: boolean;
  service_line: string | null;
}

/** Resolve creator by handle: creators table or creator_profiles (with bio layout). */
async function resolveCreator(handle: string): Promise<BioCreator | null> {
  const h = handle.replace(/^@/, "").trim().toLowerCase();
  if (!h) return null;

  const fromCreators = await getCreatorByHandle(h);
  if (fromCreators) {
    const links: BioLinkConfig[] = [
      { label: "Instagram", url: `https://instagram.com/${fromCreators.handle}`, icon: "instagram" },
    ];
    if (fromCreators.category) links.push({ label: fromCreators.category, url: "#", icon: "globe" });
    return {
      display_name: fromCreators.display_name,
      avatar_url: fromCreators.avatar_url,
      hero_image_url: fromCreators.avatar_url,
      hero_image_format: "landscape",
      hero_dominant_color: null,
      bio_page_theme: "light",
      bio: fromCreators.bio,
      category: fromCreators.category,
      follower_count: fromCreators.follower_count,
      is_verified: fromCreators.is_verified,
      links,
      tabs: [{ label: "Links", type: "links", order: 1, visible: true }],
      socialAccounts: [],
      branch: null,
      is_verified_veteran: false,
      service_line: null,
    };
  }

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select(
      "display_name, bio, custom_links, handle, user_id, hero_image_url, hero_image_format, hero_dominant_color, bio_page_theme, branch, is_verified_veteran, service_line"
    )
    .eq("handle", h)
    .maybeSingle();

  if (!profile) return null;

  const customLinks = normalizeCustomLinks(profile.custom_links);
  const tabs = (customLinks.tabs ?? DEFAULT_TABS).filter((t) => t.visible).sort((a, b) => a.order - b.order);
  const links = customLinks.links ?? [];

  let socialAccounts: SocialAccount[] = [];
  const userId = (profile as { user_id?: string }).user_id;
  if (userId) {
    const { data: accounts } = await supabase
      .from("connected_accounts")
      .select("platform, platform_username, profile_image_url")
      .eq("user_id", userId);
    socialAccounts = (accounts ?? []) as SocialAccount[];
  }

  const heroFormat = (profile.hero_image_format as HeroImageFormat) || "landscape";
  const heroImage =
    (profile.hero_image_url as string) ||
    (socialAccounts[0] as { profile_image_url?: string } | undefined)?.profile_image_url ||
    null;

  return {
    display_name: (profile.display_name as string) ?? handle,
    avatar_url: (socialAccounts[0] as { profile_image_url?: string } | undefined)?.profile_image_url ?? null,
    hero_image_url: heroImage,
    hero_image_format: heroFormat,
    hero_dominant_color: (profile.hero_dominant_color as string) || null,
    bio_page_theme: (profile.bio_page_theme as string) || "light",
    bio: (profile.bio as string) || null,
    category: null,
    follower_count: null,
    is_verified: false,
    links,
    tabs,
    socialAccounts,
    branch: (profile.branch as string) || null,
    is_verified_veteran: Boolean(profile.is_verified_veteran),
    service_line: (profile.service_line as string) || null,
  };
}

function socialIcon(platform: string, className: string) {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return <Instagram className={className} />;
  if (p.includes("youtube")) return <Youtube className={className} />;
  if (p.includes("facebook")) return <Facebook className={className} />;
  if (p.includes("twitter") || p === "x") return <X className={className} />;
  return <Globe className={className} />;
}

function socialUrl(platform: string, username: string | null): string {
  if (!username) return "#";
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return `https://instagram.com/${username}`;
  if (p.includes("youtube")) return `https://youtube.com/@${username}`;
  if (p.includes("facebook")) return `https://facebook.com/${username}`;
  if (p.includes("twitter") || p === "x") return `https://x.com/${username}`;
  if (p.includes("tiktok")) return `https://tiktok.com/@${username}`;
  if (p.includes("pinterest")) return `https://pinterest.com/${username}`;
  return "#";
}

function linkIcon(icon?: string) {
  const i = (icon || "").toLowerCase();
  if (i === "globe" || i === "link") return <Globe className="h-5 w-5 shrink-0" />;
  if (i === "mic" || i === "podcast") return <Mic className="h-5 w-5 shrink-0" />;
  if (i === "shopping" || i === "shopping-bag" || i === "amazon") return <ShoppingBag className="h-5 w-5 shrink-0" />;
  if (i === "instagram") return <Instagram className="h-5 w-5 shrink-0" />;
  return <ExternalLink className="h-5 w-5 shrink-0" />;
}

export default function CreatorBioPage() {
  const { handle, eventSlug } = useParams<{ handle: string; eventSlug?: string }>();
  const [searchParams] = useSearchParams();
  const [creator, setCreator] = useState<BioCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [consentOpen, setConsentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [poweredByDismissed, setPoweredByDismissed] = useState(false);

  const creatorHandle = (handle ?? "").replace(/^@/, "").trim();

  useEffect(() => {
    if (!creatorHandle) {
      setLoading(false);
      return;
    }
    resolveCreator(creatorHandle).then((data) => {
      setCreator(data);
      if (data?.tabs?.length) setActiveTab(data.tabs[0].type);
      setLoading(false);
    });
  }, [creatorHandle]);

  const fireTracking = useCallback(() => {
    if (!creatorHandle) return () => {};
    const visitorId = getVisitorId();
    const device = getDeviceInfo();
    const referral = typeof document !== "undefined" ? document.referrer || "" : "";
    const utmSource = getUtmSource(typeof location !== "undefined" ? location.search : "");
    const campaignId = getCampaignId(typeof location !== "undefined" ? location.search : "");

    trackPageView({
      visitor_id: visitorId,
      creator_handle: creatorHandle,
      referral_source: referral,
      utm_source: utmSource,
      campaign_id: campaignId || undefined,
      event_slug: eventSlug || undefined,
      device_type: device.device_type,
      browser: device.browser,
      os: device.os,
      screen_resolution: device.screen_resolution,
      language: device.language,
    });
    return initBehavioralTracking(creatorHandle);
  }, [creatorHandle, eventSlug]);

  useEffect(() => {
    if (!creator || !creatorHandle) return;
    const consent = getConsent();
    if (consent === "unknown") {
      setConsentOpen(true);
      return;
    }
    return fireTracking();
  }, [creator, creatorHandle, fireTracking]);

  // Meta tags for SEO and social sharing
  useEffect(() => {
    if (!creator) return;
    const title = `${creator.display_name} | MilCrunch`;
    const desc = creator.bio || `Connect with ${creator.display_name} on MilCrunch.`;
    const ogImage = creator.hero_image_url || creator.avatar_url || "/favicon-32x32.png";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/c/${creatorHandle}`;

    document.title = title;
    const setMeta = (attr: string, value: string, key = "property") => {
      const el = document.querySelector(`meta[${key}="${attr}"]`);
      if (el) el.setAttribute("content", value);
    };
    setMeta("og:title", title);
    setMeta("og:description", desc);
    setMeta("og:image", ogImage.startsWith("http") ? ogImage : `${origin}${ogImage}`);
    setMeta("og:url", url);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", ogImage.startsWith("http") ? ogImage : `${origin}${ogImage}`);
  }, [creator, creatorHandle]);

  const acceptConsent = useCallback(() => {
    setConsent(true);
    setConsentOpen(false);
    fireTracking();
  }, [fireTracking]);

  const denyConsent = useCallback(() => {
    setConsent(false);
    setConsentOpen(false);
    fireTracking();
  }, [fireTracking]);

  const dominantColor = creator?.hero_dominant_color || "#0a1628";
  const bgStyle = useMemo(
    () => ({
      background: `linear-gradient(to bottom, ${dominantColor}40 0%, ${dominantColor}20 50%, #ffffff 100%)`,
    }),
    [dominantColor]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1628] text-white p-6">
        <p className="text-lg">Creator not found.</p>
        <Link to="/" className="mt-4 text-[#F0A71F] hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  const isLandscape = creator.hero_image_format === "landscape";
  const isPortrait = creator.hero_image_format === "portrait";
  const isSquare = creator.hero_image_format === "square";
  const heroSrc = creator.hero_image_url || creator.avatar_url;

  return (
    <div className="min-h-screen" style={bgStyle}>
      {/* Cookie consent */}
      {consentOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/90 border-t border-white/10">
          <div className="max-w-lg mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-sm text-white/90 flex-1">
              We use cookies to give this creator insights into their audience. No personal data is stored without your
              consent. <a href="/privacy" className="text-[#F0A71F] hover:underline">Privacy</a>
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={denyConsent}
                className="px-4 py-2 rounded-lg border border-white/30 text-white/90 hover:bg-white/10"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={acceptConsent}
                className="px-4 py-2 rounded-lg bg-[#F0A71F] text-[#0a1628] font-medium hover:bg-[#e09a18]"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: centered card; mobile: full width */}
      <div className="md:max-w-[480px] md:mx-auto md:mt-8 md:mb-8 md:rounded-2xl md:overflow-hidden md:shadow-xl">
        {/* --- LANDSCAPE: full-bleed hero --- */}
        {isLandscape && (
          <div className="relative w-full">
            {/* Hero: full width, no padding on mobile */}
            <div className="w-full overflow-hidden md:rounded-t-2xl">
              {heroSrc ? (
                <img
                  src={heroSrc}
                  alt={creator.display_name}
                  className="w-full aspect-[4/3] md:aspect-[3/2] object-cover block"
                />
              ) : (
                <div
                  className="w-full aspect-[4/3] md:aspect-[3/2] bg-[#0a1628] flex items-center justify-center text-white text-4xl font-light"
                  style={{ letterSpacing: "0.15em" }}
                >
                  {getInitials(creator.display_name, creatorHandle)}
                </div>
              )}
              {/* Gradient overlay + name on image (landscape) */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"
                style={{ top: "30%" }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 p-4 pb-6 text-white"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
              >
                <h1
                  className="text-xl md:text-2xl font-light tracking-[0.15em] uppercase text-center"
                  style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                >
                  {creator.display_name}
                </h1>
                {(creator.branch || creator.is_verified_veteran) && (
                  <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                    {creator.branch && (
                      <span className="text-xs uppercase tracking-wider opacity-90">
                        {BRANCH_LABELS[creator.branch] || creator.branch}
                      </span>
                    )}
                    {creator.is_verified_veteran && (
                      <ShieldCheck className="h-4 w-4 text-[#F0A71F]" aria-label="Verified Veteran" />
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Name below hero (alternative when no overlay) - hidden when we use overlay */}
            <div className="px-4 py-3 bg-white/95 md:bg-white text-center border-b border-gray-100 md:hidden">
              <p className="text-sm text-gray-500">@{creatorHandle}</p>
            </div>
          </div>
        )}

        {/* --- PORTRAIT / SQUARE: white card with image --- */}
        {(isPortrait || isSquare) && (
          <div className="bg-white rounded-t-2xl md:rounded-t-2xl shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 flex flex-col items-center">
              <div
                className={
                  isPortrait
                    ? "w-32 md:w-40 aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0"
                    : "w-40 md:w-48 aspect-square rounded-xl overflow-hidden bg-gray-100 flex-shrink-0"
                }
              >
                {heroSrc ? (
                  <img
                    src={heroSrc}
                    alt={creator.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-gray-400">
                    {getInitials(creator.display_name, creatorHandle)}
                  </div>
                )}
              </div>
              <h1 className="mt-4 text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">
                {creator.display_name}
                {creator.is_verified && (
                  <ShieldCheck className="inline-block h-5 w-5 ml-1 text-[#F0A71F]" aria-label="Verified" />
                )}
                {creator.is_verified_veteran && !creator.is_verified && (
                  <ShieldCheck className="inline-block h-5 w-5 ml-1 text-[#F0A71F]" aria-label="Verified Veteran" />
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">@{creatorHandle}</p>
              {creator.service_line && (
                <p className="text-xs text-gray-500 mt-1">{creator.service_line}</p>
              )}
            </div>
          </div>
        )}

        {/* Social icons row (below name for portrait/square; below hero block for landscape) */}
        <div className="bg-white px-4 py-3 flex items-center justify-center gap-4 border-b border-gray-100">
          {creator.socialAccounts.length > 0 ? (
            creator.socialAccounts.map((acc) => (
              <a
                key={acc.platform}
                href={socialUrl(acc.platform, acc.platform_username)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  acc.platform_username &&
                  trackBioLinkClick(
                    creatorHandle,
                    socialUrl(acc.platform, acc.platform_username),
                    acc.platform
                  )
                }
                className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label={acc.platform}
              >
                {socialIcon(acc.platform, "h-5 w-5")}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" aria-label="Verified" />
              </a>
            ))
          ) : (
            creator.links.slice(0, 4).map((link, i) =>
              link.url.startsWith("http") ? (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackBioLinkClick(creatorHandle, link.url, link.label)}
                  className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
                  aria-label={link.label}
                >
                  {linkIcon(link.icon)}
                </a>
              ) : null
            )
          )}
        </div>

        {/* Bio text */}
        {creator.bio && (
          <div className="bg-white px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-600 text-center max-w-md mx-auto">{creator.bio}</p>
          </div>
        )}

        {/* Tabs (scrollable pills) */}
        {creator.tabs.length > 0 && (
          <div className="bg-white border-b border-gray-100 overflow-x-auto no-scrollbar">
            <div className="flex gap-1 p-2 min-w-0">
              {creator.tabs.map((tab) => (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setActiveTab(tab.type)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === tab.type
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="bg-white px-4 py-6 pb-8">
          {(!activeTab || activeTab === "links") && (
            <div className="space-y-3">
              {creator.links.map((link, i) => (
                <a
                  key={`${link.label}-${i}`}
                  href={link.url.startsWith("http") ? link.url : undefined}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                  onClick={() => {
                    if (link.url.startsWith("http")) trackBioLinkClick(creatorHandle, link.url, link.label);
                  }}
                  className="flex items-center gap-3 w-full py-3.5 px-4 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
                >
                  {linkIcon(link.icon)}
                  <span className="flex-1 truncate">{link.label}</span>
                  {link.url.startsWith("http") && <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />}
                </a>
              ))}
              {creator.links.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No links yet.</p>
              )}
            </div>
          )}
          {activeTab === "events" && (
            <div className="text-sm text-gray-500 text-center py-6">
              Events section — coming soon. Events you&apos;re attending will appear here.
            </div>
          )}
          {activeTab === "content" && (
            <div className="text-sm text-gray-500 text-center py-6">
              Content — recent posts from your connected platforms will appear here.
            </div>
          )}
          {activeTab === "shop" && (
            <div className="text-sm text-gray-500 text-center py-6">
              Shop — affiliate and product links will appear here.
            </div>
          )}
          {activeTab === "about" && (
            <div className="prose prose-sm max-w-none text-gray-600">
              {creator.bio ? <p>{creator.bio}</p> : <p className="text-gray-500">No about section yet.</p>}
              {creator.service_line && <p className="text-sm mt-2">{creator.service_line}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Powered by MilCrunch bar (dismissible) */}
      {!poweredByDismissed && (
        <div className="sticky bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 py-2 px-4 bg-white/90 backdrop-blur border-t border-gray-200 md:max-w-[480px] md:mx-auto md:rounded-b-2xl md:mb-8">
          <span className="text-xs text-gray-500">Powered by MilCrunch</span>
          <button
            type="button"
            onClick={() => setPoweredByDismissed(true)}
            className="text-xs text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {eventSlug && (
        <div className="max-w-md mx-auto px-4 py-4 text-center">
          <div className="p-4 rounded-xl bg-white/80 border border-gray-200">
            <p className="text-gray-700 text-sm">Event: {eventSlug}</p>
            <Link to="/events" className="text-[#F0A71F] text-sm mt-2 inline-block hover:underline">
              View events
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
