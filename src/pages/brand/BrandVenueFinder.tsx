import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
  X,
  Navigation,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface Venue {
  place_id: string;
  name: string;
  address: string;
  rating: number;
  user_ratings_total: number;
  photo_url: string | null;
  phone: string | null;
  website: string | null;
  maps_url: string | null;
  types: string[];
  price_level: number | null;
  business_status: string;
}

interface ScoredVenue extends Venue {
  fit_score: number;
}

interface SavedVenue {
  id: string;
  place_id: string;
  venue_name: string;
  address: string;
  website: string | null;
  phone: string | null;
  rating: number | null;
  photo_url: string | null;
  venue_type: string | null;
  notes: string | null;
  saved_at: string;
}

// ─── Constants ──────────────────────────────────────────────

const VENUE_STYLES: { label: string; keywords: string }[] = [
  { label: "Hotel + Conference", keywords: "hotel conference center" },
  { label: "Conference Only", keywords: "conference center meeting rooms" },
  { label: "Banquet Hall", keywords: "banquet hall event center" },
  { label: "Outdoor", keywords: "outdoor event space park amphitheater" },
  { label: "Theater", keywords: "theater performing arts auditorium" },
  { label: "Rooftop", keywords: "rooftop event venue" },
  { label: "Restaurant", keywords: "restaurant private dining event" },
];

const MIN_RATING_OPTIONS = [
  { value: "0", label: "Any Rating" },
  { value: "3", label: "3+ Stars" },
  { value: "3.5", label: "3.5+ Stars" },
  { value: "4", label: "4+ Stars" },
  { value: "4.5", label: "4.5+ Stars" },
];

const MIN_REVIEWS_OPTIONS = [
  { value: "0", label: "Any Reviews" },
  { value: "10", label: "10+ Reviews" },
  { value: "50", label: "50+ Reviews" },
  { value: "100", label: "100+ Reviews" },
  { value: "500", label: "500+ Reviews" },
];

const PRICE_OPTIONS = [
  { value: "any", label: "Any Price" },
  { value: "1", label: "$ (Budget)" },
  { value: "2", label: "$$ (Moderate)" },
  { value: "3", label: "$$$ (Upscale)" },
  { value: "4", label: "$$$$ (Premium)" },
];

const SORT_OPTIONS = [
  { value: "fit_score", label: "Fit Score" },
  { value: "top_rated", label: "Top Rated (50+ reviews)" },
  { value: "most_reviewed", label: "Most Reviewed" },
];

const EVENT_TYPE_KEYWORDS = [
  "event",
  "conference",
  "banquet",
  "ballroom",
  "hall",
  "center",
  "venue",
];

const PRICE_LABELS: Record<number, string> = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};

// ─── Fit Score ──────────────────────────────────────────────

function computeFitScore(venue: Venue): number {
  // Rating: up to 30 pts — (rating / 5) * 30
  const ratingPts = venue.rating > 0 ? (venue.rating / 5) * 30 : 0;

  // Reviews: up to 20 pts — min(reviews, 500) / 500 * 20
  const reviewPts =
    venue.user_ratings_total > 0
      ? (Math.min(venue.user_ratings_total, 500) / 500) * 20
      : 0;

  // Keyword match: up to 30 pts — 10 pts per match, max 30
  const typesJoined = (venue.types || []).join(" ").toLowerCase();
  const nameLC = venue.name.toLowerCase();
  let keywordHits = 0;
  for (const kw of EVENT_TYPE_KEYWORDS) {
    if (typesJoined.includes(kw) || nameLC.includes(kw)) {
      keywordHits++;
    }
  }
  const keywordPts = Math.min(keywordHits * 10, 30);

  // Completeness: up to 20 pts — photo 10, website 10
  let completePts = 0;
  if (venue.photo_url) completePts += 10;
  if (venue.website) completePts += 10;

  return Math.round(ratingPts + reviewPts + keywordPts + completePts);
}

