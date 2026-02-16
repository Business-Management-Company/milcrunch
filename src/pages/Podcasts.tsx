import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Search, Mic2, Sun } from "lucide-react";
import PodcastDetailModal from "@/components/PodcastDetailModal";

type Podcast = Database["public"]["Tables"]["podcasts"]["Row"];

const CATEGORIES = ["All", "Military", "Veterans", "Fitness", "News & Politics", "Comedy", "Lifestyle", "Education", "Business", "Other"];

export default function PodcastsPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("podcasts")
        .select("*")
        .eq("status", "active")
        .order("title", { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      setPodcasts(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = podcasts.filter((p) => {
    if (search && !(p.title ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !(p.author ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && (p.category ?? "") !== category) return false;
    return true;
  });

  const navLinkClass = navScrolled ? "text-gray-600 hover:text-[#6C5CE7]" : "text-white/90 hover:text-white";

  return (
    <div className="min-h-screen bg-white text-[#000741]">
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 md:px-8 transition-all duration-300 ${
          navScrolled ? "bg-white/95 backdrop-blur-md border-b border-gray-200" : "bg-[#0a1628]"
        }`}
      >
        <Link to="/" className="flex items-center shrink-0">
          <span className={`font-bold text-lg tracking-tight ${navScrolled ? "text-[#000741]" : "text-white"}`}>
            recurrent<span className="text-[#6C5CE7] font-extrabold">X</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
          <a href="/#creators" className={`text-sm font-medium ${navLinkClass}`}>Creators</a>
          <a href="/#events" className={`text-sm font-medium ${navLinkClass}`}>Events</a>
          <Link to="/swag" className={`text-sm font-medium ${navLinkClass}`}>SWAG</Link>
          <Link to="/speakers" className={`text-sm font-medium ${navLinkClass}`}>Speakers</Link>
          <Link to="/podcasts" className={`text-sm font-medium ${navLinkClass}`}>Podcasts</Link>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-gray-400 p-1.5" aria-hidden><Sun className="h-4 w-4" /></span>
          <Link to="/brand/discover" className={`text-sm font-medium ${navLinkClass}`}>Sign In</Link>
          <Link to="/brand/discover">
            <Button size="sm" className="rounded-lg bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white px-5 py-2 font-semibold">
              Become a Creator
            </Button>
          </Link>
        </div>
      </header>

      <main className="pt-20 pb-16">
        <section className="bg-[#0a1628] text-white px-4 md:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              Veteran & Military Podcast Network
            </h1>
            <p className="text-white/90 mt-2">
              Discover the voices of those who served. {podcasts.length} podcasts and counting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  placeholder="Search podcasts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 text-white px-4 py-2 min-w-[160px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0a1628] text-white">{c}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="px-4 md:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 h-64 animate-pulse" />
                ))}
              </div>
            ) : podcasts.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Mic2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-gray-600">No podcasts yet. Check back soon!</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Mic2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No podcasts match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filtered.map((podcast) => (
                  <button
                    key={podcast.id}
                    type="button"
                    className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow text-left"
                    onClick={() => setSelectedPodcast(podcast)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-[#c4b5fd] to-[#a78bfa] flex items-center justify-center overflow-hidden">
                      {(podcast.image_url || podcast.artwork_url) ? (
                        <img src={(podcast.image_url || podcast.artwork_url)!} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                      ) : null}
                      <Mic2 className={`h-16 w-16 text-white/80 ${(podcast.image_url || podcast.artwork_url) ? "hidden" : ""}`} />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[#000741] line-clamp-2" title={podcast.title ?? undefined}>
                        {podcast.title ?? "Untitled"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{podcast.author ?? "\u2014"}</p>
                      {podcast.category && (
                        <span className="inline-block mt-2 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] px-2.5 py-0.5 text-xs font-medium">
                          {podcast.category}
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{podcast.episode_count ?? 0} episodes</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center">
            <span className="font-bold text-[#000741] tracking-tight">recurrent<span className="text-[#6C5CE7] font-extrabold">X</span></span>
          </Link>
          <p className="text-sm text-gray-500">&copy; 2026 RecurrentX. All rights reserved.</p>
        </div>
      </footer>

      <PodcastDetailModal
        podcast={selectedPodcast}
        open={!!selectedPodcast}
        onOpenChange={(open) => { if (!open) setSelectedPodcast(null); }}
      />
    </div>
  );
}
