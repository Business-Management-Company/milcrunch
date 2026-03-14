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
  Globe,
  Mic,
  ShoppingBag,
} from "lucide-react";
import { PlatformIcon } from "@/lib/platform-icons";

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

/** Resolve creator by handle: creator_profiles → directory_members → resolve-handle API. */
async function resolveCreator(handle: string): Promise<BioCreator | null> {
  const h = handle.replace(/^@/, "").trim().toLowerCase();
  if (!h) return null;

  // 1. Try creator_profiles table (registered creators with handle)
  try {
    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("handle", h)
      .single();

    if (cp) {
      const cl = normalizeCustomLinks((cp as any).custom_links);
      const socials: SocialAccount[] = Array.isArray((cp as any).social_accounts) ? (cp as any).social_accounts : [];
      return {
        display_name: (cp as any).display_name || (cp as any).full_name || handle,
        avatar_url: (cp as any).avatar_url || null,
        hero_image_url: (cp as any).hero_image_url || null,
        hero_image_format: ((cp as any).hero_image_format || "landscape") as HeroImageFormat,
        hero_dominant_color: (cp as any).hero_dominant_color || null,
        bio_page_theme: (cp as any).bio_page_theme || "light",
        bio: (cp as any).bio || null,
        category: (cp as any).category || null,
        follower_count: (cp as any).follower_count ?? null,
        is_verified: !!(cp as any).is_verified,
        links: cl.links,
        tabs: cl.tabs.length > 0 ? cl.tabs : DEFAULT_TABS.filter((t) => t.visible).sort((a, b) => a.order - b.order),
        socialAccounts: socials,
        branch: (cp as any).military_branch || (cp as any).branch || null,
        is_verified_veteran: !!(cp as any).is_verified_veteran,
        service_line: (cp as any).service_line || null,
      };
    }
  } catch (err) {
    // Table may not exist yet or RLS blocks — fall through to other methods
    console.warn("[resolveCreator] creator_profiles lookup failed:", err);
  }

  // 2. Try directory_members / featured creators
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

  // 3. Try directory_members by creator_handle
  const { data: profile } = await supabase
    .from("directory_members")
    .select("creator_name, bio, creator_handle, platform, avatar_url, branch")
    .ilike("creator_handle", h)
    .limit(1)
    .maybeSingle();

  if (profile) {
    return {
      display_name: (profile.creator_name as string) ?? handle,
      avatar_url: (profile.avatar_url as string) ?? null,
      hero_image_url: (profile.avatar_url as string) ?? null,
      hero_image_format: "landscape" as HeroImageFormat,
      hero_dominant_color: null,
      bio_page_theme: "light",
      bio: (profile.bio as string) || null,
      category: null,
      follower_count: null,
      is_verified: false,
      links: [],
      tabs: DEFAULT_TABS.filter((t) => t.visible).sort((a, b) => a.order - b.order),
      socialAccounts: [],
      branch: (profile.branch as string) || null,
      is_verified_veteran: false,
      service_line: null,
    };
  }

  // 4. Try auth user_metadata via serverless API (handles set during onboarding)
  try {
    const res = await fetch(`/api/resolve-handle?handle=${encodeURIComponent(h)}`);
    if (res.ok) {
      const data = await res.json();
      const cl = normalizeCustomLinks(data.custom_links);
      return {
        display_name: data.display_name || handle,
        avatar_url: data.avatar_url || null,
        hero_image_url: data.hero_image_url || null,
        hero_image_format: (data.hero_image_format || "landscape") as HeroImageFormat,
        hero_dominant_color: data.hero_dominant_color || null,
        bio_page_theme: data.bio_page_theme || "light",
        bio: data.bio || null,
        category: data.category || null,
        follower_count: null,
        is_verified: false,
        links: cl.links,
        tabs: cl.tabs.length > 0 ? cl.tabs : DEFAULT_TABS.filter((t) => t.visible).sort((a, b) => a.order - b.order),
        socialAccounts: Array.isArray(data.social_accounts) ? data.social_accounts : [],
        branch: data.branch || null,
        is_verified_veteran: !!data.is_verified_veteran,
        service_line: data.service_line || null,
      };
    }
  } catch (err) {
    console.error("[resolveCreator] resolve-handle API error:", err);
  }

  return null;
}

