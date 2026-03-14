import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { DirectoryMember } from "@/lib/directories";
import {
  Users,
  TrendingUp,
  Eye,
  FileText,
  MousePointer,
  Link2,
  Heart,
  ArrowRight,
  Instagram,
  Youtube,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── TikTok icon ── */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 3.76.92V6.69Z" />
    </svg>
  );
}

/* ── Platform tab definitions ── */
type PlatformTab = "all" | "instagram" | "tiktok" | "youtube";
const PLATFORM_TABS: { key: PlatformTab; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: null },
  { key: "instagram", label: "Instagram", icon: <Instagram className="h-3.5 w-3.5" /> },
  { key: "tiktok", label: "TikTok", icon: <TikTokIcon className="h-3.5 w-3.5" /> },
  { key: "youtube", label: "YouTube", icon: <Youtube className="h-3.5 w-3.5" /> },
];

/* ── Demo platform breakdown (used for @johnny-rocket) ── */
const DEMO_PLATFORM_STATS: Record<string, { followers: number; engagement: number; posts: number }> = {
  instagram: { followers: 342_800, engagement: 4.8, posts: 612 },
  tiktok: { followers: 389_493, engagement: 6.2, posts: 284 },
  youtube: { followers: 115_000, engagement: 3.1, posts: 96 },
};

/* ── Demo top posts ── */
const DEMO_TOP_POSTS = [
  { title: "From the Frontlines to the Feed — My Story", platform: "instagram", date: "Mar 11, 2026", likes: 12_430 },
  { title: "Day in My Life: Veteran Entrepreneur Edition", platform: "tiktok", date: "Mar 8, 2026", likes: 38_920 },
  { title: "Why I Started MilCrunch — Full Breakdown", platform: "youtube", date: "Mar 3, 2026", likes: 4_210 },
];

/* ── Format number with K/M suffix ── */
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function fmtDollar(n: number): string {
  return "$" + Math.round(n / 50) * 50;
}

/* ── Stat card item ── */
function StatItem({
  label,
  value,
  trend,
  delay,
}: {
  label: string;
  value: string;
  trend: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-emerald-400 font-medium">{trend}</p>
    </div>
  );
}

/* ── Platform emoji for posts ── */
function platformEmoji(p: string) {
  if (p === "instagram") return <Instagram className="h-4 w-4 text-pink-400" />;
  if (p === "tiktok") return <TikTokIcon className="h-4 w-4 text-white" />;
  if (p === "youtube") return <Youtube className="h-4 w-4 text-red-400" />;
  return <Share2 className="h-4 w-4 text-slate-400" />;
}

/* ════════════════════════════════════════════════════════════════ */

