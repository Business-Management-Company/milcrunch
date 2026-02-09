import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun,
  Shield,
  Users,
  Mic2,
  TrendingUp,
  Building2,
  MapPin,
  Search,
  Instagram,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force"];

const HERO_CARDS = [
  { name: "Jason S.", handle: "savagekingdomboerboels", niche: "Veterans", followers: "359.1K", engagement: "3.2%", initials: "JS" },
  { name: "Kevin W.", handle: "wheelchairkev", niche: "Motivation", followers: "353.1K", engagement: "4.8%", initials: "KW" },
  { name: "Taylor S.", handle: "tsyontz", niche: "Military", followers: "96.8K", engagement: "2.1%", initials: "TS" },
];

const NICHE_TAG_CLASSES: Record<string, string> = {
  Veterans: "bg-blue-100 text-blue-700",
  Motivation: "bg-purple-100 text-purple-700",
  Military: "bg-green-100 text-green-700",
  Fitness: "bg-orange-100 text-orange-700",
  Lifestyle: "bg-pink-100 text-pink-700",
};

const AUDIENCE = [
  { label: "Veterans", icon: Shield },
  { label: "Military Spouses", icon: Users },
  { label: "Podcasters", icon: Mic2 },
  { label: "Content Creators", icon: TrendingUp },
  { label: "Brands", icon: Building2 },
];

const CATEGORIES = [
  "Military Life",
  "Fitness",
  "Veterans",
  "Lifestyle",
  "Podcasts",
  "Business",
  "Gaming",
  "Education",
  "News & Politics",
  "All Creators",
];

