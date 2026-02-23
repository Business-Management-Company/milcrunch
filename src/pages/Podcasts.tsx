import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Search, Mic2 } from "lucide-react";
import PodcastDetailModal from "@/components/PodcastDetailModal";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

type Podcast = Database["public"]["Tables"]["podcasts"]["Row"];

const CATEGORIES = ["All", "Military", "Veterans", "Fitness", "News & Politics", "Comedy", "Lifestyle", "Education", "Business", "Other"];

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);

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

  return (
    <div className="min-h-screen bg-white text-[#1A1A2E]">
      <PublicNav />

      <main className="pt-14">
        {/* Hero — light gray to match site */}
        <section className="bg-[#F8F9FA] px-4 md:px-8 py-12 md:py-16">
          <div className="max-w-6xl mx-auto">
            <h1 className="font-sans text-3xl md:text-4xl font-bold text-[#1A1A2E]">
              Veteran & Military Podcast Network
            </h1>
            <p className="text-[#4A4A5A] mt-2">
              Discover the voices of those who served. {podcasts.length} podcasts and counting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search podcasts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white border-[#E5E7EB] text-[#1A1A2E] placeholder:text-gray-400 rounded-xl"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-[#E5E7EB] bg-white text-[#1A1A2E] px-4 py-2 min-w-[160px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Podcast Grid */}
        <section className="px-4 md:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="rounded-xl border border-[#E5E7EB] bg-gray-50 h-64 animate-pulse" />
                ))}
              </div>
            ) : podcasts.length === 0 ? (
              <div className="text-center py-16 text-[#6B7280]">
                <Mic2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-[#4A4A5A]">No podcasts yet. Check back soon!</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-[#6B7280]">
                <Mic2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No podcasts match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filtered.map((podcast) => (
                  <button
                    key={podcast.id}
                    type="button"
                    className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-left"
                    onClick={() => setSelectedPodcast(podcast)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-[#93c5fd] to-[#3b82f6] flex items-center justify-center overflow-hidden">
                      {(podcast.image_url || podcast.artwork_url) ? (
                        <img src={(podcast.image_url || podcast.artwork_url)!} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                      ) : null}
                      <Mic2 className={`h-16 w-16 text-white/80 ${(podcast.image_url || podcast.artwork_url) ? "hidden" : ""}`} />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-[#1A1A2E] line-clamp-2" title={podcast.title ?? undefined}>
                        {podcast.title ?? "Untitled"}
                      </h3>
                      <p className="text-sm text-[#6B7280] mt-0.5">{podcast.author ?? "\u2014"}</p>
                      {podcast.category && (
                        <span className="inline-block mt-2 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] px-2.5 py-0.5 text-xs font-medium">
                          {podcast.category}
                        </span>
                      )}
                      <p className="text-xs text-[#6B7280] mt-2">{podcast.episode_count ?? 0} episodes</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />

      <PodcastDetailModal
        podcast={selectedPodcast}
        open={!!selectedPodcast}
        onOpenChange={(open) => { if (!open) setSelectedPodcast(null); }}
      />
    </div>
  );
}