export default function MyCard() {
  const { user, creatorProfile } = useAuth();
  const [member, setMember] = useState<DirectoryMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PlatformTab>("all");

  // Rate calculator state
  const [calcFollowers, setCalcFollowers] = useState(100_000);
  const [calcEngagement, setCalcEngagement] = useState(5);
  const [calcNiche, setCalcNiche] = useState(2); // 1=General, 2=Military, 3=Lifestyle

  const handle = creatorProfile?.handle ?? "";
  const email = user?.email ?? "";
  const isDemoUser = email === "andrew@podlogix.co" || handle === "johnny-rocket";

  useEffect(() => {
    async function load() {
      if (!handle) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("directory_members")
        .select("*")
        .or(`creator_handle.eq.${handle},creator_handle.eq.@${handle}`)
        .limit(1);

      if (error) console.warn("[MyCard] query error:", error.message);
      if (data && data.length > 0) {
        const row = data[0] as unknown as DirectoryMember;
        setMember(row);
        // Set calculator defaults from real data
        if (row.follower_count) setCalcFollowers(row.follower_count);
        if (row.engagement_rate) setCalcEngagement(row.engagement_rate);
      }
      setLoading(false);
    }
    load();
  }, [handle]);

  // Derive stats based on active tab
  const getStats = () => {
    const fc = member?.follower_count ?? 0;
    const er = member?.engagement_rate ?? 0;
    const pc = member?.post_count ?? 0;

    if (isDemoUser && activeTab !== "all") {
      const ps = DEMO_PLATFORM_STATS[activeTab];
      if (ps) {
        return {
          followers: ps.followers,
          engagement: ps.engagement,
          reach: Math.round(ps.followers * (ps.engagement / 100) * 3),
          posts: ps.posts,
          views: activeTab === "tiktok" ? "1.2M" : activeTab === "youtube" ? "890K" : "456K",
          clicks: activeTab === "tiktok" ? "34.2K" : activeTab === "youtube" ? "12.8K" : "18.5K",
        };
      }
    }
    // "All" tab or non-demo
    const totalFollowers = isDemoUser ? 847_293 : fc;
    const avgEngagement = isDemoUser ? 4.7 : er;
    return {
      followers: totalFollowers,
      engagement: avgEngagement,
      reach: Math.round(totalFollowers * (avgEngagement / 100) * 3),
      posts: isDemoUser ? 992 : pc,
      views: isDemoUser ? "2.5M" : "\u2014",
      clicks: isDemoUser ? "65.5K" : "\u2014",
    };
  };

  const stats = getStats();

  // Know Your Worth
  const worthLow = Math.round(((stats.followers / 1000) * stats.engagement * 8) / 50) * 50;
  const worthHigh = Math.round((worthLow * 2.2) / 50) * 50;
  const tierLabel =
    stats.followers >= 500_000
      ? "Top-Tier Creator"
      : stats.followers >= 100_000
        ? "Mid-Tier Creator"
        : "Emerging Creator";
  const tierProgress =
    stats.followers >= 500_000
      ? 100
      : stats.followers >= 100_000
        ? 40 + ((stats.followers - 100_000) / 400_000) * 40
        : (stats.followers / 100_000) * 40;

  // Rate calculator
  const nicheMultipliers: Record<number, number> = { 1: 1.0, 2: 1.6, 3: 1.25 };
  const nicheLabels: Record<number, string> = { 1: "General", 2: "Military", 3: "Lifestyle" };
  const calcRate = (calcFollowers / 1000) * (calcEngagement / 5) * 18 * (nicheMultipliers[calcNiche] ?? 1);
  const calcLow = Math.round((calcRate * 0.7) / 50) * 50;
  const calcMid = Math.round(calcRate / 50) * 50;
  const calcHigh = Math.round((calcRate * 1.4) / 50) * 50;

  // Mock trend values
  const trends = ["+12.4%", "+0.3%", "+18.7%", "+8 new", "+22.1%", "+15.3%"];

  const displayName = isDemoUser
    ? "Johnny Rocket"
    : member?.creator_name ?? creatorProfile?.display_name ?? "Creator";
  const avatarUrl = member?.avatar_url ?? member?.ic_avatar_url ?? null;
  const category = member?.category ?? (isDemoUser ? "Military Lifestyle" : null);
  const niche = category;
  const tags = category
    ? category.split(/[,;]/).map((t) => t.trim()).filter(Boolean).slice(0, 3)
    : isDemoUser
      ? ["Military", "Lifestyle", "Veteran"]
      : [];

  /* ── Placeholder state ── */
  if (!loading && !member && !isDemoUser) {
    return (
      <CreatorLayout>
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">My Card</h1>
            <p className="text-muted-foreground text-sm">Your creator profile at a glance</p>
          </div>
          <Card className="bg-[#0f1f3d]/80 border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Users className="h-12 w-12 text-slate-500" />
              <p className="text-slate-300 text-center max-w-sm">
                Connect your social accounts to see your stats
              </p>
              <Button asChild className="bg-teal-500 hover:bg-teal-600 text-white">
                <Link to="/creator/socials">Connect Socials</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </CreatorLayout>
    );
  }

  return (
    <CreatorLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Card</h1>
          <p className="text-muted-foreground text-sm">Your creator profile at a glance</p>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ═══ LEFT COLUMN (3/5) — Profile + Stats ═══ */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="bg-[#0f1f3d]/80 border-white/10 overflow-hidden">
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                    <Skeleton className="h-5 w-40 mx-auto" />
                    <Skeleton className="h-4 w-28 mx-auto" />
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Avatar with spinning verified ring */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative mb-3">
                        <div
                          className="absolute inset-[-4px] rounded-full animate-spin"
                          style={{
                            border: "3px solid transparent",
                            borderTop: "3px solid #14b8a6",
                            borderRight: "3px solid #14b8a6",
                            animationDuration: "3s",
                            animationTimingFunction: "linear",
                            animationIterationCount: "infinite",
                          }}
                        />
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="h-20 w-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-2xl font-bold text-white">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <CheckCircle2 className="absolute -bottom-1 -right-1 h-6 w-6 text-teal-400 fill-[#0f1f3d]" />
                      </div>

                      <h2 className="text-xl font-bold text-white">{displayName}</h2>
                      <p className="text-sm text-slate-400">@{handle}</p>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                          {tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[11px] border-teal-500/40 text-teal-300 bg-teal-500/10"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Platform tabs */}
                    <div className="flex gap-1 mb-5 border-b border-white/10 pb-0">
                      {PLATFORM_TABS.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setActiveTab(tab.key)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-[1px]",
                            activeTab === tab.key
                              ? "border-teal-400 text-teal-300"
                              : "border-transparent text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Stats grid 2×3 */}
                    <div className="grid grid-cols-3 gap-4">
                      <StatItem label="Total Followers" value={fmtNum(stats.followers)} trend={trends[0]} delay={0} />
                      <StatItem label="Engagement Rate" value={stats.engagement.toFixed(1) + "%"} trend={trends[1]} delay={50} />
                      <StatItem label="Avg Reach" value={fmtNum(stats.reach)} trend={trends[2]} delay={100} />
                      <StatItem label="Posts" value={fmtNum(stats.posts)} trend={trends[3]} delay={150} />
                      <StatItem label="Profile Views" value={typeof stats.views === "string" ? stats.views : fmtNum(stats.views)} trend={trends[4]} delay={200} />
                      <StatItem label="Link Clicks" value={typeof stats.clicks === "string" ? stats.clicks : fmtNum(stats.clicks)} trend={trends[5]} delay={250} />
                    </div>

                    {/* Know Your Worth */}
                    <div className="mt-6 pt-5 border-t border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-white">Know your worth</p>
                        <p className="text-sm font-bold text-teal-300">
                          {fmtDollar(worthLow)} – {fmtDollar(worthHigh)}
                          <span className="text-[11px] text-slate-400 font-normal ml-1">/ post</span>
                        </p>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700"
                          style={{ width: `${Math.min(tierProgress, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        <span className="text-teal-300 font-medium">{tierLabel}</span>
                        {niche ? ` \u00B7 ${niche}` : ""}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═══ RIGHT COLUMN (2/5) — Rate Calculator + Top Posts ═══ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rate Calculator */}
            <Card className="bg-[#0f1f3d]/80 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Rate calculator</CardTitle>
                <p className="text-xs text-slate-400">Estimate your post rate</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Followers slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Followers</span>
                    <span className="text-white font-medium">{fmtNum(calcFollowers)}</span>
                  </div>
                  <Slider
                    value={[calcFollowers]}
                    onValueChange={([v]) => setCalcFollowers(v)}
                    min={10_000}
                    max={2_000_000}
                    step={10_000}
                    className="[&_[role=slider]]:bg-teal-400 [&_[role=slider]]:border-teal-400"
                  />
                </div>
                {/* Engagement slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Engagement Rate</span>
                    <span className="text-white font-medium">{calcEngagement.toFixed(1)}%</span>
                  </div>
                  <Slider
                    value={[calcEngagement * 10]}
                    onValueChange={([v]) => setCalcEngagement(v / 10)}
                    min={10}
                    max={200}
                    step={1}
                    className="[&_[role=slider]]:bg-teal-400 [&_[role=slider]]:border-teal-400"
                  />
                </div>
                {/* Niche slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Niche Premium</span>
                    <span className="text-white font-medium">{nicheLabels[calcNiche]}</span>
                  </div>
                  <Slider
                    value={[calcNiche]}
                    onValueChange={([v]) => setCalcNiche(v)}
                    min={1}
                    max={3}
                    step={1}
                    className="[&_[role=slider]]:bg-teal-400 [&_[role=slider]]:border-teal-400"
                  />
                </div>

                {/* Result */}
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Estimated Rate</p>
                  <p className="text-2xl font-bold text-white">{fmtDollar(calcMid)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Range: {fmtDollar(calcLow)} – {fmtDollar(calcHigh)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-teal-300 hover:text-teal-200 hover:bg-white/5 text-xs justify-center gap-1"
                >
                  How to increase my rate <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Top Posts */}
            <Card className="bg-[#0f1f3d]/80 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Top Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(isDemoUser ? DEMO_TOP_POSTS : []).map((post, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="mt-0.5">{platformEmoji(post.platform)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{post.title}</p>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {post.platform} &middot; {post.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                      <Heart className="h-3 w-3 text-rose-400" />
                      {fmtNum(post.likes)}
                    </div>
                  </div>
                ))}

                {!isDemoUser && (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No posts yet
                  </p>
                )}

                <Link
                  to="/creator/post"
                  className="flex items-center justify-center gap-1 text-xs text-teal-300 hover:text-teal-200 pt-1"
                >
                  View all posts <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CreatorLayout>
  );
}
