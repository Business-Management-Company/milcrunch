import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  ShieldCheck,
  BadgeCheck,
  Users,
  Mic2,
  BarChart3,
  Handshake,
  MapPin,
  Instagram,
  Youtube,
  Twitter,
  Pencil,
  Loader2,
  Save,
  Eye,
  Mic,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import PodcastDetailModal from "@/components/PodcastDetailModal";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import {
  formatFollowerCount,
  getInitials,
} from "@/lib/creators-db";
import {
  fetchShowcaseByDirectoryName,
  fetchFeaturedHomepageCreators,
  enrichHomepageHeroCreators,
  type ShowcaseCreator,
} from "@/lib/featured-creators";

// Hero background: clean group photo without baked-in social cards
const HERO_BG_IMAGE = "/home-hero-creators.png";

const AUDIENCE = [
  { label: "Veterans", icon: Shield },
  { label: "Military Spouses", icon: Users },
  { label: "Podcasters", icon: Mic2 },
  { label: "Content Creators", icon: BarChart3 },
  { label: "Brands", icon: Handshake },
];

const CATEGORIES: { label: string; image: string }[] = [
  { label: "Military Life", image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&q=80" },
  { label: "Fitness", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80" },
  { label: "Veterans", image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&q=80" },
  { label: "Lifestyle", image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80" },
  { label: "Podcasts", image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&q=80" },
  { label: "Business", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80" },
  { label: "Gaming", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80" },
  { label: "Education", image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80" },
  { label: "News & Politics", image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80" },
  { label: "All Creators", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80" },
];

const EVENTS = [
  { name: "MilSpouseFest San Diego", date: "Mar 15", location: "San Diego, CA", tag: "MilSpouseFest", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80" },
  { name: "MilCrunch at Fort Liberty", date: "Apr 5", location: "Fort Liberty, NC", tag: "Experience", image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80" },
  { name: "MIC 2026", date: "Sep", location: "Washington, DC", tag: "MIC", image: "https://images.unsplash.com/photo-1587825140708-dfaf18c4f2d4?w=600&q=80" },
  { name: "MilCrunch at VFW National", date: "Aug", location: "Louisville, KY", tag: "Experience", image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80" },
];

const BRAND_FEATURES = [
  { title: "AI Creator Discovery", desc: "Find verified military creators by branch, audience, niche, and engagement." },
  { title: "Sponsor Events", desc: "Attach your brand to MilCrunch events and get visibility across the community." },
  { title: "First-Party Data", desc: "Real audience insights from real interactions — not anonymous impressions." },
];

type PodcastRow = Database["public"]["Tables"]["podcasts"]["Row"];

// --- 365 Insights Preview data (3 series: impressions, engagement, community) ---
const INSIGHTS_CHART_DATA = [
  { month: "Sep", impressions: 320, engagement: 140, community: 800 },
  { month: "Oct", impressions: 410, engagement: 180, community: 920 },
  { month: "Nov", impressions: 680, engagement: 310, community: 1100 },  // MilSpouseFest
  { month: "Dec", impressions: 520, engagement: 260, community: 1250 },
  { month: "Jan", impressions: 440, engagement: 290, community: 1380 },
  { month: "Feb", impressions: 480, engagement: 320, community: 1500 },
  { month: "Mar", impressions: 920, engagement: 480, community: 1850 },  // MIC 2026
  { month: "Apr", impressions: 610, engagement: 390, community: 1980 },
  { month: "May", impressions: 750, engagement: 420, community: 2150 },  // MilSpouseFest
  { month: "Jun", impressions: 540, engagement: 360, community: 2280 },
  { month: "Jul", impressions: 490, engagement: 380, community: 2400 },
  { month: "Aug", impressions: 520, engagement: 400, community: 2520 },
];

const INSIGHTS_KPIS = [
  { value: 3400000, display: "3.4M", label: "Total Impressions", icon: Eye, color: "text-[#6C5CE7]", border: "border-l-[#6C5CE7]" },
  { value: 2400, display: "2,400", label: "Community Members", icon: Users, color: "text-[#3B82F6]", border: "border-l-[#3B82F6]" },
  { value: 1467, display: "1,467", label: "Active Creators", icon: Mic, color: "text-[#10B981]", border: "border-l-[#10B981]" },
  { value: 34, display: "+34%", label: "Year over Year Growth", icon: TrendingUp, color: "text-[#F59E0B]", border: "border-l-[#F59E0B]" },
];

function AnimatedCounter({ target, display, inView }: { target: number; display: string; inView: boolean }) {
  const [current, setCurrent] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const startTime = performance.now();
    let raf: number;

    const isPercentage = display.startsWith("+") && display.endsWith("%");
    const hasM = display.includes("M");

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      if (isPercentage) {
        const num = Math.round(eased * target);
        setCurrent(`+${num}%`);
      } else if (hasM) {
        const num = (eased * target / 1000000).toFixed(1);
        setCurrent(`${num}M`);
      } else {
        const num = Math.round(eased * target);
        setCurrent(num.toLocaleString());
      }

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, display]);

  return <span>{current}</span>;
}



// --- Showcase helpers ---
const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

const BRANCH_STYLES: Record<string, string> = {
  Army: "bg-green-800/10 text-green-800",
  Navy: "bg-blue-900/10 text-blue-900",
  "Air Force": "bg-sky-600/10 text-sky-700",
  Marines: "bg-red-700/10 text-red-700",
  "Coast Guard": "bg-orange-600/10 text-orange-700",
  "Space Force": "bg-indigo-600/10 text-indigo-700",
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-3.5 w-3.5" />,
  tiktok: <TikTokIcon className="h-3.5 w-3.5" />,
  youtube: <Youtube className="h-3.5 w-3.5" />,
  twitter: <Twitter className="h-3.5 w-3.5" />,
};

function HeroAvatar({ src, name, handle }: { src: string | null; name: string; handle: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD1] flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-100">
      {getInitials(name, handle)}
    </div>
  );
}

function ShowcaseCard({ creator: c, index, inView }: { creator: ShowcaseCreator; index: number; inView: boolean }) {
  const platforms = c.platforms ?? [];
  const branchStyle = BRANCH_STYLES[c.branch ?? ""] ?? "bg-gray-100 text-gray-700";

  // 3-tier fallback: Supabase Storage → Influencers.club URL → Initials
  const [imgSrc, setImgSrc] = useState<string | null>(c.avatar_url || c.ic_avatar_url || null);
  const [imgFailed, setImgFailed] = useState(false);
  const handleImgError = () => {
    if (imgSrc === c.avatar_url && c.ic_avatar_url && c.ic_avatar_url !== c.avatar_url) {
      setImgSrc(c.ic_avatar_url);
    } else {
      setImgFailed(true);
    }
  };
  const showImage = !!imgSrc && !imgFailed;

  return (
    <Link
      to={`/creators/${c.profile_slug || c.handle}`}
      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease-out ${index * 70}ms, transform 0.5s ease-out ${index * 70}ms, box-shadow 0.3s ease`,
      }}
    >
      {/* Purple gradient banner */}
      <div className="h-20 w-full bg-gradient-to-r from-[#6C5CE7] to-[#8B7CF7]" />

      {/* Avatar overlapping banner */}
      <div className="relative -mt-10 mb-3">
        <div
          className={`w-[72px] h-[72px] rounded-full overflow-hidden ${
            c.paradedeck_verified
              ? "ring-[3px] ring-purple-500 ring-offset-2"
              : "ring-1 ring-gray-200 ring-offset-2"
          } bg-white`}
        >
          {showImage ? (
            <img
              src={imgSrc!}
              alt={c.display_name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={handleImgError}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD1] flex items-center justify-center text-white font-bold text-lg">
              {getInitials(c.display_name, c.handle)}
            </div>
          )}
        </div>
      </div>

      {/* Name + verification badges */}
      <div className="flex items-center gap-1 mb-1.5 px-4">
        <h3 className="font-semibold text-[#1A1A2E] text-sm leading-tight break-words">
          {c.display_name}
        </h3>
        {c.paradedeck_verified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <ShieldCheck className="h-4 w-4 text-purple-500 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">MilCrunch Verified</TooltipContent>
          </Tooltip>
        )}
        {c.influencersclub_verified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Creator Verified</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Branch badge + Status */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap justify-center px-4">
        {c.branch && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${branchStyle}`}>
            {c.branch}
          </span>
        )}
        {c.status && (
          <span className="text-[10px] text-gray-500 font-medium">{c.status}</span>
        )}
      </div>

      {/* Follower count */}
      <p className="text-sm font-bold text-[#1A1A2E] mb-2 px-4">
        {formatFollowerCount(c.follower_count)}
        <span className="text-xs font-normal text-gray-400 ml-1">followers</span>
      </p>

      {/* Platform icons */}
      {platforms.length > 0 && (
        <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-500 transition-colors pb-5">
          {platforms.map((p) => (
            <span key={p}>{PLATFORM_ICON[p] ?? null}</span>
          ))}
        </div>
      )}
    </Link>
  );
}

// No hardcoded showcase fallback — homepage always pulls from featured_creators


// Editable homepage content fallbacks
const CONTENT_DEFAULTS: Record<string, string> = {
  hero_title: "Stop juggling your events, creators, sponsors, and media.",
  hero_subtitle: "MilCrunch brings it all into one command center — so you can focus on the mission.",
  events_title: "Events That Don't End When the Lights Go Off",
  events_subtitle: "MIC. MilSpouseFest. And more. Every event on MilCrunch extends into a year-round community — not just 3 days on Whova.",
  cta_text: "The military community doesn't stop. Neither should your platform.",
};

function useSiteContent(page: string) {
  const [content, setContent] = useState<Record<string, string>>(CONTENT_DEFAULTS);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("section, content")
          .eq("page", page);
        if (data && data.length > 0) {
          const map: Record<string, string> = { ...CONTENT_DEFAULTS };
          data.forEach((row: { section: string; content: string }) => {
            map[row.section] = row.content;
          });
          setContent(map);
        }
      } catch {
        // fallback to defaults
      }
    })();
  }, [page, version]);

  const refresh = () => setVersion((v) => v + 1);
  return { content, refresh };
}

function HomepageEditor({
  open,
  onOpenChange,
  current,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: Record<string, string>;
  onSaved: () => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setFields(current);
  }, [open, current]);

  const set = (key: string, val: string) => setFields((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [section, content] of Object.entries(fields)) {
        await supabase
          .from("site_content")
          .upsert(
            { page: "homepage", section, content, updated_at: new Date().toISOString() },
            { onConflict: "page,section" },
          );
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save homepage content:", err);
    } finally {
      setSaving(false);
    }
  };

  const FIELDS: { key: string; label: string; multiline?: boolean }[] = [
    { key: "hero_title", label: "Hero Title" },
    { key: "hero_subtitle", label: "Hero Subtitle", multiline: true },
    { key: "events_title", label: "Events Section Title" },
    { key: "events_subtitle", label: "Events Section Subtitle", multiline: true },
    { key: "cta_text", label: "Bottom CTA Text", multiline: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Homepage Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-xs font-medium">{f.label}</Label>
              {f.multiline ? (
                <Textarea
                  value={fields[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  value={fields[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-pd-blue hover:bg-pd-darkblue text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InsightsPreview() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-gray-50 py-20 px-6">
      <div ref={sectionRef} className="max-w-6xl mx-auto text-center">
        {/* Badge */}
        <span className="inline-block bg-purple-100 text-[#6C5CE7] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5">
          365 INSIGHTS
        </span>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Your events don't end when the lights go off.
        </h2>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-12">
          Track sponsor ROI, creator engagement, and community growth — 365 days a year.
        </p>

        {/* KPI Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 mb-10 justify-center">
          {INSIGHTS_KPIS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${kpi.border} p-5 text-left min-w-[180px] flex-shrink-0`}
              >
                <Icon className={`h-5 w-5 mb-2 ${kpi.color}`} />
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter target={kpi.value} display={kpi.display} inView={inView} />
                </p>
                <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        {/* Multi-line Chart */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-white shadow-sm p-6 mb-4">
          {/* Legend */}
          <div className="flex items-center justify-end gap-5 mb-4">
            {[
              { label: "Sponsor Impressions", color: "#6C5CE7" },
              { label: "Creator Engagement", color: "#10B981" },
              { label: "Community Growth", color: "#3B82F6" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={INSIGHTS_CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                  labelStyle={{ fontWeight: 600, color: "#374151" }}
                />
                {/* Event reference lines */}
                <ReferenceLine x="Nov" stroke="#9CA3AF" strokeDasharray="4 4" label={{ value: "MilSpouseFest", position: "top", fontSize: 9, fill: "#9CA3AF" }} />
                <ReferenceLine x="Mar" stroke="#9CA3AF" strokeDasharray="4 4" label={{ value: "MIC 2026", position: "top", fontSize: 9, fill: "#9CA3AF" }} />
                <ReferenceLine x="May" stroke="#9CA3AF" strokeDasharray="4 4" label={{ value: "MilSpouseFest", position: "top", fontSize: 9, fill: "#9CA3AF" }} />
                <Area type="monotone" dataKey="community" stroke="#3B82F6" strokeWidth={2} fill="url(#fillBlue)" dot={false} name="Community Growth" />
                <Area type="monotone" dataKey="impressions" stroke="#6C5CE7" strokeWidth={2} fill="url(#fillPurple)" dot={false} name="Sponsor Impressions" />
                <Area type="monotone" dataKey="engagement" stroke="#10B981" strokeWidth={2} fill="url(#fillEmerald)" dot={false} name="Creator Engagement" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Markers */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
            MIC 2026 — March 2026
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
            MilSpouseFest — Nov 2025 &amp; May 2026
          </span>
        </div>

        <p className="text-sm text-gray-400 mt-4">
          Powering insights for MIC, MilSpouseFest, and 10+ military events
        </p>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [podcasts, setPodcasts] = useState<PodcastRow[]>([]);
  const [podcastTotal, setPodcastTotal] = useState<number | null>(null);
  const [podcastsLoading, setPodcastsLoading] = useState(true);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastRow | null>(null);
  const [showcaseCreators, setShowcaseCreators] = useState<ShowcaseCreator[]>([]);
  const [showcaseInView, setShowcaseInView] = useState(false);
  const showcaseRef = useRef<HTMLDivElement>(null);
  type EventRow = Database["public"]["Tables"]["events"]["Row"];
  const [dbEvents, setDbEvents] = useState<EventRow[]>([]);
  const [heroCreators, setHeroCreators] = useState<ShowcaseCreator[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const { content: cms, refresh: refreshCms } = useSiteContent("homepage");
  const [editOpen, setEditOpen] = useState(false);
  const isSuperAdmin = user?.user_metadata?.role === "super_admin";

  useEffect(() => {
    (async () => {
      const { data, count } = await supabase
        .from("podcasts")
        .select("*", { count: "exact" })
        .eq("status", "active")
        .order("title", { ascending: true })
        .range(0, 17);
      setPodcasts(data ?? []);
      setPodcastTotal(count ?? 0);
      setPodcastsLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .order("start_date", { ascending: true })
        .limit(4);
      setDbEvents(data ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const featured = await fetchFeaturedHomepageCreators();
      setHeroCreators(featured);
      setHeroLoading(false);
      // Enrich with live Influencers.club data (uses 7-day cache)
      const enriched = await enrichHomepageHeroCreators(featured);
      setHeroCreators(enriched);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const showcase = await fetchShowcaseByDirectoryName("Military Creator Network", 25);
      setShowcaseCreators(showcase);
    })();
  }, []);

  // Intersection Observer for showcase animation
  useEffect(() => {
    const el = showcaseRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShowcaseInView(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1A1A2E]">
      <PublicNav />

      {/* Admin: Edit Homepage — only in admin panel, not public homepage */}

      <main>
        {/* Hero */}
        <section className="relative min-h-screen flex items-center px-4 md:px-8 pt-20 pb-0 overflow-hidden">
          {/* Background image + dark overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${HERO_BG_IMAGE}")` }}
          />
          <div className="absolute inset-0" style={{ background: "rgba(26, 26, 46, 0.55)" }} />
          {/* Bottom gradient fade into next section */}
          <div className="absolute bottom-0 left-0 right-0 h-[80px] z-[5]" style={{ background: "linear-gradient(to bottom, transparent, rgba(249,250,251,0.6))" }} />

          <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
            {/* LEFT — Text content */}
            <div className="flex-1 lg:max-w-[55%] text-center lg:text-left">
              {/* Status pill */}
              <div className="bg-white/10 backdrop-blur-sm text-white text-sm rounded-full px-4 py-1.5 inline-flex items-center gap-2 mb-8">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                1,000+ verified military creators
              </div>

              <h1 className="text-3xl md:text-5xl font-bold leading-[1.15] mb-6 text-white">
                Where the military and veteran community comes to be seen, heard, and understood.
              </h1>

              <p className="text-gray-300 text-lg md:text-xl max-w-xl mt-6 mb-8 mx-auto lg:mx-0">
                Verified influencers, podcasters, and creators. Live events. Year-round community. All-in-one network.
              </p>

              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link to="/plans">
                  <Button size="lg" className="bg-[#6C5CE7] text-white rounded-full px-8 py-3 font-semibold hover:bg-[#5B4BD1]">
                    Join the Network →
                  </Button>
                </Link>
                <Link to="/creators">
                  <Button size="lg" variant="outline" className="border border-white/30 text-white rounded-full px-8 py-3 font-semibold hover:bg-white/10 bg-transparent">
                    Explore Creators
                  </Button>
                </Link>
              </div>
            </div>

            {/* RIGHT — Cascading creator cards */}
            <div className="hidden lg:flex flex-1 justify-center items-center">
              <div className="relative" style={{ animation: "heroFloat 5s ease-in-out infinite" }}>
                {(() => {
                  const CARD_STYLES = [
                    { z: "z-30", shadow: "shadow-2xl", mt: "", ml: "ml-[60px]" },
                    { z: "z-20", shadow: "shadow-xl", mt: "mt-[-10px]", ml: "ml-[0px]" },
                    { z: "z-10", shadow: "shadow-lg", mt: "mt-[-10px]", ml: "ml-[60px]" },
                  ];

                  if (heroLoading || heroCreators.length === 0) {
                    return CARD_STYLES.map((style, i) => (
                      <div key={i} className={`relative ${style.z} bg-white/80 rounded-2xl ${style.shadow} border border-gray-100 w-[420px] px-5 py-2.5 ${style.mt} ${style.ml} animate-pulse`}>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-gray-200" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-28" />
                            <div className="h-3 bg-gray-100 rounded w-20" />
                          </div>
                          <div className="h-6 bg-gray-100 rounded-full w-16" />
                        </div>
                        <div className="border-t border-gray-100 mt-2 pt-2 grid grid-cols-4 gap-3">
                          {[0, 1, 2, 3].map((j) => (
                            <div key={j}>
                              <div className="h-4 bg-gray-200 rounded w-12 mb-1" />
                              <div className="h-2 bg-gray-100 rounded w-14" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  }

                  return heroCreators.slice(0, 3).map((db, i) => {
                    const style = CARD_STYLES[i];
                    const avatar = db.avatar_url || db.ic_avatar_url || null;
                    // Exactly 4 stats: Followers, Engagement Rate, Number of Posts, Avg Comments
                    const followers = db.follower_count != null ? formatFollowerCount(db.follower_count) : "—";
                    const engagement = db.engagement_rate != null ? `${db.engagement_rate.toFixed(2)}%` : "—";
                    const posts = db.post_count != null ? String(db.post_count) : "—";
                    const avgComments = db.avg_comments != null ? String(db.avg_comments) : "—";

                    const stats: { value: string; label: string; color: string }[] = [
                      { value: followers, label: "Followers", color: "text-gray-900" },
                      { value: engagement, label: "Engagement", color: "text-teal-500" },
                      { value: posts, label: "Posts", color: "text-gray-900" },
                      { value: avgComments, label: "Avg Comments", color: "text-gray-900" },
                    ];

                    return (
                      <div key={db.id} className={`relative ${style.z} bg-white rounded-2xl ${style.shadow} border border-gray-100 w-[420px] px-5 py-2.5 ${style.mt} ${style.ml}`}>
                        <div className="flex items-center gap-4">
                          <HeroAvatar src={avatar} name={db.display_name} handle={db.handle} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[17px] text-gray-900">{db.display_name}</p>
                            <p className="text-[14px] text-gray-400">@{db.handle}</p>
                          </div>
                          {db.category && (
                            <span className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">{db.category}</span>
                          )}
                        </div>
                        {stats.length > 0 && (
                          <div className="border-t border-gray-100 mt-2 pt-2 grid grid-cols-4 gap-x-3 gap-y-2">
                            {stats.map((s) => (
                              <div key={s.label}>
                                <p className={`text-[16px] font-bold ${s.color} leading-tight`}>{s.value}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          <style>{`
            @keyframes heroFloat {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
          `}</style>
        </section>

        {/* Built For Those Who Serve & Create */}
        <section
          className="relative z-10 py-20 px-8 text-center bg-gray-50 border-y border-gray-200"
        >
          <h2 className="text-center text-[#1A1A2E] font-bold mb-12 text-[2rem]">
            Built For Those Who Serve & Create
          </h2>
          <p className="text-center text-gray-500 mx-auto mb-12 text-[1.1rem]">
            Whether you wore the uniform or support those who did
          </p>
          <div className="flex flex-wrap justify-center items-start gap-16 mb-12">
            {AUDIENCE.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center cursor-default transition-transform duration-200 hover:scale-110"
              >
                <Icon className="h-12 w-12 text-[#6C5CE7] shrink-0" aria-hidden />
                <span className="text-[#1A1A2E] font-medium mt-3 text-base">
                  {label}
                </span>
              </div>
            ))}
          </div>

        </section>

        {/* Verified Military Creator Showcase */}
        <section id="creators" className="px-4 md:px-8 py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[#6C5CE7] text-xs font-semibold uppercase tracking-widest mb-3">
                TRUSTED BY BRANDS NATIONWIDE
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A2E] mb-3">
                Our Verified Military Creator Network
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Trusted voices. Verified service. Ready for your brand.
              </p>
            </div>

            <div ref={showcaseRef} className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-5">
              {showcaseCreators.length > 0 ? (
                showcaseCreators.map((c, i) => (
                  <ShowcaseCard key={c.id} creator={c} index={i} inView={showcaseInView} />
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500 py-12 text-lg">
                  Creators coming soon — check back shortly.
                </p>
              )}
            </div>

            <div className="text-center mt-8">
              <Link to="/onboard">
                <button className="border border-[#6C5CE7] text-[#6C5CE7] hover:bg-purple-50 rounded-full px-6 py-2 font-medium transition-colors">
                  View More Creators &rarr;
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Browse by Category — hidden until we have ≥3 creators per category with real data */}
        {false && (
        <section id="features" className="px-4 md:px-8 py-16 md:py-20 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="text-[#6C5CE7] text-xs font-semibold uppercase tracking-widest mb-2">
                  DISCOVER CREATORS
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1A2E]">
                  Browse by Category
                </h2>
              </div>
              <Link to="/brand/discover" className="text-[#6C5CE7] font-medium hover:underline text-sm">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  to={`/brand/discover?q=${encodeURIComponent(cat.label)}`}
                  className="group relative h-[200px] rounded-xl overflow-hidden flex items-end p-5 transition-transform duration-300 hover:scale-[1.03]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url("${cat.image}")` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/5 group-hover:from-black/70 group-hover:via-black/30 transition-colors" />
                  <div className="relative flex items-center gap-2 text-white">
                    <Users className="h-5 w-5 shrink-0 opacity-90" />
                    <span className="font-bold text-base">{cat.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Military Podcast Network */}
        <section className="px-4 md:px-8 py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-2">
              Military Podcast Network
            </h2>
            <p className="text-gray-500 text-lg mb-8">
              825+ military and veteran voices — streaming 24/7
            </p>

            {podcastsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-square" />
                ))}
              </div>
            ) : podcasts.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No podcasts yet. Check back soon.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {podcasts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPodcast(p)}
                    className="rounded-xl shadow-sm bg-white border border-gray-100 overflow-hidden hover:shadow-md transition-shadow text-left"
                  >
                    {(p.image_url || p.artwork_url) ? (
                      <img
                        src={(p.image_url || p.artwork_url)!}
                        alt=""
                        className="aspect-square w-full object-cover rounded-t-xl"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      className={`aspect-square w-full rounded-t-xl bg-[#6C5CE7] flex items-center justify-center ${
                        (p.image_url || p.artwork_url) ? "hidden" : ""
                      }`}
                    >
                      <Mic2 className="h-10 w-10 text-white/80" />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-[#1A1A2E] line-clamp-2" title={p.title ?? undefined}>
                        {p.title ?? "Untitled"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="text-center mt-8">
              <Link to="/podcasts" className="text-[#6C5CE7] font-medium hover:underline">
                View All Podcasts →
              </Link>
            </div>
          </div>
        </section>

        {/* Events */}
        <section id="events" className="px-4 md:px-8 py-16 md:py-20 bg-gray-50 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-2">
              {cms.events_title}
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl">
              {cms.events_subtitle}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {(dbEvents.length > 0 ? dbEvents : EVENTS).map((event: any) => {
                const title = event.title ?? event.name;
                const imgSrc = event.cover_image_url || event.image_url || event.image || null;
                const dateStr = event.start_date
                  ? new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : event.date ?? "";
                const location = [event.city, event.state].filter(Boolean).join(", ") || event.location || "";
                const tag = event.event_type ?? event.tag ?? "";

                return (
                  <Link
                    to={`/events/${event.id}`}
                    key={event.id ?? title}
                    className="rounded-xl border border-[#E5E7EB] bg-white flex flex-col shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
                  >
                    {/* Cover image with fallback */}
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt={title}
                        className="h-52 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          (e.currentTarget.nextElementSibling as HTMLElement | null)!.style.display = "flex";
                        }}
                      />
                    )}
                    <div
                      className="h-52 w-full bg-gradient-to-r from-[#6C5CE7] to-[#1A1A2E] items-center justify-center px-4"
                      style={{ display: imgSrc ? "none" : "flex" }}
                    >
                      <span className="text-white font-semibold text-center text-sm">{title}</span>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      {tag && (
                        <span className="inline-block text-xs font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 rounded-full px-2.5 py-0.5 w-fit mb-2">
                          {tag}
                        </span>
                      )}
                      <h3 className="font-semibold text-[#1A1A2E] mb-1">{title}</h3>
                      {dateStr && <p className="text-sm text-gray-500 mb-1">{dateStr}</p>}
                      {location && (
                        <p className="text-sm text-gray-600 flex items-center gap-1 mb-4">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {location}
                        </p>
                      )}
                      <Button size="sm" className="rounded-lg mt-auto w-full pointer-events-none">
                        Join Event
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link to="/events" className="text-[#6C5CE7] font-medium hover:underline">
              View All Events →
            </Link>
          </div>
        </section>

        {/* 365 Insights Preview */}
        <InsightsPreview />

        {/* For Brands */}
        <section id="for-brands" className="px-4 md:px-8 py-16 md:py-20 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-8">
              Reach the Military Community Year-Round
            </h2>
            <div className="grid md:grid-cols-3 gap-8 mb-10">
              {BRAND_FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-[#1A1A2E] mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
            <Link to="/brand/discover">
              <Button size="lg" className="rounded-lg bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white">
                Discover Creators
              </Button>
            </Link>
          </div>
        </section>

        {/* Bottom CTA banner */}
        <section className="px-4 md:px-8 py-14 md:py-20 bg-gray-50 border-t border-gray-200">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xl md:text-2xl font-semibold text-[#1A1A2E] mb-6">
              {cms.cta_text}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/brand/discover">
                <Button size="lg" className="rounded-lg bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white px-8">
                  Join Free
                </Button>
              </Link>
              <Link to="/brand/events/create">
                <Button size="lg" variant="outline" className="rounded-lg px-8 border-gray-300 text-[#1A1A2E] hover:bg-gray-100">
                  Create an Event
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <PublicFooter />
      </main>
      <PodcastDetailModal
        podcast={selectedPodcast}
        open={!!selectedPodcast}
        onOpenChange={(open) => { if (!open) setSelectedPodcast(null); }}
      />
    </div>
  );
}

