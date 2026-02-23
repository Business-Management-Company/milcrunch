import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ShieldCheck,
  Instagram,
  Youtube,
  Twitter,
  ArrowLeft,
  Users,
  TrendingUp,
  Eye,
  LayoutGrid,
  UserPlus,
  UserCheck,
  Loader2,
  Heart,
  MessageCircle,
  Calendar,
  MapPin,
  Mail,
  ExternalLink,
  Image,
  Hash,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import { useAuth } from "@/contexts/AuthContext";
import { useLists } from "@/contexts/ListContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchDirectoryMemberByHandle,
  formatFollowerCount,
  getInitials,
  extractAvatarFromEnrichment,
  extractBannerImage,
  fetchBannerFromPosts,
  approveForDirectory,
  detectBranch,
  type ShowcaseCreator,
} from "@/lib/featured-creators";
import { cn, safeImageUrl, creatorAvatarUrl } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const TikTokIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const BRANCH_BANNER: Record<string, string> = {
  Army: "bg-gradient-to-br from-[#2D5016] to-[#1A3009]",
  Navy: "bg-gradient-to-br from-[#1B3A6B] to-[#0F2240]",
  "Air Force": "bg-gradient-to-br from-[#4A90D9] to-[#2E6AB0]",
  Marines: "bg-gradient-to-br from-[#8B0000] to-[#5C0000]",
  "Coast Guard": "bg-gradient-to-br from-[#FF6B00] to-[#CC5500]",
  "Space Force": "bg-gradient-to-br from-[#1C1C3A] to-[#0E0E1F]",
};
const DEFAULT_BANNER = "bg-gradient-to-br from-[#6B46C1] to-[#553C9A]";

const BRANCH_STYLES: Record<string, string> = {
  Army: "bg-green-700 text-white",
  Navy: "bg-blue-800 text-white",
  "Air Force": "bg-blue-600 text-white",
  Marines: "bg-red-700 text-white",
  "Coast Guard": "bg-orange-600 text-white",
  "Space Force": "bg-indigo-600 text-white",
};

const PLATFORM_URLS: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  twitter: (h) => `https://x.com/${h}`,
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  tiktok: <TikTokIcon className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X / Twitter",
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PostItem {
  id: string;
  thumbnail?: string;
  caption?: string;
  likes: number;
  comments: number;
  date?: string;
  permalink?: string;
}

interface EventRow {
  id: string;
  title: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
}

/* ------------------------------------------------------------------ */
/* Enrichment Extraction Helpers                                       */
/* ------------------------------------------------------------------ */

function extractEmailFromEnrichment(enrichData: unknown): string | null {
  if (!enrichData || typeof enrichData !== "object") return null;
  const data = enrichData as Record<string, unknown>;
  const result = data.result as Record<string, unknown> | undefined;
  if (result?.email && typeof result.email === "string") return result.email as string;
  const ig = data.instagram as Record<string, unknown> | undefined;
  if (ig?.email && typeof ig.email === "string") return ig.email as string;
  if (data.email && typeof data.email === "string") return data.email as string;
  return null;
}

function extractPosts(enrichData: unknown): PostItem[] {
  if (!enrichData || typeof enrichData !== "object") return [];
  const data = enrichData as Record<string, unknown>;
  const ig = data.instagram as Record<string, unknown> | undefined;
  const raw = ig?.post_data;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).map((item: Record<string, unknown>, i: number) => {
    const media = item.media as unknown[] | undefined;
    const firstMedia =
      Array.isArray(media) && media[0] && typeof media[0] === "object"
        ? (media[0] as Record<string, unknown>)
        : undefined;
    const engagement = item.engagement as Record<string, unknown> | undefined;
    return {
      id: String(item.post_id ?? item.id ?? i),
      thumbnail: (firstMedia?.url ?? item.thumbnail ?? item.image_url) as string | undefined,
      caption: (item.caption as string) ?? undefined,
      likes: Number(engagement?.likes ?? item.likes ?? item.like_count ?? 0),
      comments: Number(engagement?.comments ?? item.comments ?? item.comment_count ?? 0),
      date: (item.created_at as string) ?? undefined,
      permalink: (item.post_url as string) ?? undefined,
    };
  });
}

