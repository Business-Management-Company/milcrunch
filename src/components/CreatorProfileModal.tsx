import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  enrichCreatorProfile,
  type CreatorCard,
  type EnrichedProfileResponse,
} from "@/lib/influencers-club";
import { useLists, type ListCreator } from "@/contexts/ListContext";
import {
  Instagram,
  ExternalLink,
  ListPlus,
  BarChart3,
  Image,
  Users,
  Plus,
  Video,
  Youtube,
  Loader2,
  Link,
  ShieldCheck,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import CreateListModal from "@/components/CreateListModal";

const PLATFORM_ORDER = ["instagram", "tiktok", "youtube", "twitter", "linkedin"];
const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter",
  linkedin: "LinkedIn",
};

/** Format numbers for display (9.4k, 1.2M). */
function formatNumber(n: number | undefined | null): string {
  if (n != null && n !== 0 && !Number.isFinite(n)) return "—";
  if (n == null || (n === 0 && n !== 0)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}

function formatPercent(n: number | undefined | null): string {
  if (n != null && n !== 0 && !Number.isFinite(n)) return "—";
  if (n == null || (n === 0 && n !== 0)) return "—";
  return n.toFixed(2) + "%";
}

function formatIncome(min: number | undefined | null, max: number | undefined | null, _currency?: string): string {
  if ((min == null || min === 0) && (max == null || max === 0)) return "Income data not available.";
  return `$${Number(min ?? 0).toLocaleString()} – $${Number(max ?? 0).toLocaleString()} / 90 days`;
}

/** Legacy formatNum for any remaining call sites. */
function formatNum(n: number): string {
  return formatNumber(n);
}

interface CreatorProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creator: CreatorCard | null;
  onAddToList?: (creator: ListCreator) => void;
  onOpenCreator?: (username: string) => void;
  cachedEnrichment?: EnrichedProfileResponse | null;
}

interface PostItem {
  id?: string;
  thumbnail?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  date?: string;
  permalink?: string;
}

interface SimilarAccount {
  id?: string;
  username?: string;
  name?: string;
  full_name?: string;
  avatar?: string;
  picture?: string;
  followers?: number;
  follower_count?: number;
  engagement_percent?: number;
  profile_url?: string;
}

