import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun,
  Shield,
  ShieldCheck,
  BadgeCheck,
  Users,
  Mic2,
  BarChart3,
  Handshake,
  MapPin,
  Search,
  Instagram,
  Youtube,
  Twitter,
  Play,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchFeaturedHero,
  fetchFeaturedGrid,
  formatFollowerCount,
  getInitials,
  type CreatorRow,
} from "@/lib/creators-db";
import {
  fetchShowcaseCreators,
  type ShowcaseCreator,
} from "@/lib/featured-creators";

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force"];

// Hero background: MIl-Crunch-Hero includes embedded social cards
const HERO_BG_IMAGE = "/MIl-Crunch-Hero.png";

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
  { name: "MilSpouseFest San Diego", date: "Mar 15", location: "San Diego, CA", tag: "MilSpouseFest" },
  { name: "PDX at Fort Liberty", date: "Apr 5", location: "Fort Liberty, NC", tag: "PDX" },
  { name: "MIC 2026", date: "Sep", location: "Washington, DC", tag: "MIC" },
  { name: "PDX at VFW National", date: "Aug", location: "Louisville, KY", tag: "PDX" },
];

const BRAND_FEATURES = [
  { title: "AI Creator Discovery", desc: "Find verified military creators by branch, audience, niche, and engagement." },
  { title: "Sponsor Events", desc: "Attach your brand to PDX events and get visibility across the community." },
  { title: "First-Party Data", desc: "Real audience insights from real interactions — not anonymous impressions." },
];

type PodcastRow = Database["public"]["Tables"]["podcasts"]["Row"];

const HERO_FALLBACK: CreatorRow[] = [
  { id: "1", display_name: "Jason S.", handle: "savagekingdomboerboels", platform: "instagram", avatar_url: null, follower_count: 359100, engagement_rate: 3.2, category: "Veterans", bio: null, location: null, is_verified: false, is_featured: true, featured_section: "hero", featured_sort_order: 0, created_at: null },
  { id: "2", display_name: "Kevin W.", handle: "wheelchairkev", platform: "instagram", avatar_url: null, follower_count: 353100, engagement_rate: 4.8, category: "Motivation", bio: null, location: null, is_verified: false, is_featured: true, featured_section: "hero", featured_sort_order: 1, created_at: null },
  { id: "3", display_name: "Taylor S.", handle: "tsyontz", platform: "instagram", avatar_url: null, follower_count: 96800, engagement_rate: 2.1, category: "Military", bio: null, location: null, is_verified: false, is_featured: true, featured_section: "hero", featured_sort_order: 2, created_at: null },
];


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
      to={`/creator/${c.profile_slug || c.handle}`}
      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col items-center text-center"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease-out ${index * 70}ms, transform 0.5s ease-out ${index * 70}ms, box-shadow 0.3s ease`,
      }}
    >
      {/* Avatar with green verified ring */}
      <div className="relative mb-3">
        <div
          className={`w-[72px] h-[72px] rounded-full overflow-hidden ${
            c.paradedeck_verified
              ? "ring-[3px] ring-emerald-500 ring-offset-2"
              : "ring-1 ring-gray-200"
          }`}
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
            <div className="w-full h-full bg-gradient-to-br from-[#0064B1] to-[#053877] flex items-center justify-center text-white font-bold text-lg">
              {getInitials(c.display_name, c.handle)}
            </div>
          )}
        </div>
      </div>

      {/* Name + verification badges */}
      <div className="flex items-center gap-1 mb-1.5">
        <h3 className="font-semibold text-[#000741] text-sm leading-tight truncate max-w-[120px]">
          {c.display_name}
        </h3>
        {c.paradedeck_verified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
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
      <div className="flex items-center gap-1.5 mb-2 flex-wrap justify-center">
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
      <p className="text-sm font-bold text-[#000741] mb-2">
        {formatFollowerCount(c.follower_count)}
        <span className="text-xs font-normal text-gray-400 ml-1">followers</span>
      </p>

      {/* Platform icons */}
      {platforms.length > 0 && (
        <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-500 transition-colors">
          {platforms.map((p) => (
            <span key={p}>{PLATFORM_ICON[p] ?? null}</span>
          ))}
        </div>
      )}
    </Link>
  );
}