function fitScoreColor(score: number): string {
  if (score >= 70) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

// ─── Component ──────────────────────────────────────────────

export default function BrandVenueFinder() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("fit_score");
  const [minRating, setMinRating] = useState("0");
  const [minReviews, setMinReviews] = useState("0");
  const [priceFilter, setPriceFilter] = useState("any");
  const [showFilters, setShowFilters] = useState(false);

  // Results
  const [rawResults, setRawResults] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Saved venues
  const [savedVenues, setSavedVenues] = useState<SavedVenue[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);

  // ─── Load saved venues ──────────────────────────────────
  const loadSavedVenues = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("saved_venues")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });
    if (error) {
      console.warn("[VenueFinder] Error loading saved venues:", error.message);
      return;
    }
    setSavedVenues((data ?? []) as SavedVenue[]);
  }, [user]);

  useEffect(() => {
    loadSavedVenues();
  }, [loadSavedVenues]);

  // ─── Build queries & search ───────────────────────────────
  const handleSearch = async () => {
    if (!location.trim()) {
      toast({
        title: "Location Required",
        description: "Enter a city or location to search for venues.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setSearched(true);
    setShowSaved(false);

    const loc = location.trim();
    const term = searchTerm.trim() || "event venue";

    // Build 3 parallel queries for broader coverage
    const queries: string[] = [
      `${term} event space ${loc}`,
      `${term} ${loc}`,
      `event venue ${loc}`,
    ];

    // If venue styles are selected, add style-specific queries
    for (const style of selectedStyles) {
      const match = VENUE_STYLES.find((s) => s.label === style);
      if (match) {
        queries.push(`${match.keywords} ${loc}`);
      }
    }

    try {
      const resp = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `API returned ${resp.status}`);
      }

      const data = await resp.json();
      const venues: Venue[] = data.results || [];

      // Filter out permanently closed
      const open = venues.filter(
        (v) => v.business_status !== "CLOSED_PERMANENTLY"
      );

      setRawResults(open);
    } catch (err) {
      console.error("[VenueFinder] Search error:", err);
      toast({
        title: "Search Failed",
        description:
          err instanceof Error ? err.message : "Could not search venues",
        variant: "destructive",
      });
      setRawResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter + Score + Sort (client-side) ──────────────────
  const filteredResults: ScoredVenue[] = useMemo(() => {
    // Score all results
    let scored: ScoredVenue[] = rawResults.map((v) => ({
      ...v,
      fit_score: computeFitScore(v),
    }));

    // Apply min rating filter
    const minR = parseFloat(minRating);
    if (minR > 0) {
      scored = scored.filter((v) => v.rating >= minR);
    }

    // Apply min reviews filter
    const minRev = parseInt(minReviews, 10);
    if (minRev > 0) {
      scored = scored.filter((v) => v.user_ratings_total >= minRev);
    }

    // Apply price filter
    if (priceFilter !== "any") {
      const maxPrice = parseInt(priceFilter, 10);
      scored = scored.filter(
        (v) => v.price_level != null && v.price_level <= maxPrice
      );
    }

    // Sort
    if (sortBy === "fit_score") {
      scored.sort((a, b) => b.fit_score - a.fit_score);
    } else if (sortBy === "top_rated") {
      // Only venues with 50+ reviews, then sort by rating desc
      scored = scored.filter((v) => v.user_ratings_total >= 50);
      scored.sort((a, b) => b.rating - a.rating || b.user_ratings_total - a.user_ratings_total);
    } else if (sortBy === "most_reviewed") {
      scored.sort((a, b) => b.user_ratings_total - a.user_ratings_total);
    }

    return scored;
  }, [rawResults, minRating, minReviews, priceFilter, sortBy]);

  // ─── Save venue ─────────────────────────────────────────
  const saveVenue = async (venue: Venue) => {
    if (!user) return;
    setSavingIds((prev) => new Set(prev).add(venue.place_id));

    const primaryType = venue.types?.[0]?.replace(/_/g, " ") || null;

    const payload = {
      user_id: user.id,
      place_id: venue.place_id,
      venue_name: venue.name,
      address: venue.address,
      website: venue.website || venue.maps_url || null,
      phone: venue.phone || null,
      rating: venue.rating || null,
      photo_url: venue.photo_url || null,
      venue_type: primaryType,
    };

    const { error } = await supabase.from("saved_venues").upsert(payload, {
      onConflict: "user_id,place_id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("[VenueFinder] Save error:", error.message);
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Venue Saved" });
      loadSavedVenues();
    }

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(venue.place_id);
      return next;
    });
  };

  // ─── Unsave venue ───────────────────────────────────────
  const unsaveVenue = async (placeId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("saved_venues")
      .delete()
      .eq("user_id", user.id)
      .eq("place_id", placeId);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Venue Removed" });
      loadSavedVenues();
    }
  };

  const savedPlaceIds = new Set(savedVenues.map((v) => v.place_id));

  // ─── Toggle style chip ──────────────────────────────────
  const toggleStyle = (label: string) => {
    setSelectedStyles((prev) =>
      prev.includes(label)
        ? prev.filter((x) => x !== label)
        : [...prev, label]
    );
  };

  const clearFilters = () => {
    setSelectedStyles([]);
    setSortBy("fit_score");
    setMinRating("0");
    setMinReviews("0");
    setPriceFilter("any");
  };

  const activeFilterCount =
    selectedStyles.length +
    (minRating !== "0" ? 1 : 0) +
    (minReviews !== "0" ? 1 : 0) +
    (priceFilter !== "any" ? 1 : 0) +
    (sortBy !== "fit_score" ? 1 : 0);

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-purple-600" />
            Venue Finder
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Search for event venues powered by Google Places
          </p>
        </div>
        <Button
          variant={showSaved ? "default" : "outline"}
          onClick={() => setShowSaved(!showSaved)}
          className={showSaved ? "bg-purple-600 hover:bg-purple-700" : ""}
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Saved ({savedVenues.length})
        </Button>
      </div>

      {/* Search bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative md:w-[55%]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search term (e.g. 'conference venue', 'ballroom')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <div className="relative md:w-[35%]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="City or location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="relative"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Button
            onClick={handleSearch}
            disabled={loading || !location.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            {/* Venue Style chips */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Venue Style
              </label>
              <div className="flex flex-wrap gap-2">
                {VENUE_STYLES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => toggleStyle(s.label)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedStyles.includes(s.label)
                        ? "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdowns row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Fit Score" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Min Rating
                </label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {MIN_RATING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Min Reviews
                </label>
                <Select value={minReviews} onValueChange={setMinReviews}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Reviews" />
                  </SelectTrigger>
                  <SelectContent>
                    {MIN_REVIEWS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Price Level
                </label>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Price" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Saved venues view */}
      {showSaved && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Saved Venues
          </h2>
          {savedVenues.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <Bookmark className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No saved venues yet.</p>
              <p className="text-sm text-gray-400">
                Search for venues and click the bookmark icon to save them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedVenues.map((v) => (
                <SavedVenueCard
                  key={v.id}
                  venue={v}
                  onRemove={() => unsaveVenue(v.place_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search results */}
      {!showSaved && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-500">
                Searching venues across multiple queries...
              </span>
            </div>
          )}

          {!loading && searched && filteredResults.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No venues found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try broadening your search or adjusting filters.
              </p>
            </div>
          )}

          {!loading && filteredResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Showing {filteredResults.length} venue
                {filteredResults.length !== 1 ? "s" : ""}
                {rawResults.length !== filteredResults.length && (
                  <span className="text-gray-400">
                    {" "}
                    (filtered from {rawResults.length})
                  </span>
                )}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResults.map((venue) => (
                  <VenueCard
                    key={venue.place_id}
                    venue={venue}
                    isSaved={savedPlaceIds.has(venue.place_id)}
                    saving={savingIds.has(venue.place_id)}
                    onSave={() => saveVenue(venue)}
                    onUnsave={() => unsaveVenue(venue.place_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && !searched && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Search for event venues
              </p>
              <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                Enter a city and search term to find event spaces, hotels,
                conference centers, and more. Results are ranked by Fit Score.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Venue Card ─────────────────────────────────────────────

function VenueCard({
  venue,
  isSaved,
  saving,
  onSave,
  onUnsave,
}: {
  venue: ScoredVenue;
  isSaved: boolean;
  saving: boolean;
  onSave: () => void;
  onUnsave: () => void;
}) {
  const priceLabel =
    venue.price_level != null && venue.price_level > 0
      ? PRICE_LABELS[venue.price_level] ?? null
      : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Photo */}
      <div className="aspect-[16/9] bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-gray-800 relative overflow-hidden">
        {venue.photo_url ? (
          <img
            src={venue.photo_url}
            alt={venue.name}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <MapPin className="w-10 h-10 text-purple-300" />
          </div>
        )}

        {/* Save button */}
        <button
          onClick={isSaved ? onUnsave : onSave}
          disabled={saving}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm"
          title={isSaved ? "Remove from saved" : "Save venue"}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
          ) : isSaved ? (
            <BookmarkCheck className="w-4 h-4 text-purple-600" />
          ) : (
            <Bookmark className="w-4 h-4 text-gray-500 group-hover:text-purple-600" />
          )}
        </button>

        {/* Fit Score badge */}
        <div
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold border ${fitScoreColor(venue.fit_score)}`}
        >
          {venue.fit_score}% Fit
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
          {venue.name}
        </h3>

        <div className="flex items-start gap-1.5 text-sm text-gray-500">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{venue.address}</span>
        </div>

        {/* Rating + reviews + price */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {venue.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {venue.rating}
              </span>
            </div>
          )}
          {venue.user_ratings_total > 0 && (
            <span className="text-gray-400">
              ({venue.user_ratings_total.toLocaleString()} reviews)
            </span>
          )}
          {priceLabel && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              {priceLabel}
            </span>
          )}
        </div>

        {/* Contact + links row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-gray-100 dark:border-gray-700">
          {venue.phone && (
            <a
              href={`tel:${venue.phone}`}
              className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600"
            >
              <Phone className="w-3 h-3" />
              {venue.phone}
            </a>
          )}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
            >
              <Globe className="w-3 h-3" />
              Website
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {venue.maps_url && (
            <a
              href={venue.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
            >
              <Navigation className="w-3 h-3" />
              Maps
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Saved Venue Card ───────────────────────────────────────

function SavedVenueCard({
  venue,
  onRemove,
}: {
  venue: SavedVenue;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="aspect-[16/9] bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-gray-800 relative overflow-hidden">
        {venue.photo_url ? (
          <img
            src={venue.photo_url}
            alt={venue.venue_name}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <MapPin className="w-8 h-8 text-purple-300" />
          </div>
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm"
          title="Remove from saved"
        >
          <BookmarkCheck className="w-4 h-4 text-purple-600" />
        </button>
        {venue.venue_type && (
          <Badge className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 text-xs border-0">
            {venue.venue_type}
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
          {venue.venue_name}
        </h3>
        <div className="flex items-start gap-1.5 text-sm text-gray-500">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{venue.address}</span>
        </div>
        {venue.rating && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {venue.rating}
            </span>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          {venue.phone && (
            <a
              href={`tel:${venue.phone}`}
              className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              Call
            </a>
          )}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
