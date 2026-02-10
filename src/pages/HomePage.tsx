import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun,
  Shield,
  Users,
  Mic2,
  BarChart3,
  Handshake,
  MapPin,
  Search,
  Instagram,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchFeaturedHero,
  fetchFeaturedGrid,
  formatFollowerCount,
  getInitials,
  type CreatorRow,
} from "@/lib/creators-db";

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force"];

// Hero background: diverse creator group in studio (cyan–teal gradient, professional)
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

// Hero creator cards — matching the design mockup (teal pills, photos, stats)
const heroCreators = [
  {
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=96&h=96&fit=crop&crop=face",
    name: "Sofia M.",
    handle: "@sofiacreates",
    category: "Lifestyle",
    categoryColor: "bg-teal-50 text-teal-700 border border-teal-200",
    followers: "2.4M",
    engagement: "4.8%",
  },
  {
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face",
    name: "Marcus J.",
    handle: "@marcusfitpro",
    category: "Fitness",
    categoryColor: "bg-teal-50 text-teal-700 border border-teal-200",
    followers: "890K",
    engagement: "6.2%",
  },
  {
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face",
    name: "Lena Park",
    handle: "@lenaeats",
    category: "Food",
    categoryColor: "bg-teal-50 text-teal-700 border border-teal-200",
    followers: "1.1M",
    engagement: "5.1%",
  },
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
      const [hero, grid] = await Promise.all([
        fetchFeaturedHero(3),
        fetchFeaturedGrid(8),
      ]);
      setHeroCreatorsDb(hero.length >= 3 ? hero : HERO_FALLBACK);
      setGridCreators(grid.length > 0 ? grid : GRID_FALLBACK);
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/Parade-Deck-Flag-logo.png" alt="ParadeDeck" className="h-8 w-auto" />
          <span className={`font-bold text-lg ${navScrolled ? "text-[#000741]" : "text-white"}`}>
            ParadeDeck
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
          {/* Dark blue left → teal-tinted blue right */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(27,42,74,0.88) 0%, rgba(25,55,65,0.65) 100%)",
            }}
          />
          <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-8">
            {/* Left 60% — badge, headline, subtitle, CTAs, branch chips */}
            <div className="flex-1 md:max-w-[60%] text-center md:text-left">
              <div className="inline-flex items-center rounded-full bg-white/10 border border-white/10 px-4 py-1.5 mb-6">
                <span className="text-[#F0A71F] text-xs font-semibold uppercase tracking-wide">
                  ☆ THE MILITARY CREATOR PLATFORM
                </span>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                Stop juggling your events, creators, sponsors, and media.
              </h1>
              <p className="text-white/90 text-base md:text-lg max-w-[600px] mb-8">
                ParadeDeck brings it all into one command center — so you can focus on the mission.
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
            {/* Right 40% — 3 stacked creator cards matching design mockup */}
            <div className="flex-1 md:max-w-[40%] flex justify-center md:justify-end">
              <div className="relative w-[420px] min-h-[560px]">
                {heroCreators.map((creator, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      zIndex: 30 - i * 10,
                      top: `${i * 165}px`,
                      right: `${i * 30}px`,
                    }}
                  >
                    <div className="hero-card-float" style={{ animationDelay: `${i * 0.2}s` }}>
                      <div className="bg-white rounded-2xl p-5 w-[360px] shadow-xl transition-shadow duration-300 hover:shadow-2xl">
                        <div className="flex items-center gap-3">
                          <img
                            src={creator.photo}
                            alt={creator.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-teal-100"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 text-base truncate">{creator.name}</div>
                            <div className="text-gray-500 text-sm truncate">{creator.handle}</div>
                          </div>
                          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${creator.categoryColor}`}>
                            {creator.category}
                          </span>
                        </div>
                        <div className="flex gap-8 mt-4 pt-4 border-t border-gray-100">
                          <div>
                            <div className="text-lg font-bold text-gray-900">{creator.followers}</div>
                            <div className="text-xs text-gray-500">Followers</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-teal-500">{creator.engagement}</div>
                            <div className="text-xs text-gray-500">Engagement</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <style>{`
            @keyframes hero-float-kf {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            .hero-card-float { animation: hero-float-kf 6s ease-in-out infinite; }
          `}</style>
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

        {/* Featured Creators */}
        <section id="creators" className="px-4 md:px-8 py-16 md:py-20 bg-gray-50 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="text-[#ED1C24] text-xs font-semibold uppercase tracking-widest mb-2">
                  AN AMAZING LINEUP
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#000741]">
                  Big Names, Even Bigger Ideas
                </h2>
              </div>
              <Link to="/brand/discover">
                <Button variant="outline" className="rounded-lg border-[#0064B1] text-[#0064B1] hover:bg-[#0064B1]/10">
                  View All Creators →
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {gridCreators.map((c) => (
                <Link
                  key={c.id}
                  to={`/brand/discover?creator=${encodeURIComponent(c.handle)}`}
                  className="group rounded-xl overflow-hidden aspect-[4/3] relative flex flex-col justify-end p-4 hover:ring-2 hover:ring-[#0064B1] transition-all"
                >
                  {c.avatar_url ? (
                    <>
                      <img
                        src={c.avatar_url}
                        alt={c.display_name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0064B1] to-[#053877]" />
                  )}
                  {c.is_verified && (
                    <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-medium border border-white/30">
                      Verified
                    </span>
                  )}
                  {!c.avatar_url && (
                    <span className="absolute inset-0 flex items-center justify-center text-white/20 text-[80px] md:text-[120px] font-bold pointer-events-none">
                      {getInitials(c.display_name, c.handle)}
                    </span>
                  )}
                  <div className="relative flex items-center gap-2 text-white/90 text-xs mb-1">
                    <Instagram className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatFollowerCount(c.follower_count)} followers</span>
                  </div>
                  <p className="font-semibold text-white">{c.display_name}</p>
                  <p className="text-white/80 text-sm">@{c.handle}</p>
                  {c.category && (
                    <span className="inline-block mt-1 w-fit bg-white/20 text-white rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {c.category}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Creator Directory — search + skeleton cards */}
        <section className="px-4 md:px-8 py-16 md:py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#000741] mb-2">
              Creator Directory
            </h2>
            <p className="text-gray-600 mb-8">
              The #1 network for military and veteran content creators. Discover authentic voices from those who served.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-2xl mx-auto mb-10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search creators..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-[#000741] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0064B1] focus:border-transparent"
                />
              </div>
              <select className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0064B1]">
                <option>All Branches</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
            <Link to="/brand/discover" className="text-[#0064B1] font-medium hover:underline">
              Sign up to access the full Creator Directory →
            </Link>
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
              MIC. MilSpouseFest. PDX Live. Every event on ParadeDeck extends into a year-round community — not just 3 days on Whova.
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
                <Link to="/" className="flex items-center gap-2 mb-4">
                  <img src="/Parade-Deck-Flag-logo.png" alt="ParadeDeck" className="h-6 w-auto" />
                  <span className="font-bold text-[#000741]">ParadeDeck</span>
                </Link>
                <p className="text-sm text-gray-500">© 2026 ParadeDeck. All rights reserved.</p>
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