const FEATURED_CREATORS = [
  { name: "Jason", handle: "savagekingdomboerboels", followers: "359.1K", niche: "Veterans", initials: "JS" },
  { name: "Kevin", handle: "wheelchairkev", followers: "353.1K", niche: "Motivation", initials: "KW" },
  { name: "Sven", handle: "badasscounseling", followers: "164.6K", niche: "Lifestyle", initials: "SV" },
  { name: "David", handle: "frommilitarytomillionaire", followers: "107.9K", niche: "Military", initials: "DA" },
  { name: "Taylor", handle: "tsyontz", followers: "96.8K", niche: "Military", initials: "TS" },
  { name: "Jon", handle: "itsjonlynch", followers: "88.6K", niche: "Military", initials: "JO" },
  { name: "Chive Charities", handle: "chivecharities", followers: "43.1K", niche: "Veterans", initials: "CC" },
  { name: "Kashi", handle: "hopefor22aday_kashi", followers: "42.0K", niche: "Military", initials: "KA" },
  { name: "Zack", handle: "zack_a_knight", followers: "39.5K", niche: "Religion", initials: "ZA" },
  { name: "Ashlee", handle: "thewomanandwarrior", followers: "34.6K", niche: "Military", initials: "AS" },
  { name: "Sky", handle: "skyverava", followers: "32.7K", niche: "Veterans", initials: "SK" },
  { name: "Jillian", handle: "jillianphillipsart", followers: "23.3K", niche: "Art", initials: "JI" },
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

export default function HomePage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [podcasts, setPodcasts] = useState<PodcastRow[]>([]);
  const [podcastTotal, setPodcastTotal] = useState<number | null>(null);
  const [podcastsLoading, setPodcastsLoading] = useState(true);

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
          <Link to="/brand/discover" className={`text-sm font-medium ${navLinkClass}`}>
            Sign In
          </Link>
          <Link to="/brand/discover">
            <Button size="sm" className="rounded-lg bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white px-5 py-2 font-semibold">
              Become a Creator
            </Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero — full-width overlay, 95vh, floating creator cards (Grid Coordinates style) */}
        <section className="relative min-h-[95vh] flex flex-col md:flex-row items-center justify-center px-4 md:px-8 pt-20 pb-24 overflow-hidden">
          {/* Background: full-width photo-style gradient (left darker, right lighter) + optional subtle pattern */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(to right, rgba(0,7,65,0.92) 0%, rgba(0,7,65,0.85) 50%, rgba(0,7,65,0.7) 100%),
                url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%23ffffff' stroke-width='0.15' opacity='0.04'/%3E%3Cpath d='M0 0h60v60H0z' fill='none' stroke='%23ffffff' stroke-width='0.08' opacity='0.03'/%3E%3C/svg%3E")
              `,
              backgroundSize: "cover, 60px 60px",
              backgroundPosition: "center, 0 0",
            }}
          />
          <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-8">
            {/* Left 60% — badge, headline, subtitle, CTAs, branch chips */}
            <div className="flex-1 md:max-w-[60%] text-center md:text-left">
              <div className="inline-flex items-center rounded-full bg-white/10 border border-white/10 px-4 py-1.5 mb-6">
                <span className="text-[#F0A71F] text-xs font-semibold uppercase tracking-wide">
                  ☆ BE SEEN. BE HEARD. BE UNDERSTOOD.
                </span>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                For the Military &<br />
                <span className="text-[#F0A71F]">Veteran Community</span><br />
                to Thrive
              </h1>
              <p className="text-white/90 text-base md:text-lg max-w-xl mb-8">
                ParadeDeck is where the military and veteran community comes to be{" "}
                <strong className="text-white">seen, heard, and understood</strong>. Whether you're a{" "}
                <strong className="text-white">veteran, active duty, military spouse, podcaster, or content creator</strong> — this is your platform to share your story, grow your influence, and connect with those who truly understand your journey.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
                <Link to="/brand/discover">
                  <Button size="lg" className="rounded-lg bg-[#0064B1] hover:bg-[#0064B1]/90 text-white px-6 py-3 font-semibold">
                    Become a Creator →
                  </Button>
                </Link>
                <a href="/#creators">
                  <Button size="lg" variant="outline" className="rounded-lg bg-white/10 hover:bg-white/15 border-white/20 text-white px-6 py-3 font-medium inline-flex items-center gap-2">
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
            {/* Right 40% — stacked floating creator cards (Grid Coordinates style) */}
            <div className="flex-1 md:max-w-[40%] flex justify-center md:justify-end relative min-h-[340px] md:min-h-[420px]">
              {HERO_CARDS.map((card, i) => (
                <div
                  key={card.handle}
                  className="absolute bg-white rounded-xl shadow-2xl p-5 w-[300px] hero-float"
                  style={{
                    top: 20 + i * 80,
                    left: "50%",
                    marginLeft: i * 20 - 150,
                    animationDelay: `${i * 0.3}s`,
                    zIndex: i + 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: "linear-gradient(135deg, #0064B1 0%, #053877 100%)" }}
                      >
                        {card.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#000741] truncate">{card.name}</p>
                        <p className="text-sm text-gray-500 truncate">@{card.handle}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold ${
                        NICHE_TAG_CLASSES[card.niche] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {card.niche}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">{card.followers} Followers</span>
                    <span className="text-emerald-600 font-medium">{card.engagement} Engagement</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes hero-float-kf {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            .hero-float {
              animation: hero-float-kf 4s ease-in-out infinite;
            }
          `}</style>
        </section>

        {/* FOR — audience types */}
        <section className="relative z-10 -mt-8 pb-12">
          <p className="text-center text-xs font-semibold text-white/70 uppercase tracking-widest mb-4">
            FOR
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-white/90 text-sm font-medium">
            <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-[#F0A71F]" /> Veterans</span>
            <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-[#F0A71F]" /> Military Spouses</span>
            <span className="inline-flex items-center gap-2"><Mic2 className="h-4 w-4 text-[#F0A71F]" /> Podcasters</span>
            <span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#F0A71F]" /> Content Creators</span>
            <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-[#F0A71F]" /> Brands</span>
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
              {CATEGORIES.map((cat, i) => {
                const colors = [
                  "from-[#0a1628] to-transparent",
                  "from-[#0d4f4f] to-transparent",
                  "from-[#3d5c3d] to-transparent",
                  "from-[#374151] to-transparent",
                  "from-[#1e3a5f] to-transparent",
                  "from-[#4a5568] to-transparent",
                  "from-[#2d3748] to-transparent",
                  "from-[#234e52] to-transparent",
                  "from-[#2c5282] to-transparent",
                  "from-[#0064B1] to-transparent",
                ];
                return (
                  <Link
                    key={cat}
                    to="/brand/discover"
                    className={`aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-t ${colors[i % colors.length]} flex items-end gap-2 p-4 transition-transform hover:scale-105`}
                  >
                    <Users className="h-4 w-4 text-white shrink-0" />
                    <span className="text-white font-semibold text-sm">{cat}</span>
                  </Link>
                );
              })}
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
              {FEATURED_CREATORS.map((c) => (
                <Link
                  key={c.handle}
                  to="/brand/discover"
                  className="group rounded-xl overflow-hidden aspect-[4/3] relative bg-gradient-to-br from-[#0064B1] to-[#053877] flex flex-col justify-end p-4 hover:ring-2 hover:ring-[#0064B1] transition-all"
                >
                  <span className="absolute top-3 right-3 bg-[#0064B1] text-white text-xs px-3 py-1 rounded-full font-medium border border-white/30">
                    Verified
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center text-white/20 text-[80px] md:text-[120px] font-bold pointer-events-none">
                    {c.initials}
                  </span>
                  <div className="relative flex items-center gap-2 text-white/90 text-xs mb-1">
                    <Instagram className="h-3.5 w-3.5" />
                    <span>{c.followers} followers</span>
                  </div>
                  <p className="font-semibold text-white">{c.name}</p>
                  <p className="text-white/80 text-sm">@{c.handle}</p>
                  <span className="inline-block mt-1 w-fit bg-white/20 text-white rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {c.niche}
                  </span>
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