// --- Showcase fallback data (used before DB is seeded) ---
const SHOWCASE_FALLBACK: ShowcaseCreator[] = [
  { id: "s1", display_name: "MCRD San Diego", handle: "mcrdsd", platform: "instagram", avatar_url: null, follower_count: 487000, engagement_rate: 4.1, category: "Military Life", sort_order: 1, is_active: true, is_verified: true, created_at: null, branch: "Marines", status: "Active Duty", bio: null, platforms: ["instagram", "tiktok", "youtube"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "mcrdsd", ic_avatar_url: null },
  { id: "s2", display_name: "Tabor Robak", handle: "taborrobak", platform: "instagram", avatar_url: null, follower_count: 156000, engagement_rate: 3.5, category: "Lifestyle", sort_order: 2, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Veteran", bio: null, platforms: ["instagram", "youtube"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "taborrobak", ic_avatar_url: null },
  { id: "s3", display_name: "USA Born TV", handle: "usaborntv", platform: "instagram", avatar_url: null, follower_count: 892000, engagement_rate: 5.2, category: "Patriotic", sort_order: 3, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Veteran", bio: null, platforms: ["instagram", "tiktok", "youtube", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "usaborntv", ic_avatar_url: null },
  { id: "s4", display_name: "Veteran Style Coach", handle: "veteranstylecoach", platform: "instagram", avatar_url: null, follower_count: 73000, engagement_rate: 4.8, category: "Fashion", sort_order: 4, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Veteran", bio: null, platforms: ["instagram", "tiktok"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "veteranstylecoach", ic_avatar_url: null },
  { id: "s5", display_name: "Matt Best", handle: "mattbest11x", platform: "instagram", avatar_url: null, follower_count: 1200000, engagement_rate: 6.1, category: "Comedy", sort_order: 5, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Veteran", bio: null, platforms: ["instagram", "youtube", "tiktok", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "mattbest11x", ic_avatar_url: null },
  { id: "s6", display_name: "Angry Cops", handle: "angrycops", platform: "instagram", avatar_url: null, follower_count: 2100000, engagement_rate: 5.8, category: "Comedy", sort_order: 6, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Veteran", bio: null, platforms: ["instagram", "youtube", "tiktok"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "angrycops", ic_avatar_url: null },
  { id: "s7", display_name: "Jocko Willink", handle: "jockowillink", platform: "instagram", avatar_url: null, follower_count: 3100000, engagement_rate: 3.9, category: "Leadership", sort_order: 7, is_active: true, is_verified: true, created_at: null, branch: "Navy", status: "Veteran", bio: null, platforms: ["instagram", "youtube", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "jockowillink", ic_avatar_url: null },
  { id: "s8", display_name: "Combat Flip Flops", handle: "combatflipflops", platform: "instagram", avatar_url: null, follower_count: 89000, engagement_rate: 3.4, category: "Business", sort_order: 8, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Veteran", bio: null, platforms: ["instagram", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "combatflipflops", ic_avatar_url: null },
  { id: "s9", display_name: "Donut Operator", handle: "doaboroperator", platform: "instagram", avatar_url: null, follower_count: 1400000, engagement_rate: 5.3, category: "Law & Military", sort_order: 9, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Veteran", bio: null, platforms: ["instagram", "youtube", "tiktok"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "donutoperator", ic_avatar_url: null },
  { id: "s10", display_name: "Dakota Meyer", handle: "dakotameyer", platform: "instagram", avatar_url: null, follower_count: 356000, engagement_rate: 4.2, category: "Veteran Life", sort_order: 10, is_active: true, is_verified: true, created_at: null, branch: "Marines", status: "Veteran", bio: null, platforms: ["instagram", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "dakotameyer", ic_avatar_url: null },
  { id: "s11", display_name: "Joey Jones", handle: "johnny_joey_jones", platform: "instagram", avatar_url: null, follower_count: 245000, engagement_rate: 4.6, category: "News", sort_order: 11, is_active: true, is_verified: true, created_at: null, branch: "Marines", status: "Veteran", bio: null, platforms: ["instagram", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "johnny_joey_jones", ic_avatar_url: null },
  { id: "s12", display_name: "Black Rifle Coffee", handle: "blackriflecoffee", platform: "instagram", avatar_url: null, follower_count: 1800000, engagement_rate: 4.0, category: "Business", sort_order: 12, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Veteran", bio: null, platforms: ["instagram", "youtube", "tiktok", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "blackriflecoffee", ic_avatar_url: null },
  { id: "s13", display_name: "Empowered MilSpouse", handle: "empoweredmilspouse", platform: "instagram", avatar_url: null, follower_count: 118000, engagement_rate: 5.7, category: "Lifestyle", sort_order: 13, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Spouse", bio: null, platforms: ["instagram", "tiktok"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "empoweredmilspouse", ic_avatar_url: null },
  { id: "s14", display_name: "Rachel of Honor", handle: "rachelofhonor", platform: "instagram", avatar_url: null, follower_count: 95000, engagement_rate: 6.3, category: "Family", sort_order: 14, is_active: true, is_verified: true, created_at: null, branch: "Navy", status: "Spouse", bio: null, platforms: ["instagram", "youtube", "tiktok"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "rachelofhonor", ic_avatar_url: null },
  { id: "s15", display_name: "SemperFi Fitness", handle: "semperfifitness", platform: "instagram", avatar_url: null, follower_count: 204000, engagement_rate: 5.1, category: "Fitness", sort_order: 15, is_active: true, is_verified: true, created_at: null, branch: "Marines", status: "Veteran", bio: null, platforms: ["instagram", "youtube", "tiktok"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "semperfifitness", ic_avatar_url: null },
  { id: "s16", display_name: "Air Force Amy", handle: "airforceamy", platform: "instagram", avatar_url: null, follower_count: 167000, engagement_rate: 4.4, category: "Lifestyle", sort_order: 16, is_active: true, is_verified: true, created_at: null, branch: "Air Force", status: "Veteran", bio: null, platforms: ["instagram", "tiktok", "youtube"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "airforceamy", ic_avatar_url: null },
  { id: "s17", display_name: "Navy Dave", handle: "navydave_", platform: "instagram", avatar_url: null, follower_count: 312000, engagement_rate: 4.7, category: "Military Life", sort_order: 17, is_active: true, is_verified: true, created_at: null, branch: "Navy", status: "Veteran", bio: null, platforms: ["instagram", "youtube", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "navydave_", ic_avatar_url: null },
  { id: "s18", display_name: "Coast Guard Katie", handle: "coastguardkatie", platform: "instagram", avatar_url: null, follower_count: 54000, engagement_rate: 6.8, category: "Adventure", sort_order: 18, is_active: true, is_verified: true, created_at: null, branch: "Coast Guard", status: "Active Duty", bio: null, platforms: ["instagram", "tiktok"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "coastguardkatie", ic_avatar_url: null },
  { id: "s19", display_name: "SpaceForce Steve", handle: "spaceforce_steve", platform: "instagram", avatar_url: null, follower_count: 78000, engagement_rate: 5.5, category: "Tech", sort_order: 19, is_active: true, is_verified: true, created_at: null, branch: "Space Force", status: "Active Duty", bio: null, platforms: ["instagram", "youtube", "twitter"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "spaceforce_steve", ic_avatar_url: null },
  { id: "s20", display_name: "Military Mama", handle: "militarymama_", platform: "instagram", avatar_url: null, follower_count: 186000, engagement_rate: 5.9, category: "Family", sort_order: 20, is_active: true, is_verified: true, created_at: null, branch: "Army", status: "Spouse", bio: null, platforms: ["instagram", "tiktok", "youtube"], paradedeck_verified: true, influencersclub_verified: true, profile_slug: "militarymama_", ic_avatar_url: null },
];

const GRID_FALLBACK: CreatorRow[] = [
  { id: "g1", display_name: "Jason", handle: "savagekingdomboerboels", platform: "instagram", avatar_url: null, follower_count: 359100, engagement_rate: 3.2, category: "Veterans", bio: null, location: null, is_verified: true, is_featured: true, featured_section: "grid", featured_sort_order: 0, created_at: null },
  { id: "g2", display_name: "Kevin", handle: "wheelchairkev", platform: "instagram", avatar_url: null, follower_count: 353100, engagement_rate: 4.8, category: "Motivation", bio: null, location: null, is_verified: true, is_featured: true, featured_section: "grid", featured_sort_order: 1, created_at: null },
  { id: "g3", display_name: "Sven", handle: "badasscounseling", platform: "instagram", avatar_url: null, follower_count: 164600, engagement_rate: 2.5, category: "Lifestyle", bio: null, location: null, is_verified: false, is_featured: true, featured_section: "grid", featured_sort_order: 2, created_at: null },
  { id: "g4", display_name: "David", handle: "frommilitarytomillionaire", platform: "instagram", avatar_url: null, follower_count: 107900, engagement_rate: 2.8, category: "Military", bio: null, location: null, is_verified: true, is_featured: true, featured_section: "grid", featured_sort_order: 3, created_at: null },
  { id: "g5", display_name: "Taylor", handle: "tsyontz", platform: "instagram", avatar_url: null, follower_count: 96800, engagement_rate: 2.1, category: "Military", bio: null, location: null, is_verified: false, is_featured: true, featured_section: "grid", featured_sort_order: 4, created_at: null },
  { id: "g6", display_name: "Jon", handle: "itsjonlynch", platform: "instagram", avatar_url: null, follower_count: 88600, engagement_rate: 3.0, category: "Military", bio: null, location: null, is_verified: false, is_featured: true, featured_section: "grid", featured_sort_order: 5, created_at: null },
  { id: "g7", display_name: "Chive Charities", handle: "chivecharities", platform: "instagram", avatar_url: null, follower_count: 43100, engagement_rate: 4.1, category: "Veterans", bio: null, location: null, is_verified: true, is_featured: true, featured_section: "grid", featured_sort_order: 6, created_at: null },
  { id: "g8", display_name: "Kashi", handle: "hopefor22aday_kashi", platform: "instagram", avatar_url: null, follower_count: 42000, engagement_rate: 2.9, category: "Military", bio: null, location: null, is_verified: false, is_featured: true, featured_section: "grid", featured_sort_order: 7, created_at: null },
];

export default function HomePage() {
  const { user, loading: authLoading, getRedirectPath } = useAuth();
  const navigate = useNavigate();
  const [navScrolled, setNavScrolled] = useState(false);
  const [podcasts, setPodcasts] = useState<PodcastRow[]>([]);
  const [podcastTotal, setPodcastTotal] = useState<number | null>(null);
  const [podcastsLoading, setPodcastsLoading] = useState(true);
  const [heroCreatorsDb, setHeroCreatorsDb] = useState<CreatorRow[]>(HERO_FALLBACK);
  const [gridCreators, setGridCreators] = useState<CreatorRow[]>([]);
  const [showcaseCreators, setShowcaseCreators] = useState<ShowcaseCreator[]>([]);
  const [showcaseInView, setShowcaseInView] = useState(false);
  const showcaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data, count } = await supabase
        .from("podcasts")
        .select("*", { count: "exact" })
        .eq("status", "active")
        .order("title", { ascending: true })
        .range(0, 7);
      setPodcasts(data ?? []);
      setPodcastTotal(count ?? 0);
      setPodcastsLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [hero, grid, showcase] = await Promise.all([
        fetchFeaturedHero(3),
        fetchFeaturedGrid(8),
        fetchShowcaseCreators(20),
      ]);
      setHeroCreatorsDb(hero.length >= 3 ? hero : HERO_FALLBACK);
      setGridCreators(grid.length > 0 ? grid : GRID_FALLBACK);
      setShowcaseCreators(showcase.length > 0 ? showcase : SHOWCASE_FALLBACK);
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  const navLinkClass = navScrolled
    ? "text-gray-600 hover:text-[#0064B1]"
    : "text-white/90 hover:text-white";

  return (
    <div className="min-h-screen bg-white text-[#000741]">
      {/* Nav — transparent on hero, solid white with border on scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 md:px-8 transition-all duration-300 ${
          navScrolled ? "bg-white/95 backdrop-blur-md border-b border-gray-200" : "bg-transparent"
        }`}
      >
        <Link to="/" className="shrink-0">
          <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className={navScrolled ? "text-[#000741]" : "text-white"}>Mil</span>
            <span className="text-[#10B981]">Crunch</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
          <a href="/#creators" className={`text-sm font-medium ${navLinkClass}`}>Creators</a>
          <a href="/#events" className={`text-sm font-medium ${navLinkClass}`}>Events</a>
          <Link to="/swag" className={`text-sm font-medium ${navLinkClass}`}>SWAG</Link>
          <Link to="/speakers" className={`text-sm font-medium ${navLinkClass}`}>Speakers</Link>
          <a href="/#features" className={`text-sm font-medium ${navLinkClass}`}>Features</a>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-gray-400 p-1.5" aria-hidden><Sun className="h-4 w-4" /></span>
          <Link to="/login" className={`text-sm font-medium ${navLinkClass}`}>
            Sign In
          </Link>
          {user ? (
            <Button
              size="sm"
              className="rounded-lg bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white px-5 py-2 font-semibold"
              onClick={() => {
                const path = getRedirectPath();
                if (path) navigate(path);
                else navigate("/creator/dashboard");
              }}
            >
              Get Started →
            </Button>
          ) : (
            <Link to="/signup">
              <Button size="sm" className="rounded-lg bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white px-5 py-2 font-semibold">
                Get Started →
              </Button>
            </Link>
          )}
          <Link to="/signup">
            <Button size="sm" variant="outline" className="rounded-lg px-5 py-2 font-semibold">
              Become a Creator
            </Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero — full-width background image + overlay, floating creator cards */}
        <section className="relative min-h-[95vh] flex flex-col md:flex-row items-center justify-center px-4 md:px-8 pt-20 pb-24 overflow-hidden">
          {/* Background: full-width photo + dark navy overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${HERO_BG_IMAGE}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Dark overlay — light enough to let the hero photo show through */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(27,42,74,0.40) 0%, rgba(25,55,65,0.25) 100%)",
            }}
          />
          <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-8">
            {/* Left 60% — badge, headline, subtitle, CTAs, branch chips */}
            <div className="flex-1 md:max-w-[65%] text-center md:text-left">
              <div className="inline-flex items-center rounded-full bg-white/10 border border-white/10 px-4 py-1.5 mb-6">
                <span className="text-[#F0A71F] text-xs font-semibold uppercase tracking-wide">
                  ☆ THE MILITARY CREATOR NETWORK
                </span>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                Stop juggling your events, creators, sponsors, and media.
              </h1>
              <p className="text-white/90 text-base md:text-lg max-w-[600px] mb-8">
                MilCrunch brings it all into one command center — so you can focus on the mission.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
                {user ? (
                  <Button
                    size="lg"
                    className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 font-semibold"
                    onClick={() => {
                      const path = getRedirectPath();
                      if (path) navigate(path);
                      else navigate("/creator/dashboard");
                    }}
                  >
                    Get Started →
                  </Button>
                ) : (
                  <Link to="/signup">
                    <Button size="lg" className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 font-semibold">
                      Get Started →
                    </Button>
                  </Link>
                )}
                <a href="/#creators">
                  <Button size="lg" variant="outline" className="rounded-lg bg-transparent hover:bg-white/10 border-white/40 text-white px-6 py-3 font-medium inline-flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Browse Creators
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {BRANCHES.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    className="rounded-full bg-white/10 border border-white/20 text-white/80 px-4 py-1.5 text-sm font-medium hover:bg-white/15 transition-colors"
                  >
                    {branch}
                  </button>
                ))}
              </div>
            </div>
            </div>
        </section>

        {/* Built For Those Who Serve & Create */}
        <section
          className="relative z-10 py-20 px-8 text-center"
          style={{ background: "#1B2A4A" }}
        >
          <h2 className="text-center text-white font-bold mb-12 text-[2rem]">
            Built For Those Who Serve & Create
          </h2>
          <p className="text-center text-gray-400 mx-auto mb-12 text-[1.1rem]">
            Whether you wore the uniform or support those who did
          </p>
          <div className="flex flex-wrap justify-center items-start gap-16">
            {AUDIENCE.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center cursor-default transition-transform duration-200 hover:scale-110"
              >
                <Icon className="h-12 w-12 text-[#F0A71F] shrink-0" aria-hidden />
                <span className="text-white font-medium mt-3 text-base">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Browse by Category */}
        <section id="features" className="px-4 md:px-8 py-16 md:py-20 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="text-[#0064B1] text-xs font-semibold uppercase tracking-widest mb-2">
                  DISCOVER CREATORS
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#000741]">
                  Browse by Category
                </h2>
              </div>
              <Link to="/brand/discover" className="text-[#0064B1] font-medium hover:underline text-sm">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  to="/brand/discover"
                  className="group relative h-[140px] rounded-xl overflow-hidden flex items-end p-4 transition-transform duration-300 hover:scale-[1.03]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url("${cat.image}")` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/70 group-hover:via-black/25 transition-colors" />
                  <div className="relative flex items-center gap-2 text-white">
                    <Users className="h-4 w-4 shrink-0 opacity-90" />
                    <span className="font-semibold text-sm">{cat.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Verified Military Creator Showcase */}
        <section id="creators" className="px-4 md:px-8 py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[#0064B1] text-xs font-semibold uppercase tracking-widest mb-3">
                TRUSTED BY BRANDS NATIONWIDE
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#000741] mb-3">
                Our Verified Military Creator Network
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Trusted voices. Verified service. Ready for your brand.
              </p>
            </div>

            <div ref={showcaseRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {showcaseCreators.map((c, i) => (
                <ShowcaseCard key={c.id} creator={c} index={i} inView={showcaseInView} />
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/creators">
                <Button size="lg" className="rounded-xl bg-[#0064B1] hover:bg-[#053877] text-white px-8 font-semibold shadow-md hover:shadow-lg transition-all">
                  View All Creators →
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Podcast Network */}
        <section className="px-4 md:px-8 py-16 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="text-[#0064B1] text-xs font-semibold uppercase tracking-widest mb-2">
                  TUNE IN
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#000741]">
                  Veteran & Military Podcast Network
                </h2>
                <p className="text-gray-600 mt-1">Discover the voices of those who served. {podcastTotal != null ? `${podcastTotal} podcasts and counting.` : "Podcasts and counting."}</p>
              </div>
              <Link to="/podcasts">
                <Button variant="outline" className="rounded-lg border-[#0064B1] text-[#0064B1] hover:bg-[#0064B1]/10">
                  View All Podcasts →
                </Button>
              </Link>
            </div>
            {podcastsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                    <Skeleton className="aspect-video w-full" />
                    <Skeleton className="h-4 w-3/4 m-3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {podcasts.length === 0 ? (
                  <p className="col-span-full text-sm text-gray-500 py-4">No podcasts yet. Check back soon.</p>
                ) : (
                  podcasts.map((p) => (
                    <Link
                      key={p.id}
                      to="/podcasts"
                      className="group rounded-xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-video bg-gradient-to-br from-[#c4b5fd] to-[#a78bfa] flex items-center justify-center overflow-hidden">
                        {p.artwork_url ? (
                          <img src={p.artwork_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Mic2 className="h-12 w-12 text-white/80" />
                        )}
                      </div>
                      <p className="p-3 text-sm font-medium text-[#000741] truncate" title={p.title ?? undefined}>
                        {p.title ?? "Untitled"}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* Events */}
        <section id="events" className="px-4 md:px-8 py-16 md:py-20 bg-gray-50 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#000741] mb-2">
              Events That Don't End When the Lights Go Off
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl">
              MIC. MilSpouseFest. PDX Live. Every event on MilCrunch extends into a year-round community — not just 3 days on Whova.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {EVENTS.map((event) => (
                <div
                  key={event.name}
                  className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col"
                >
                  <span className="inline-block text-xs font-semibold text-[#0064B1] bg-[#0064B1]/10 rounded-full px-2.5 py-0.5 w-fit mb-3">
                    {event.tag}
                  </span>
                  <h3 className="font-semibold text-[#000741] mb-1">{event.name}</h3>
                  <p className="text-sm text-gray-500 mb-1">{event.date}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mb-4">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {event.location}
                  </p>
                  <Button size="sm" className="rounded-lg mt-auto w-full">
                    Join Event
                  </Button>
                </div>
              ))}
            </div>
            <Link to="/pdx/create" className="text-[#0064B1] font-medium hover:underline">
              Create Your Own Event →
            </Link>
          </div>
        </section>

        {/* For Brands */}
        <section id="for-brands" className="px-4 md:px-8 py-16 md:py-20 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#000741] mb-8">
              Reach the Military Community Year-Round
            </h2>
            <div className="grid md:grid-cols-3 gap-8 mb-10">
              {BRAND_FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="font-semibold text-[#000741] mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
            <Link to="/brand/discover">
              <Button size="lg" className="rounded-lg bg-[#0064B1] hover:bg-[#053877] text-white">
                Discover Creators
              </Button>
            </Link>
          </div>
        </section>

        {/* Bottom CTA banner */}
        <section className="px-4 md:px-8 py-14 md:py-20 bg-[#0a1628]">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xl md:text-2xl font-semibold text-white mb-6">
              The military community doesn't stop. Neither should your platform.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/brand/discover">
                <Button size="lg" className="rounded-lg bg-[#0064B1] hover:bg-[#053877] text-white px-8">
                  Join Free
                </Button>
              </Link>
              <Link to="/pdx/create">
                <Button size="lg" variant="outline" className="rounded-lg px-8 border-white/50 text-white hover:bg-white/10">
                  Create an Event
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 md:px-8 py-10 border-t border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div>
                <Link to="/" className="inline-block mb-4">
                  <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <span className="text-[#000741]">Mil</span>
                    <span className="text-[#10B981]">Crunch</span>
                  </span>
                </Link>
                <p className="text-sm text-gray-500">© 2026 MilCrunch. All rights reserved.</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <a href="#" className="hover:text-[#0064B1]">Privacy</a>
                  <a href="#" className="hover:text-[#0064B1]">Terms</a>
                  <a href="#" className="hover:text-[#0064B1]">Contact</a>
                </div>
              </div>
              <nav className="flex flex-wrap gap-6 text-sm text-gray-600">
                <a href="/#creators" className="hover:text-[#0064B1]">Community</a>
                <a href="/#events" className="hover:text-[#0064B1]">Events</a>
                <a href="/#creators" className="hover:text-[#0064B1]">Creators</a>
                <a href="/#for-brands" className="hover:text-[#0064B1]">For Brands</a>
                <Link to="/pdx" className="hover:text-[#0064B1]">PDX</Link>
                <a href="#" className="hover:text-[#0064B1]">About</a>
              </nav>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