function extractOtherLinks(enrichData: unknown): { label: string; url: string }[] {
  if (!enrichData || typeof enrichData !== "object") return [];
  const data = enrichData as Record<string, unknown>;
  const result = data.result as Record<string, unknown> | undefined;
  const raw = result?.other_links;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item: Record<string, unknown>) => ({
      label: (item.label as string) || (item.title as string) || (item.url as string) || "Link",
      url: (item.url as string) || (item.link as string) || "#",
    }))
    .filter((l) => l.url !== "#");
}

function extractHashtags(enrichData: unknown): string[] {
  if (!enrichData || typeof enrichData !== "object") return [];
  const data = enrichData as Record<string, unknown>;
  const ig = data.instagram as Record<string, unknown> | undefined;
  const raw = ig?.hashtags ?? ig?.frequently_used_hashtags;
  if (Array.isArray(raw)) return raw.filter((h) => typeof h === "string").slice(0, 10) as string[];
  return [];
}

/* ------------------------------------------------------------------ */
/* Skeleton Loader                                                     */
/* ------------------------------------------------------------------ */

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-20 pb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Banner skeleton */}
          <div className="h-36 md:h-52 bg-gray-200 animate-pulse" />
          {/* Avatar skeleton */}
          <div className="-mt-10 md:-mt-12 ml-4 md:ml-8">
            <div className="w-20 h-20 md:w-[100px] md:h-[100px] rounded-full bg-gray-300 animate-pulse border-4 border-white" />
          </div>
          <div className="p-4 md:p-6 pt-3 space-y-3">
            <div className="h-7 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-32 bg-gray-100 animate-pulse rounded" />
            <div className="flex gap-2 mt-3">
              <div className="h-6 w-16 bg-gray-100 animate-pulse rounded-full" />
              <div className="h-6 w-6 bg-gray-100 animate-pulse rounded-full" />
            </div>
            <div className="h-12 w-full bg-gray-100 animate-pulse rounded mt-4" />
            {/* Stats skeleton */}
            <div className="grid grid-cols-2 md:flex gap-3 md:gap-8 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center space-y-1">
                  <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mx-auto" />
                  <div className="h-3 w-12 bg-gray-100 animate-pulse rounded mx-auto" />
                </div>
              ))}
            </div>
            {/* Tab bar skeleton */}
            <div className="flex gap-6 mt-6 border-b border-gray-200 pb-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 w-16 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function CreatorPublicProfile() {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
  const { lists, addCreatorToList, createList } = useLists();
  const navigate = useNavigate();

  // Core state
  const [creator, setCreator] = useState<ShowcaseCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);

  // UI state
  const [bioExpanded, setBioExpanded] = useState(false);

  // Events state
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsFetched, setEventsFetched] = useState(false);
  const [hasUpcomingEvents, setHasUpcomingEvents] = useState(false);

  // Image fallback
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Banner image
  const [bannerFailed, setBannerFailed] = useState(false);
  const [resolvedBanner, setResolvedBanner] = useState<string | null>(null);

  // Action bar state
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [addingToDirectory, setAddingToDirectory] = useState(false);

  /* ---- Action bar handlers ---- */
  const creatorAsListItem = useCallback((): ListCreator | null => {
    if (!creator) return null;
    return {
      id: creator.id ?? creator.handle,
      name: creator.display_name ?? creator.handle,
      username: creator.handle,
      avatar: creatorAvatarUrl(creator) ?? "",
      followers: creator.follower_count ?? 0,
      engagementRate: creator.engagement_rate ? Number((creator.engagement_rate * 100).toFixed(2)) : 0,
      platforms: creator.platforms ?? [creator.platform ?? "instagram"],
      bio: creator.bio ?? "",
    };
  }, [creator]);

  const handleAddToList = (listId: string) => {
    const item = creatorAsListItem();
    if (!item) return;
    addCreatorToList(listId, item);
    const listName = lists.find((l) => l.id === listId)?.name ?? "list";
    toast.success(`Added to ${listName}`);
    setListPickerOpen(false);
  };

  const handleCreateAndAdd = () => {
    const item = creatorAsListItem();
    if (!item) return;
    const name = creator?.display_name ? `${creator.display_name} list` : "New List";
    const id = createList(name);
    addCreatorToList(id, item);
    toast.success(`Created "${name}" and added creator`);
    setListPickerOpen(false);
  };

  const handleAddToDirectory = async () => {
    if (!creator) return;
    setAddingToDirectory(true);
    const branch = detectBranch(creator.bio ?? "");
    const { error } = await approveForDirectory({
      handle: creator.handle,
      display_name: creator.display_name ?? creator.handle,
      platform: creator.platform ?? "instagram",
      avatar_url: creatorAvatarUrl(creator) ?? null,
      follower_count: creator.follower_count ?? null,
      engagement_rate: creator.engagement_rate ?? null,
      bio: creator.bio ?? null,
      branch,
      status: "veteran",
      platforms: creator.platforms ?? [creator.platform ?? "instagram"],
      category: creator.category ?? null,
      ic_avatar_url: creatorAvatarUrl(creator) ?? null,
    });
    setAddingToDirectory(false);
    if (error) {
      if (error.toLowerCase().includes("duplicate") || error.toLowerCase().includes("unique")) {
        toast.info("Already in Directory");
      } else {
        toast.error(`Failed: ${error}`);
      }
    } else {
      toast.success("Added to Directory");
    }
  };

  /* ---- Fetch creator ---- */
  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    fetchDirectoryMemberByHandle(handle).then((data) => {
      if (data) {
        setCreator(data);
        document.title = `${data.display_name} | Military Creator | MilCrunch`;
      } else {
        setNotFound(true);
        document.title = "Creator Not Found | MilCrunch";
      }
      setLoading(false);
    });
    return () => {
      document.title = "MilCrunch";
    };
  }, [handle]);

  /* ---- Image fallback ---- */
  const enrichAvatar = creator ? extractAvatarFromEnrichment(creator.enrichment_data) : null;
  const imgSrc = creator ? creatorAvatarUrl(creator.ic_avatar_url, creator.avatar_url, enrichAvatar, (creator as Record<string, unknown>).profile_image_url as string) : null;

  // Reset error/loaded state when creator changes
  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [creator]);

  // 3-second timeout
  useEffect(() => {
    if (!imgSrc || imgLoaded || imgError) return;
    const timer = setTimeout(() => {
      if (!imgLoaded) setImgError(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [imgSrc, imgLoaded, imgError]);

  /* ---- Parse enrichment data ---- */
  const enrichment = useMemo(() => {
    const data = creator?.enrichment_data;
    return {
      bannerImage: extractBannerImage(data),
      email: extractEmailFromEnrichment(data),
      posts: extractPosts(data),
      otherLinks: extractOtherLinks(data),
      hashtags: extractHashtags(data),
    };
  }, [creator?.enrichment_data]);

  /* ---- Resolve banner image ---- */
  const resolveBanner = useCallback(async () => {
    if (!creator) return;
    // 1. Already have a stored banner URL
    if (creator.banner_image_url) {
      setResolvedBanner(creator.banner_image_url);
      return;
    }
    // 2. Extracted from enrichment data
    if (enrichment.bannerImage) {
      setResolvedBanner(enrichment.bannerImage);
      // Persist so future loads skip the API call
      if (creator.id) {
        supabase
          .from("directory_members")
          .update({ banner_image_url: enrichment.bannerImage })
          .eq("id", creator.id)
          .then(() => {});
      }
      return;
    }
    // 3. Fetch from IC API
    const handle = creator.handle;
    const platform = creator.platform || "instagram";
    const fetched = await fetchBannerFromPosts(handle, platform);
    if (fetched) {
      setResolvedBanner(fetched);
      // Persist
      if (creator.id) {
        supabase
          .from("directory_members")
          .update({ banner_image_url: fetched })
          .eq("id", creator.id)
          .then(() => {});
      }
    }
  }, [creator, enrichment.bannerImage]);

  useEffect(() => {
    resolveBanner();
  }, [resolveBanner]);

  /* ---- Check upcoming events badge ---- */
  useEffect(() => {
    if (!enrichment.email) return;
    const email = enrichment.email;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: regs } = await (supabase as any)
          .from("event_registrations")
          .select("event_id")
          .ilike("email", email)
          .eq("status", "confirmed");
        if (!regs || regs.length === 0) return;
        const ids = regs.map((r: { event_id: string }) => r.event_id);
        const { count } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .in("id", ids)
          .gte("start_date", new Date().toISOString())
          .eq("is_published", true);
        if ((count ?? 0) > 0) setHasUpcomingEvents(true);
      } catch {
        /* silently fail */
      }
    })();
  }, [enrichment.email]);

  /* ---- Fetch events for tab ---- */
  const fetchEvents = async (email: string) => {
    setEventsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: regs } = await (supabase as any)
        .from("event_registrations")
        .select("event_id")
        .ilike("email", email)
        .eq("status", "confirmed");
      if (!regs || regs.length === 0) {
        setEvents([]);
        setEventsLoading(false);
        setEventsFetched(true);
        return;
      }
      const ids = [...new Set(regs.map((r: { event_id: string }) => r.event_id))];
      const { data: evts } = await supabase
        .from("events")
        .select("id, title, slug, start_date, end_date, venue, city, state, cover_image_url")
        .in("id", ids)
        .eq("is_published", true)
        .order("start_date", { ascending: true });
      setEvents((evts ?? []) as EventRow[]);
    } catch {
      setEvents([]);
    }
    setEventsLoading(false);
    setEventsFetched(true);
  };

  const handleTabChange = (value: string) => {
    if (value === "events" && !eventsFetched && enrichment.email) {
      fetchEvents(enrichment.email);
    }
  };

  /* ---- Follow toggle ---- */
  const handleFollowClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setFollowing((prev) => !prev);
  };

  /* ---- Platform URL builder ---- */
  const getPlatformUrl = (platform: string): string => {
    const ed = creator?.enrichment_data as Record<string, unknown> | undefined;
    if (ed) {
      const urls = ed.platform_urls as Record<string, string> | undefined;
      if (urls?.[platform]) return urls[platform];
    }
    if (creator?.platform_urls?.[platform]) return creator.platform_urls[platform];
    const builder = PLATFORM_URLS[platform];
    return builder ? builder(creator?.handle ?? "") : "#";
  };

  /* ---- Loading state ---- */
  if (loading) return <ProfileSkeleton />;

  /* ---- Not found ---- */
  if (notFound || !creator) {
    return (
      <div className="min-h-screen bg-white text-[#1A1A2E]">
        <PublicNav />
        <div className="flex flex-col items-center justify-center py-32 pt-28 px-4">
          <h1 className="text-3xl font-bold mb-4">Creator Not Found</h1>
          <p className="text-[#6B7280] mb-8">We couldn&apos;t find a creator with that profile.</p>
          <Link to="/creators">
            <Button className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white">Browse All Creators</Button>
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  /* ---- Computed values ---- */
  const platforms = creator.platforms ?? [];
  const bannerGradient = BRANCH_BANNER[creator.branch ?? ""] ?? DEFAULT_BANNER;
  const branchStyle = BRANCH_STYLES[creator.branch ?? ""] ?? "bg-gray-600 text-white";
  const isVerified = !!creator.featured_homepage;
  const bannerImg = !bannerFailed ? (resolvedBanner || enrichment.bannerImage || null) : null;

  const bio = creator.bio || "";
  const bioNeedsToggle = bio.length > 180;
  const bioDisplay = bioExpanded || !bioNeedsToggle ? bio : bio.slice(0, 180) + "...";

  // Build stats array — only real data
  const stats: { label: string; value: string; icon: React.ReactNode }[] = [];
  if (creator.follower_count && creator.follower_count > 0) {
    stats.push({ label: "Followers", value: formatFollowerCount(creator.follower_count), icon: <Users className="h-4 w-4 text-[#1e3a5f]" /> });
  }
  if (creator.engagement_rate != null && creator.engagement_rate > 0) {
    stats.push({ label: "Engagement", value: `${creator.engagement_rate.toFixed(1)}%`, icon: <TrendingUp className="h-4 w-4 text-green-600" /> });
  }
  if (creator.avg_views) {
    stats.push({ label: "Avg Views", value: creator.avg_views, icon: <Eye className="h-4 w-4 text-blue-500" /> });
  }
  if (creator.media_count && creator.media_count > 0) {
    stats.push({ label: "Posts", value: formatFollowerCount(creator.media_count), icon: <LayoutGrid className="h-4 w-4 text-gray-500" /> });
  }

  // Sponsor Fit Score
  const sponsorFitScore = (() => {
    let score = 50;
    const er = creator.engagement_rate ?? 0;
    if (er >= 5) score += 30;
    else if (er >= 3) score += 20;
    else if (er >= 1) score += 10;
    const fc = creator.follower_count ?? 0;
    if (fc >= 100_000) score += 20;
    else if (fc >= 50_000) score += 15;
    else if (fc >= 10_000) score += 10;
    else if (fc >= 1_000) score += 5;
    return Math.min(score, 99);
  })();
  const sponsorFitTier = sponsorFitScore >= 80
    ? { label: "Platinum Fit", bg: "bg-yellow-100 text-yellow-800" }
    : sponsorFitScore >= 60
    ? { label: "Strong Fit", bg: "bg-green-100 text-green-800" }
    : sponsorFitScore >= 40
    ? { label: "Good Fit", bg: "bg-blue-100 text-blue-800" }
    : { label: "Emerging", bg: "bg-gray-100 text-gray-600" };

  // Upcoming vs past events
  const now = new Date().toISOString();
  const upcomingEvents = events.filter((e) => !e.start_date || e.start_date >= now);
  const pastEvents = events.filter((e) => e.start_date && e.start_date < now);

  return (
    <div className="min-h-screen bg-gray-50 text-[#1A1A2E]">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-20 pb-12">
        {/* Back link */}
        <Link
          to="/creators"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Creators
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* ====== BANNER ====== */}
          <div className={cn("relative h-36 md:h-52 w-full overflow-hidden", !bannerImg && bannerGradient)}>
            {bannerImg ? (
              <>
                <img
                  src={bannerImg}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ objectPosition: "center top" }}
                  onError={() => setBannerFailed(true)}
                />
                {/* Dark gradient overlay for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </>
            ) : (
              /* Subtle diagonal stripe pattern */
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.5) 10px, rgba(255,255,255,0.5) 12px)",
                }}
              />
            )}
          </div>

          {/* ====== AVATAR + HEADER ====== */}
          <div className="px-4 md:px-6">
            {/* Avatar overlapping banner */}
            <div className="-mt-10 md:-mt-12">
              <div
                className={cn(
                  "w-20 h-20 md:w-[100px] md:h-[100px] rounded-full overflow-hidden border-4 border-white shadow-lg relative",
                  isVerified && "ring-[3px] ring-[#1e3a5f] ring-offset-2 ring-offset-white"
                )}
              >
                {imgSrc && !imgError && (
                  <img
                    src={imgSrc}
                    alt={creator.display_name}
                    className="w-full h-full object-cover absolute inset-0 z-10"
                    loading="lazy"
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgError(true)}
                  />
                )}
                <div className="w-full h-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5282] flex items-center justify-center text-white font-bold text-2xl">
                  {getInitials(creator.display_name, creator.handle)}
                </div>
              </div>
            </div>

            {/* Name + handle + badges + follow */}
            <div className="mt-3 pb-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                    {creator.display_name}
                  </h1>
                  <p className="text-sm text-gray-400 mt-0.5">@{creator.handle}</p>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap mt-2.5">
                    {creator.branch && (
                      <span className={cn("text-xs font-semibold px-3 py-1 rounded-full", branchStyle)}>
                        {creator.branch}
                      </span>
                    )}
                    {creator.featured_homepage && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>MilCrunch Verified</TooltipContent>
                      </Tooltip>
                    )}
                    {hasUpcomingEvents && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                        <Calendar className="h-3 w-3" />
                        Attending Events
                      </span>
                    )}
                    {creator.status && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {creator.status}
                      </span>
                    )}
                    {creator.category && (
                      <span className="text-xs font-medium text-[#1e3a5f] bg-[#1e3a5f]/10 px-3 py-1 rounded-full">
                        {creator.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Follow button */}
                <div className="shrink-0">
                  {following ? (
                    <Button
                      onClick={handleFollowClick}
                      className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white px-6 rounded-xl w-full md:w-auto"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Following
                    </Button>
                  ) : (
                    <Button
                      onClick={handleFollowClick}
                      variant="outline"
                      className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/10 px-6 rounded-xl w-full md:w-auto"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Follow
                    </Button>
                  )}
                </div>
              </div>

              {/* ====== BIO ====== */}
              {bio && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {bioDisplay}
                  </p>
                  {bioNeedsToggle && (
                    <button
                      onClick={() => setBioExpanded(!bioExpanded)}
                      className="text-sm font-medium text-[#1e3a5f] hover:text-[#2d5282] mt-1 inline-flex items-center gap-0.5"
                    >
                      {bioExpanded ? (
                        <>
                          See less <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          See more <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* ====== STATS ROW ====== */}
              {stats.length > 0 && (
                <div className="mt-5 grid grid-cols-2 md:flex md:items-center gap-3 md:gap-8">
                  {stats.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 md:text-center">
                      {s.icon}
                      <div>
                        <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ====== SPONSOR FIT SCORE ====== */}
              <div className="mt-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold cursor-default ${sponsorFitTier.bg}`}>
                      ⚡ {sponsorFitTier.label} · {sponsorFitScore}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs max-w-[220px]">Sponsor Fit Score is calculated from engagement rate, follower count, and niche alignment.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* ====== ACTION BAR ====== */}
          {user && (
            <div className="px-4 md:px-6 py-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
                onClick={() => navigate(`/brand/verification?name=${encodeURIComponent(creator?.display_name ?? creator?.handle ?? "")}`)}
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Verify
              </Button>
            </div>
          )}

          {/* ====== TABS ====== */}
          <Tabs defaultValue="overview" onValueChange={handleTabChange}>
            <div className="border-t border-gray-100">
              <TabsList className="w-full justify-start bg-transparent rounded-none p-0 h-auto px-4 md:px-6">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:bg-transparent data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="content"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:bg-transparent data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Content
                </TabsTrigger>
                <TabsTrigger
                  value="events"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:bg-transparent data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Events
                </TabsTrigger>
                <TabsTrigger
                  value="contact"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:bg-transparent data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Contact
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ====== OVERVIEW TAB ====== */}
            <TabsContent value="overview" className="px-4 md:px-6 py-5 space-y-6">
              {/* About */}
              {bio && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">About</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{bio}</p>
                </div>
              )}

              {/* Platforms */}
              {platforms.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Platforms</h3>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((p) => (
                      <a
                        key={p}
                        href={getPlatformUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
                      >
                        {PLATFORM_ICON[p] ?? <ExternalLink className="h-4 w-4" />}
                        {PLATFORM_LABEL[p] ?? p}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Other links */}
              {enrichment.otherLinks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Links</h3>
                  <div className="space-y-2">
                    {enrichment.otherLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5 transition-colors group"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1e3a5f]" />
                        <span className="text-sm text-gray-700 group-hover:text-[#1e3a5f] truncate">
                          {link.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {enrichment.hashtags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {enrichment.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full"
                      >
                        <Hash className="h-3 w-3" />
                        {tag.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!bio && platforms.length === 0 && enrichment.otherLinks.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Profile details coming soon.</p>
                </div>
              )}
            </TabsContent>

            {/* ====== CONTENT TAB ====== */}
            <TabsContent value="content" className="px-4 md:px-6 py-5">
              {enrichment.posts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                  {enrichment.posts.map((post) => (
                    <a
                      key={post.id}
                      href={post.permalink ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square"
                    >
                      {post.thumbnail ? (
                        <img
                          src={post.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                      {/* Hover overlay with engagement */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                        {post.likes > 0 && (
                          <span className="flex items-center gap-1 text-white text-sm font-medium">
                            <Heart className="h-4 w-4 fill-white" />
                            {formatFollowerCount(post.likes)}
                          </span>
                        )}
                        {post.comments > 0 && (
                          <span className="flex items-center gap-1 text-white text-sm font-medium">
                            <MessageCircle className="h-4 w-4 fill-white" />
                            {formatFollowerCount(post.comments)}
                          </span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <Image className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">Content coming soon</p>
                  <p className="text-xs mt-1">This creator&apos;s posts will appear here.</p>
                </div>
              )}
            </TabsContent>

            {/* ====== EVENTS TAB ====== */}
            <TabsContent value="events" className="px-4 md:px-6 py-5">
              {eventsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1e3a5f]" />
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-6">
                  {upcomingEvents.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Upcoming</h3>
                      <div className="space-y-3">
                        {upcomingEvents.map((evt) => (
                          <EventCard key={evt.id} event={evt} />
                        ))}
                      </div>
                    </div>
                  )}
                  {pastEvents.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Past Events</h3>
                      <div className="space-y-3">
                        {pastEvents.map((evt) => (
                          <EventCard key={evt.id} event={evt} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No events yet</p>
                  <p className="text-xs mt-1">Events this creator is attending will appear here.</p>
                </div>
              )}
            </TabsContent>

            {/* ====== CONTACT TAB ====== */}
            <TabsContent value="contact" className="px-4 md:px-6 py-5 space-y-5">
              {/* Email */}
              {enrichment.email && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Email</h3>
                  <a
                    href={`mailto:${enrichment.email}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {enrichment.email}
                  </a>
                </div>
              )}

              {/* Social platforms */}
              {platforms.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Social</h3>
                  <div className="space-y-2">
                    {platforms.map((p) => (
                      <a
                        key={p}
                        href={getPlatformUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5 transition-colors group"
                      >
                        <span className="text-gray-500 group-hover:text-[#1e3a5f] transition-colors">
                          {PLATFORM_ICON[p] ?? <ExternalLink className="h-4 w-4" />}
                        </span>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-[#1e3a5f]">
                          {PLATFORM_LABEL[p] ?? p}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-300 ml-auto" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Other links */}
              {enrichment.otherLinks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Websites</h3>
                  <div className="space-y-2">
                    {enrichment.otherLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5 transition-colors group"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1e3a5f]" />
                        <span className="text-sm text-gray-700 group-hover:text-[#1e3a5f] truncate">
                          {link.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!enrichment.email && platforms.length === 0 && enrichment.otherLinks.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No contact info available</p>
                  <p className="text-xs mt-1">Contact information will appear here when available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Event Card Sub-Component                                            */
/* ------------------------------------------------------------------ */

function EventCard({ event }: { event: EventRow }) {
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const dateRange = event.start_date
    ? event.end_date && event.end_date !== event.start_date
      ? `${formatDate(event.start_date)} — ${formatDate(event.end_date)}`
      : formatDate(event.start_date)
    : "Date TBD";

  const location = [event.city, event.state].filter(Boolean).join(", ");

  return (
    <Link
      to={`/events/${event.id}`}
      className="flex gap-4 p-3 rounded-xl border border-gray-100 hover:border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5 transition-colors group"
    >
      {/* Event cover thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-[#1e3a5f]/20 to-[#1e3a5f]/5 shrink-0 flex items-center justify-center">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Calendar className="h-6 w-6 text-[#1e3a5f]/40" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-[#1e3a5f] truncate transition-colors">
          {event.title}
        </h4>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          {dateRange}
        </p>
        {(location || event.venue) && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {event.venue ? `${event.venue}${location ? `, ${location}` : ""}` : location}
          </p>
        )}
      </div>
    </Link>
  );
}