function socialIcon(platform: string, _className: string) {
  return <PlatformIcon platform={platform} size={20} />;
}

function socialUrl(platform: string, username: string | null): string {
  if (!username) return "#";
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return `https://instagram.com/${username}`;
  if (p.includes("youtube")) return `https://youtube.com/@${username}`;
  if (p.includes("facebook")) return `https://facebook.com/${username}`;
  if (p.includes("linkedin")) return username.startsWith("http") ? username : `https://linkedin.com/in/${username}`;
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
    const url = `${origin}/${creatorHandle}`;

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

  // Map legacy "square" to "portrait"
  const fmt = creator.hero_image_format === "square" ? "portrait" : creator.hero_image_format;
  const isPortrait = fmt === "portrait";
  const isLandscape = fmt === "landscape";
  const isFullBlend = fmt === "full_blend";
  const heroSrc = creator.hero_image_url || creator.avatar_url;
  const profileSrc = creator.avatar_url || creator.hero_image_url;

  /* ---- Shared rendering blocks (used in both mobile & tablet/desktop layouts) ---- */
  const tabPills = creator.tabs.length > 0
    ? creator.tabs.map((tab) => (
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
      ))
    : null;

  const tabContent = (
    <>
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
    </>
  );

  const renderSocialRow = (iconSize: number) =>
    creator.socialAccounts.length > 0 ? (
      creator.socialAccounts.map((acc) => (
        <a
          key={acc.platform}
          href={socialUrl(acc.platform, acc.platform_username)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            acc.platform_username &&
            trackBioLinkClick(creatorHandle, socialUrl(acc.platform, acc.platform_username), acc.platform)
          }
          className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          aria-label={acc.platform}
        >
          <PlatformIcon platform={acc.platform} size={iconSize} />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
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
    );

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
              <button type="button" onClick={denyConsent} className="px-4 py-2 rounded-lg border border-white/30 text-white/90 hover:bg-white/10">
                Essential only
              </button>
              <button type="button" onClick={acceptConsent} className="px-4 py-2 rounded-lg bg-[#F0A71F] text-[#0a1628] font-medium hover:bg-[#e09a18]">
                Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOBILE LAYOUT (< 768px) ===== */}
      <div className="md:hidden">
        {/* --- PORTRAIT: hero cover + circular avatar overlap --- */}
        {isPortrait && (
          <div className="relative w-full">
            <div className="w-full overflow-hidden" style={{ height: 180 }}>
              {heroSrc ? (
                <img src={heroSrc} alt="" className="w-full h-full object-cover block" />
              ) : (
                <div className="w-full h-full bg-[#0a1628]" />
              )}
            </div>
            {/* Circular avatar overlap */}
            <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: 180 - 48 }}>
              <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-gray-100 shadow-md">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-semibold bg-[#0a1628] text-white">{getInitials(creator.display_name, creatorHandle)}</div>
                )}
              </div>
            </div>
            <div className="bg-white pt-14 pb-2 text-center">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                {creator.display_name}
                {(creator.is_verified || creator.is_verified_veteran) && <ShieldCheck className="inline-block h-5 w-5 ml-1 text-[#F0A71F]" />}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">@{creatorHandle}</p>
              {creator.branch && (
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 uppercase tracking-wider">{BRANCH_LABELS[creator.branch] || creator.branch}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- LANDSCAPE: wide profile image crop (16:5), name/socials below --- */}
        {isLandscape && (
          <div className="w-full">
            <div className="w-full overflow-hidden">
              {profileSrc ? (
                <img src={profileSrc} alt={creator.display_name} className="w-full object-cover block" style={{ aspectRatio: "16/5" }} />
              ) : (
                <div className="w-full bg-[#0a1628] flex items-center justify-center text-white text-4xl font-light" style={{ aspectRatio: "16/5", letterSpacing: "0.15em" }}>
                  {getInitials(creator.display_name, creatorHandle)}
                </div>
              )}
            </div>
            <div className="bg-white px-4 py-4 text-center">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                {creator.display_name}
                {(creator.is_verified || creator.is_verified_veteran) && <ShieldCheck className="inline-block h-5 w-5 ml-1 text-[#F0A71F]" />}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">@{creatorHandle}</p>
              {creator.branch && (
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 uppercase tracking-wider">{BRANCH_LABELS[creator.branch] || creator.branch}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- FULL BLEND: profile image fills background, radial vignette, white text --- */}
        {isFullBlend && (
          <div className="relative w-full overflow-hidden" style={{ minHeight: 320 }}>
            {profileSrc ? (
              <img src={profileSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[#0a1628]" />
            )}
            {/* Radial vignette: clear center, edges fade to white */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, rgba(255,255,255,0.85) 100%)" }} />
            {/* Content centered over image */}
            <div className="relative z-10 flex flex-col items-center justify-center py-16 px-4" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>
              <h1 className="text-2xl font-bold text-white tracking-tight text-center">
                {creator.display_name}
                {(creator.is_verified || creator.is_verified_veteran) && <ShieldCheck className="inline-block h-5 w-5 ml-1.5 text-[#F0A71F]" />}
              </h1>
              <p className="text-sm text-white/80 mt-0.5">@{creatorHandle}</p>
              {creator.branch && (
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white uppercase tracking-wider backdrop-blur-sm">{BRANCH_LABELS[creator.branch] || creator.branch}</span>
                </div>
              )}
              {/* Social icons inline */}
              <div className="flex items-center justify-center gap-3 mt-3">
                {creator.socialAccounts.length > 0
                  ? creator.socialAccounts.map((acc) => (
                      <a key={acc.platform} href={socialUrl(acc.platform, acc.platform_username)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full text-white/90 hover:text-white transition-colors" aria-label={acc.platform}>
                        <PlatformIcon platform={acc.platform} size={20} />
                      </a>
                    ))
                  : null}
              </div>
            </div>
          </div>
        )}

        {/* Social icons (portrait & landscape only — full_blend has them inline) */}
        {!isFullBlend && (
          <div className="bg-white px-4 py-3 flex items-center justify-center gap-4 border-b border-gray-100">
            {renderSocialRow(20)}
          </div>
        )}

        {/* Bio */}
        {creator.bio && (
          <div className="bg-white px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-600 text-center max-w-md mx-auto">{creator.bio}</p>
          </div>
        )}

        {/* Tabs */}
        {tabPills && (
          <div className="bg-white border-b border-gray-100 overflow-x-auto no-scrollbar">
            <div className="flex gap-1 p-2 min-w-0">{tabPills}</div>
          </div>
        )}

        {/* Tab content */}
        <div className="bg-white px-4 py-6 pb-8">{tabContent}</div>
      </div>

      {/* ===== TABLET + DESKTOP LAYOUT (>= 768px) ===== */}
      <div className="hidden md:block">
        <div className="md:max-w-[600px] lg:max-w-[960px] mx-auto mt-8 mb-8 rounded-2xl overflow-hidden shadow-xl bg-white">

          {/* --- PORTRAIT header: cover + avatar overlap --- */}
          {isPortrait && (
            <>
              <div className="relative w-full md:h-[200px] lg:h-[240px] overflow-hidden">
                {heroSrc ? (
                  <img src={heroSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#0a1628]" />
                )}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 lg:left-8 lg:translate-x-0 z-10">
                  <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-gray-100 shadow-md">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-semibold bg-[#0a1628] text-white">{getInitials(creator.display_name, creatorHandle)}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-14" />
            </>
          )}

          {/* --- LANDSCAPE header: wide profile image crop (16:5) --- */}
          {isLandscape && (
            <div className="w-full overflow-hidden">
              {profileSrc ? (
                <img src={profileSrc} alt={creator.display_name} className="w-full object-cover" style={{ aspectRatio: "16/5" }} />
              ) : (
                <div className="w-full bg-[#0a1628] flex items-center justify-center text-white text-4xl font-light" style={{ aspectRatio: "16/5", letterSpacing: "0.15em" }}>
                  {getInitials(creator.display_name, creatorHandle)}
                </div>
              )}
            </div>
          )}

          {/* --- FULL BLEND header: profile image fills area, radial vignette --- */}
          {isFullBlend && (
            <div className="relative w-full overflow-hidden" style={{ minHeight: 300 }}>
              {profileSrc ? (
                <img src={profileSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-[#0a1628]" />
              )}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, rgba(255,255,255,0.85) 100%)" }} />
              <div className="relative z-10 flex flex-col items-center justify-center py-16 px-8" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>
                <h1 className="text-3xl font-bold text-white tracking-tight text-center">
                  {creator.display_name}
                  {(creator.is_verified || creator.is_verified_veteran) && <ShieldCheck className="inline-block h-6 w-6 ml-2 text-[#F0A71F]" />}
                </h1>
                <p className="text-sm text-white/80 mt-1">@{creatorHandle}</p>
                {creator.branch && (
                  <span className="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-white/20 text-white uppercase tracking-wider backdrop-blur-sm">{BRANCH_LABELS[creator.branch] || creator.branch}</span>
                )}
                <div className="flex items-center justify-center gap-3 mt-3">
                  {creator.socialAccounts.map((acc) => (
                    <a key={acc.platform} href={socialUrl(acc.platform, acc.platform_username)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full text-white/90 hover:text-white transition-colors" aria-label={acc.platform}>
                      <PlatformIcon platform={acc.platform} size={24} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Two columns on desktop, single column on tablet (portrait & landscape only) */}
          {!isFullBlend ? (
            <div className="lg:flex">
              {/* Profile info sidebar */}
              <div className="lg:w-[280px] lg:shrink-0 lg:border-r lg:border-[#E5E7EB] px-8 lg:px-6 pb-4 lg:pb-6 lg:sticky lg:top-0 lg:self-start text-center lg:text-left">
                <h1 className="text-2xl lg:text-[28px] font-semibold lg:font-bold text-gray-900 leading-tight">
                  {creator.display_name}
                  {(creator.is_verified || creator.is_verified_veteran) && <ShieldCheck className="inline-block h-5 w-5 ml-1.5 text-[#F0A71F]" />}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">@{creatorHandle}</p>
                {creator.service_line && <p className="text-xs text-gray-500 mt-1">{creator.service_line}</p>}
                {creator.branch && (
                  <div className="flex items-center justify-center lg:justify-start gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 uppercase tracking-wider">{BRANCH_LABELS[creator.branch] || creator.branch}</span>
                  </div>
                )}
                {creator.bio && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{creator.bio}</p>}
                <div className="flex items-center justify-center lg:justify-start gap-3 mt-4 flex-wrap">
                  <span className="contents lg:hidden">{renderSocialRow(32)}</span>
                  <span className="hidden lg:contents">{renderSocialRow(20)}</span>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 min-w-0">
                <div className="lg:hidden border-b border-gray-100 mx-8 mt-2" />

              {/* Tabs */}
              {tabPills && (
                <div className="border-b border-gray-100 overflow-x-auto no-scrollbar">
                  <div className="flex gap-1 p-3 px-8 lg:px-4 min-w-0">{tabPills}</div>
                </div>
              )}

              {/* Tab content */}
              <div className="px-8 lg:px-6 py-6 pb-8">{tabContent}</div>
            </div>
          </div>
          ) : (
            /* Full Blend: single column content below the hero */
            <div>
              {creator.bio && (
                <div className="px-8 py-3 border-b border-gray-100">
                  <p className="text-sm text-gray-600 text-center max-w-md mx-auto">{creator.bio}</p>
                </div>
              )}
              {tabPills && (
                <div className="border-b border-gray-100 overflow-x-auto no-scrollbar">
                  <div className="flex gap-1 p-3 px-8 min-w-0">{tabPills}</div>
                </div>
              )}
              <div className="px-8 py-6 pb-8">{tabContent}</div>
            </div>
          )}
        </div>
      </div>

      {/* Powered by MilCrunch bar */}
      {!poweredByDismissed && (
        <div className="sticky bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 py-2 px-4 bg-white/90 backdrop-blur border-t border-gray-200 md:max-w-[600px] lg:max-w-[960px] md:mx-auto md:rounded-b-2xl md:mb-8">
          <span className="text-xs text-gray-500">Powered by MilCrunch</span>
          <button type="button" onClick={() => setPoweredByDismissed(true)} className="text-xs text-gray-400 hover:text-gray-600" aria-label="Dismiss">
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