export default function CreatorProfileModal({
  open,
  onOpenChange,
  creator,
  onAddToList,
  onOpenCreator,
  cachedEnrichment,
}: CreatorProfileModalProps) {
  const navigate = useNavigate();
  const [enriched, setEnriched] = useState<EnrichedProfileResponse | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentTimedOut, setEnrichmentTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram");
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const { addCreatorToList, lists, createList, isCreatorInList } = useLists();

  const username = creator?.username ?? (creator?.name?.replace(/\s+/g, "_").toLowerCase());

  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!open || !creator) {
      setEnriched(null);
      setError(null);
      setEnrichmentTimedOut(false);
      setSelectedPlatform("instagram");
      setEnrichmentLoading(false);
      return;
    }
    const rawHandle = creator.username || username;
    const handle = typeof rawHandle === "string" ? rawHandle.replace(/^@/, "").trim() : "";
    if (!handle) {
      setEnriched(null);
      setError("No username available for this creator.");
      setEnrichmentLoading(false);
      return;
    }

    // Use cached enrichment from background enrichment if available
    if (cachedEnrichment) {
      console.log("[Enrich] Using cached enrichment for:", handle);
      setEnriched(cachedEnrichment);
      setEnrichmentLoading(false);
      setError(null);
      return;
    }

    console.log("[Enrich] useEffect fired, username:", handle);

    cancelledRef.current = false;

    // Cancel any in-flight request from a previous run (e.g. deps changed)
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const gen = ++generationRef.current;

    setError(null);
    setEnrichmentTimedOut(false);
    setEnrichmentLoading(true);

    const timeoutId = setTimeout(() => {
      console.log("[Enrich] TIMEOUT: Aborting after 45 seconds");
      controller.abort();
    }, 45000);

    enrichCreatorProfile(handle, controller.signal)
      .then((payload) => {
        clearTimeout(timeoutId);
        if (cancelledRef.current || generationRef.current !== gen) {
          console.log("[Enrich] SKIPPED state update — cancelled or superseded", { cancelled: cancelledRef.current, gen, current: generationRef.current });
          return;
        }
        setEnrichmentLoading(false);
        setEnriched(payload);
        setError(null);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (cancelledRef.current || generationRef.current !== gen) {
          console.log("[Enrich] SKIPPED catch — cancelled or superseded");
          return;
        }
        setEnrichmentLoading(false);
        if (err?.name === "AbortError") {
          setEnriched(null);
          setEnrichmentTimedOut(true);
          console.log("[Enrich] Request aborted (timeout or modal closed)");
        } else {
          console.error("[Enrich] Failed:", err);
          setEnriched(null);
          setEnrichmentTimedOut(true);
        }
      });

    return () => {
      cancelledRef.current = true;
      clearTimeout(timeoutId);
      controllerRef.current?.abort();
      controllerRef.current = null;
      // Do NOT set generationRef.current = 0 — it causes the winning request's .then to see gen !== ref and skip setEnriched (e.g. after Strict Mode first cleanup)
    };
  }, [open, creator?.id, creator?.username, username, cachedEnrichment]);

  /** Two-level response: result (top-level) + result.instagram (ig) */
  const resultTop = enriched?.result ?? {};
  const ig = enriched?.instagram;

  const availablePlatforms = useMemo(() => {
    const has = resultTop.creator_has as Record<string, boolean> | undefined;
    if (has && typeof has === "object") {
      return PLATFORM_ORDER.filter((p) => has[p] === true);
    }
    return ["instagram"];
  }, [resultTop.creator_has]);

  const listCreator: ListCreator | null = creator
    ? {
        id: creator.id,
        name: creator.name,
        username: creator.username,
        avatar: creator.avatar,
        followers: creator.followers,
        engagementRate: creator.engagementRate,
        platforms: creator.platforms,
        bio: creator.bio,
        location: creator.location,
      }
    : null;

  const addedToList = listCreator ? isCreatorInList(listCreator.id) : false;

  const handleAddToList = (listId: string, listName: string) => {
    if (!listCreator) return;
    addCreatorToList(listId, listCreator);
    onAddToList?.(listCreator);
    toast.success(`Added ${listCreator.name} to ${listName}`);
  };

  const handleOpenCreateListModal = () => {
    setCreateListModalOpen(true);
  };

  const handleCreateListAndAdd = (name: string) => {
    if (!listCreator) return;
    const newId = createList(name);
    addCreatorToList(newId, listCreator);
    onAddToList?.(listCreator);
    toast.success(`Added ${listCreator.name} to ${name}`);
    setCreateListModalOpen(false);
  };

  const handleVerifyMilitary = () => {
    const BRANCH_PATTERNS: [RegExp, string][] = [
      [/\barmy\b/i, "Army"],
      [/\bnavy\b/i, "Navy"],
      [/\bair\s*force\b/i, "Air Force"],
      [/\bmarine[s]?\b|\busmc\b/i, "Marines"],
      [/\bcoast\s*guard\b/i, "Coast Guard"],
      [/\bspace\s*force\b/i, "Space Force"],
    ];
    const RANK_PATTERNS = /\b(Private|Corporal|Specialist|Sergeant|Staff Sergeant|Gunnery Sergeant|First Sergeant|Master Sergeant|Sergeant Major|Lieutenant|Captain|Major|Colonel|General|Admiral|Commander|Petty Officer|Seaman|Airman|Warrant Officer)\b/i;
    const bioText = (igRecord?.biography as string) ?? creator?.bio ?? "";
    const fullName = (igRecord?.full_name as string) ?? creator?.name ?? "";
    let claimedBranch = "";
    for (const [pattern, branch] of BRANCH_PATTERNS) {
      if (pattern.test(bioText) || pattern.test(fullName)) { claimedBranch = branch; break; }
    }
    const rankMatch = bioText.match(RANK_PATTERNS);
    const claimedRank = rankMatch ? rankMatch[1] : "";
    // Gather links from enrichment
    const linkedinUrl = (() => {
      const profiles = resultTop.profiles as { url?: string; network?: string }[] | undefined;
      if (Array.isArray(profiles)) {
        const li = profiles.find((p) => p.network === "linkedin" || (p.url ?? "").includes("linkedin"));
        if (li?.url) return li.url;
      }
      const links = (resultTop.other_links as string[]) ?? (resultTop.links_in_bio as string[]) ?? [];
      if (Array.isArray(links)) {
        const li = links.find((u) => typeof u === "string" && u.includes("linkedin.com"));
        if (li) return li;
      }
      return "";
    })();
    const websiteUrl = (() => {
      const links = (resultTop.other_links as string[]) ?? (resultTop.links_in_bio as string[]) ?? [];
      if (Array.isArray(links)) {
        const site = links.find((u) => typeof u === "string" && !u.includes("linkedin") && !u.includes("instagram") && !u.includes("tiktok") && !u.includes("youtube") && !u.includes("twitter") && !u.includes("facebook"));
        if (site) return site;
      }
      return "";
    })();
    const platforms = availablePlatforms.map((p) => `${p}: @${displayUsername}`).join(", ");
    const notes = [bioText, platforms].filter(Boolean).join("\n\n");
    onOpenChange(false);
    navigate("/verification", {
      state: {
        prefill: {
          fullName,
          claimedBranch,
          claimedRank,
          claimedStatus: "veteran",
          linkedinUrl,
          websiteUrl,
          notes,
          source: "discovery",
          sourceUsername: displayUsername,
        },
      },
    });
  };

  const igRecord = ig && typeof ig === "object" ? (ig as Record<string, unknown>) : undefined;
  const reelsObj = igRecord?.reels as Record<string, unknown> | undefined;
  const tiktokData = (resultTop as Record<string, unknown>).tiktok as Record<string, unknown> | undefined;
  const youtubeData = (resultTop as Record<string, unknown>).youtube as Record<string, unknown> | undefined;
  // growthObj and incomeObj are computed per-platform in the analytics useMemo below

  const displayUsername =
    (igRecord?.username as string) ?? (resultTop.username as string) ?? creator?.username ?? username ?? "";
  const displayName =
    (igRecord?.full_name as string) ?? (resultTop.first_name as string) ?? creator?.name ?? displayUsername ?? "—";
  const picture =
    (igRecord?.profile_picture_hd as string) ?? (igRecord?.profile_picture as string) ?? creator?.avatar ?? "";
  const bio = useMemo(() => {
    if (selectedPlatform === "tiktok" && tiktokData) {
      return (tiktokData.biography as string) ?? (tiktokData.bio as string) ?? creator?.bio ?? "";
    }
    if (selectedPlatform === "youtube" && youtubeData) {
      return (youtubeData.description as string) ?? (youtubeData.biography as string) ?? creator?.bio ?? "";
    }
    return (igRecord?.biography as string) ?? creator?.bio ?? "";
  }, [selectedPlatform, tiktokData, youtubeData, igRecord, creator?.bio]);
  const location =
    (igRecord?.location as string) ??
    (igRecord?.country as string) ??
    (Array.isArray(igRecord?.locations) && igRecord.locations?.length ? String(igRecord.locations[0]) : null) ??
    (resultTop.location as string) ??
    creator?.location ??
    "";
  const languageCode = Array.isArray(igRecord?.language_code) && igRecord.language_code?.length ? String(igRecord.language_code[0]) : (resultTop.speaking_language as string) ?? "";
  const language = languageCode === "en" ? "English" : languageCode || "";
  const nicheClass = igRecord?.niche_class as string[] | undefined;
  const category =
    (igRecord?.category as string) ?? (Array.isArray(nicheClass) && nicheClass.length ? nicheClass.join(", ") : "") ?? "";
  const isVerified = Boolean(igRecord?.is_verified);

  const { followers, engagement, mediaCount, postsPerMonth, avgLikes, avgComments, avgReelLikes, avgViews } = useMemo(() => {
    if (selectedPlatform === "tiktok" && tiktokData) {
      return {
        followers: Number(tiktokData.follower_count ?? 0),
        engagement: Number(tiktokData.engagement_percent ?? 0),
        mediaCount: Number(tiktokData.media_count ?? tiktokData.video_count ?? 0),
        postsPerMonth: 0,
        avgLikes: Number(tiktokData.avg_likes ?? tiktokData.avg_like_count ?? 0),
        avgComments: Number(tiktokData.avg_comments ?? tiktokData.avg_comment_count ?? 0),
        avgReelLikes: 0,
        avgViews: Number(tiktokData.avg_view_count ?? tiktokData.avg_views ?? 0),
      };
    }
    if (selectedPlatform === "youtube" && youtubeData) {
      return {
        followers: Number(youtubeData.subscriber_count ?? youtubeData.follower_count ?? 0),
        engagement: Number(youtubeData.engagement_percent ?? 0),
        mediaCount: Number(youtubeData.video_count ?? youtubeData.media_count ?? 0),
        postsPerMonth: 0,
        avgLikes: Number(youtubeData.avg_likes ?? youtubeData.avg_like_count ?? 0),
        avgComments: Number(youtubeData.avg_comments ?? youtubeData.avg_comment_count ?? 0),
        avgReelLikes: 0,
        avgViews: Number(youtubeData.avg_view_count ?? youtubeData.avg_views ?? 0),
      };
    }
    return {
      followers: Number(igRecord?.follower_count ?? creator?.followers ?? 0),
      engagement: Number(igRecord?.engagement_percent ?? creator?.engagementRate ?? 0),
      mediaCount: Number(igRecord?.media_count ?? 0),
      postsPerMonth: Number(igRecord?.posting_frequency_recent_months ?? 0),
      avgLikes: Number(igRecord?.avg_likes ?? 0),
      avgComments: Number(igRecord?.avg_comments ?? 0),
      avgReelLikes: Number(reelsObj?.avg_like_count ?? 0),
      avgViews: Number(reelsObj?.avg_view_count ?? 0),
    };
  }, [selectedPlatform, tiktokData, youtubeData, igRecord, reelsObj, creator]);

  const { incomeMin, incomeMax, income, followerGrowth, reelsPct } = useMemo(() => {
    // Pick the platform-specific data record for analytics
    let platRecord: Record<string, unknown> | undefined;
    if (selectedPlatform === "tiktok") platRecord = tiktokData;
    else if (selectedPlatform === "youtube") platRecord = youtubeData;
    else platRecord = igRecord;

    const incObj = platRecord?.income as Record<string, unknown> | undefined;
    const iMin = incObj && typeof incObj === "object" ? (Number(incObj.min ?? 0) || undefined) : undefined;
    const iMax = incObj && typeof incObj === "object" ? (Number(incObj.max ?? 0) || undefined) : undefined;

    const growthRec = platRecord?.creator_follower_growth as Record<string, unknown> | undefined;
    const fGrowth = growthRec && typeof growthRec === "object"
      ? [
          growthRec["3_months_ago"] != null && `${Number(growthRec["3_months_ago"]).toFixed(2)}% (3mo)`,
          growthRec["6_months_ago"] != null && `${Number(growthRec["6_months_ago"]).toFixed(2)}% (6mo)`,
          growthRec["12_months_ago"] != null && `${Number(growthRec["12_months_ago"]).toFixed(2)}% (12mo)`,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    const rPct = selectedPlatform === "instagram"
      ? Number(igRecord?.reels_percentage_last_12_posts ?? 0)
      : 0;

    return {
      incomeMin: iMin,
      incomeMax: iMax,
      income: formatIncome(iMin, iMax),
      followerGrowth: fGrowth,
      reelsPct: rPct,
    };
  }, [selectedPlatform, tiktokData, youtubeData, igRecord]);

  const showEnrichmentLoading = enrichmentLoading && !enrichmentTimedOut;
  const engagementDisplay = engagement != null && engagement > 0 ? engagement : null;
  const hasDataForPlatform =
    (selectedPlatform === "instagram" && !!ig) ||
    (selectedPlatform === "tiktok" && !!(resultTop as Record<string, unknown>).tiktok) ||
    (selectedPlatform === "youtube" && !!(resultTop as Record<string, unknown>).youtube);

  const recentPosts: PostItem[] = useMemo(() => {
    const raw = igRecord?.post_data;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 12).map((item: Record<string, unknown>) => {
      const media = item.media as unknown[] | undefined;
      const firstMedia = Array.isArray(media) && media[0] && typeof media[0] === "object" ? (media[0] as Record<string, unknown>) : undefined;
      const engagement = item.engagement as Record<string, unknown> | undefined;
      return {
        id: String(item.post_id ?? item.id ?? Math.random()),
        thumbnail: (firstMedia?.url ?? item.thumbnail ?? item.image_url) as string | undefined,
        caption: (item.caption as string) ?? undefined,
        likes: Number(engagement?.likes ?? item.likes ?? 0),
        comments: Number(engagement?.comments ?? item.comments ?? 0),
        date: (item.created_at as string) ?? undefined,
        permalink: (item.post_url as string) ?? undefined,
      };
    });
  }, [igRecord?.post_data]);

  const similarAccounts: SimilarAccount[] = useMemo(() => {
    const raw = resultTop.lookalikes;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 12).map((item: Record<string, unknown>) => ({
      id: String(item.username ?? Math.random()),
      username: item.username as string | undefined,
      name: (item.full_name ?? item.username) as string | undefined,
      full_name: item.full_name as string | undefined,
      avatar: (item.profile_picture ?? item.picture) as string | undefined,
      picture: item.picture as string | undefined,
      followers: Number(item.follower_count ?? item.followers ?? 0),
      follower_count: Number(item.follower_count ?? item.followers ?? 0),
      engagement_percent: Number(item.engagement_percent ?? 0),
      profile_url: item.profile_url as string | undefined,
    }));
  }, [resultTop.lookalikes]);

  const platformLink = useMemo(() => {
    const u = displayUsername || creator?.username;
    if (!u) return null;
    switch (selectedPlatform.toLowerCase()) {
      case "instagram":
        return `https://instagram.com/${u}`;
      case "tiktok":
        return tiktokData?.username ? `https://tiktok.com/@${tiktokData.username}` : `https://tiktok.com/@${u}`;
      case "youtube":
        return youtubeData?.custom_url ?? (youtubeData?.channel_id ? `https://youtube.com/channel/${youtubeData.channel_id}` : `https://youtube.com/@${u}`);
      default:
        return `https://instagram.com/${u}`;
    }
  }, [selectedPlatform, displayUsername, creator?.username, tiktokData?.username, youtubeData?.custom_url, youtubeData?.channel_id]);

  const OTHER_LINKS_SHOWN = 4;
  const platformLinksFromEnrichment = useMemo(() => {
    const other = (resultTop.other_links as string[]) ?? (resultTop.links_in_bio as string[]) ?? [];
    if (!Array.isArray(other)) return { links: [] as { label: string; url: string }[], othersCount: 0 };
    const links = other
      .filter((url) => url && String(url).startsWith("http"))
      .slice(0, OTHER_LINKS_SHOWN)
      .map((url) => ({ label: "Link", url }));
    return { links, othersCount: Math.max(0, other.length - OTHER_LINKS_SHOWN) };
  }, [resultTop.other_links, resultTop.links_in_bio]);

  return (
    <>
      <CreateListModal
        open={createListModalOpen}
        onOpenChange={setCreateListModalOpen}
        onCreate={handleCreateListAndAdd}
      />
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full border-l border-border dark:border-gray-800 bg-card dark:bg-[#1A1D27] p-0 sm:max-w-[90%]",
          "flex flex-col overflow-hidden"
        )}
      >
        <div className="flex h-full flex-col md:flex-row overflow-hidden">
          {/* Left panel - fixed ~350px */}
          <div className="flex w-full flex-col border-r border-border dark:border-gray-800 bg-white dark:bg-[#0F1117] p-6 md:w-[350px] shrink-0">
            <img
              src={picture || undefined}
              alt={displayName}
              className="mx-auto mb-4 h-40 w-40 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
            />
            <p className="text-lg font-bold text-center text-gray-900 dark:text-white">
              {displayName}
              {isVerified && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-[#0064B1]/20 px-1.5 py-0.5 text-xs font-medium text-[#0064B1]">
                  Verified
                </span>
              )}
            </p>
            {displayUsername && (
              <a
                href={platformLink ?? `https://instagram.com/${displayUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-center text-[#0064B1] hover:underline mb-4 block"
              >
                @{displayUsername}
              </a>
            )}
            <div className="space-y-2">
              {addedToList ? (
                <Button className="w-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg" disabled>
                  Added ✓
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="w-full bg-[#0064B1] hover:bg-[#053877] text-white rounded-lg"
                      disabled={!listCreator}
                    >
                      <ListPlus className="mr-2 h-4 w-4" />
                      Add creator to a list
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {lists.map((list) => (
                      <DropdownMenuItem
                        key={list.id}
                        onClick={() => handleAddToList(list.id, list.name)}
                      >
                        {list.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={handleOpenCreateListModal}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="outline"
                className="w-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg"
                onClick={handleVerifyMilitary}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify Military Status
              </Button>
              <Button
                variant="outline"
                className="w-full bg-white dark:bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 rounded-lg"
                onClick={() => onOpenChange(false)}
              >
                Exclude from results
              </Button>
            </div>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
            <div className="space-y-0 text-sm">
              {[
                { label: "Followers", value: followers ? formatNumber(followers) : "—" },
                { label: "Engagement Rate", value: engagement != null && engagement > 0 ? formatPercent(engagement) : "—" },
                { label: "Number of Posts", value: mediaCount ? formatNumber(mediaCount) : "—" },
                { label: "Posts per Month", value: postsPerMonth ? formatNumber(postsPerMonth) : "—" },
                { label: "Average Views", value: avgViews ? formatNumber(avgViews) : "—" },
                { label: "Average Reel Likes", value: avgReelLikes ? formatNumber(avgReelLikes) : "—" },
                { label: "Average Likes", value: avgLikes ? formatNumber(avgLikes) : "—" },
                { label: "Average Comments", value: avgComments ? formatNumber(avgComments) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">{label}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel - flex-1 scrollable */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {error && (
              <div className="p-4 text-sm text-destructive bg-destructive/10 border-b border-border shrink-0">
                {error}
              </div>
            )}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Platform tabs - pills: active blue with icon+handle, inactive gray with icon only */}
                <div className="flex flex-wrap gap-2">
                  {availablePlatforms.map((p) => {
                    const isActive = selectedPlatform.toLowerCase() === p.toLowerCase();
                    const label = PLATFORM_LABELS[p.toLowerCase()] ?? p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPlatform(p.toLowerCase())}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-[#0064B1] text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                        )}
                      >
                        {(p === "instagram" && <Instagram className="h-4 w-4" />) ||
                          (p === "tiktok" && <Video className="h-4 w-4" />) ||
                          (p === "youtube" && <Youtube className="h-4 w-4" />) || (
                            <Video className="h-4 w-4" />
                          )}
                        {isActive ? `@${displayUsername || label}` : label}
                      </button>
                    );
                  })}
                </div>

                {!hasDataForPlatform && !enrichmentLoading && (
                  <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                    Data not available for this platform.
                  </p>
                )}

                {(hasDataForPlatform || selectedPlatform === "instagram") && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-muted/30 dark:bg-[#0F1117] p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">{PLATFORM_LABELS[selectedPlatform] ?? selectedPlatform}</p>
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">{selectedPlatform === "youtube" ? "Subscribers" : "Followers"}</p>
                        <p className="text-lg font-bold text-[#000741] dark:text-white">{formatNumber(followers)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="text-lg font-bold text-[#000741] dark:text-white">{formatPercent(engagement)}</p>
                      </div>
                      {mediaCount > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">{selectedPlatform === "youtube" ? "Videos" : "Posts"}</p>
                          <p className="text-lg font-bold text-[#000741] dark:text-white">{formatNumber(mediaCount)}</p>
                        </div>
                      )}
                      {avgViews > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Views</p>
                          <p className="text-lg font-bold text-[#000741] dark:text-white">{formatNumber(avgViews)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Info grid - 3 columns in light gray/blue-50 card */}
                <div className="rounded-xl bg-blue-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Bio</p>
                      {showEnrichmentLoading && !bio ? (
                        <div className="mt-1 space-y-1">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-4/5" />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">{bio || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Name</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{displayName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Location</p>
                      {showEnrichmentLoading && !location ? (
                        <Skeleton className="h-4 w-32 mt-1" />
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{location || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Language</p>
                      {showEnrichmentLoading && !language ? (
                        <Skeleton className="h-4 w-20 mt-1" />
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{language || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Business Category</p>
                      {showEnrichmentLoading && !category ? (
                        <Skeleton className="h-4 w-24 mt-1" />
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{category || "—"}</p>
                      )}
                    </div>
                    <div />
                  </div>
                </div>

                {/* Platform Links - circular social icons, only for platforms creator has */}
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Platform Links</p>
                  <div className="flex flex-wrap gap-3">
                    {availablePlatforms.map((p) => {
                      const href =
                        p === "instagram"
                          ? `https://instagram.com/${displayUsername}`
                          : p === "tiktok"
                            ? (tiktokData?.username ? `https://tiktok.com/@${tiktokData.username}` : `https://tiktok.com/@${displayUsername}`)
                            : p === "youtube"
                              ? (youtubeData?.custom_url ?? (youtubeData?.channel_id ? `https://youtube.com/channel/${youtubeData.channel_id}` : `https://youtube.com/@${displayUsername}`))
                              : "#";
                      return (
                        <a
                          key={p}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[#0064B1] hover:text-white transition-colors"
                          title={PLATFORM_LABELS[p] ?? p}
                        >
                          {(p === "instagram" && <Instagram className="h-5 w-5" />) ||
                            (p === "tiktok" && <Video className="h-5 w-5" />) ||
                            (p === "youtube" && <Youtube className="h-5 w-5" />) || (
                              <ExternalLink className="h-5 w-5" />
                            )}
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* Links Used - pill badges */}
                {(platformLinksFromEnrichment.links.length > 0 || platformLinksFromEnrichment.othersCount > 0) && (
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Links Used</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {platformLinksFromEnrichment.links.map(({ url }) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-[#0064B1] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors truncate max-w-[220px]"
                          title={url}
                        >
                          <Link className="h-3 w-3 shrink-0" />
                          <span className="truncate">{url.replace(/^https?:\/\//, "").slice(0, 28)}…</span>
                        </a>
                      ))}
                      {platformLinksFromEnrichment.othersCount > 0 && (
                        <span className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                          + {platformLinksFromEnrichment.othersCount} others
                        </span>
                      )}
                    </div>
                  </div>
                )}

                  {/* Tab bar: Analytics | Posts | Similar Accounts */}
                  <Tabs defaultValue="analytics" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 gap-2 h-auto">
                      <TabsTrigger
                        value="analytics"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 data-[state=active]:bg-[#0064B1] data-[state=active]:text-white data-[state=active]:border-[#0064B1] text-gray-600 dark:text-gray-400 py-2.5"
                      >
                        <BarChart3 className="h-4 w-4" /> Analytics
                      </TabsTrigger>
                      <TabsTrigger
                        value="posts"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 data-[state=active]:bg-[#0064B1] data-[state=active]:text-white data-[state=active]:border-[#0064B1] text-gray-600 dark:text-gray-400 py-2.5"
                      >
                        <Image className="h-4 w-4" /> Posts
                      </TabsTrigger>
                      <TabsTrigger
                        value="similar"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 data-[state=active]:bg-[#0064B1] data-[state=active]:text-white data-[state=active]:border-[#0064B1] text-gray-600 dark:text-gray-400 py-2.5"
                      >
                        <Users className="h-4 w-4" /> Similar Accounts
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="analytics" className="mt-4 space-y-4">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Estimated Creator Income (projected earnings)</p>
                          <Select defaultValue="3m">
                            <SelectTrigger className="w-[140px] h-9 rounded-lg border border-gray-200 dark:border-gray-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3m">Last 3 months</SelectItem>
                              <SelectItem value="6m">Last 6 months</SelectItem>
                              <SelectItem value="12m">Last 12 months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {showEnrichmentLoading && !income ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full max-w-md" />
                            <Skeleton className="h-24 w-64" />
                          </div>
                        ) : (incomeMin != null && incomeMax != null && (incomeMin > 0 || incomeMax > 0)) ? (
                          <>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                              @{displayUsername || "handle"} generated between{" "}
                              <span className="font-bold text-[#0064B1]">${formatNum(incomeMin)}</span> and{" "}
                              <span className="font-bold text-[#0064B1]">${formatNum(incomeMax)}</span> in income in the last 90 days.
                            </p>
                            <div className="h-40 w-full max-w-md">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={[
                                    { month: "Month 1", income: incomeMin },
                                    { month: "Month 2", income: Math.round((incomeMin + incomeMax) / 2) },
                                    { month: "Month 3", income: incomeMax },
                                  ]}
                                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                >
                                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                                  <Tooltip
                                    formatter={(value: number) => ["Income", `$${formatNum(value)}`]}
                                    labelFormatter={(label) => `${label}`}
                                  />
                                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Income" />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground">{income}</p>
                        )}
                      </div>
                      {followerGrowth && (
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Creator Growth</p>
                          <p className="text-sm text-muted-foreground">{String(followerGrowth)}</p>
                        </div>
                      )}
                      {reelsPct > 0 && (
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Content Mix</p>
                          <p className="text-sm text-muted-foreground">Reels {reelsPct}% of last 12 posts</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Posting Frequency</p>
                        <p className="text-sm text-muted-foreground">
                          {postsPerMonth != null && postsPerMonth > 0 ? `${formatNumber(postsPerMonth)} / mo` : "—"}
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="posts" className="mt-4">
                      {recentPosts.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                          No post data available.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {recentPosts.map((post) => (
                            <a
                              key={post.id}
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-muted/30 dark:bg-[#0F1117] hover:shadow-md transition-shadow"
                            >
                              {post.thumbnail ? (
                                <img src={post.thumbnail} alt="" className="w-full aspect-square object-cover" />
                              ) : (
                                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                                  <Image className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <div className="p-2">
                                <p className="text-xs text-muted-foreground line-clamp-2">{post.caption || "—"}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{formatNumber(post.likes)} likes</span>
                                  <span>{formatNumber(post.comments)} comments</span>
                                </div>
                                {post.date && <p className="text-xs text-muted-foreground mt-0.5">{post.date}</p>}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="similar" className="mt-4">
                      {similarAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                          No similar creators found.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {similarAccounts.map((acc) => (
                            <a
                              key={acc.id ?? acc.username}
                              href={acc.profile_url ?? (acc.username ? `https://instagram.com/${acc.username}` : "#")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 hover:shadow-md transition-shadow"
                            >
                              {acc.avatar ? (
                                <img src={acc.avatar} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <Users className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[#000741] dark:text-white truncate">@{acc.username ?? "—"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatNumber(acc.followers ?? acc.follower_count)} followers
                                  {acc.engagement_percent != null && acc.engagement_percent > 0 && ` · ${formatPercent(acc.engagement_percent)} engagement`}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
