import { useState, useEffect, useCallback } from "react";
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
  Users,
  Loader2,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Navigation,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface PlaceResult {
  id: string;
  displayName: { text: string; languageCode?: string };
  formattedAddress: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: { name: string; widthPx: number; heightPx: number }[];
  types?: string[];
  primaryType?: string;
  editorialSummary?: { text: string };
  priceLevel?: string;
  accessibilityOptions?: Record<string, boolean>;
  location?: { latitude: number; longitude: number };
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

const VENUE_TYPES = [
  { value: "", label: "All Types" },
  { value: "convention_center", label: "Convention Center" },
  { value: "event_venue", label: "Event Venue" },
  { value: "hotel", label: "Hotel" },
  { value: "restaurant", label: "Restaurant" },
  { value: "bar", label: "Bar / Lounge" },
  { value: "community_center", label: "Community Center" },
  { value: "stadium", label: "Stadium / Arena" },
  { value: "park", label: "Park / Outdoor" },
  { value: "museum", label: "Museum" },
  { value: "church", label: "Church / Worship" },
];

const CAPACITY_OPTIONS = [
  { value: "", label: "Any Capacity" },
  { value: "small", label: "Small (< 100)" },
  { value: "medium", label: "Medium (100-500)" },
  { value: "large", label: "Large (500-2000)" },
  { value: "xlarge", label: "Very Large (2000+)" },
];

const AMENITIES = [
  "Parking",
  "AV Equipment",
  "Catering",
  "WiFi",
  "Accessible",
  "Outdoor Space",
  "Stage",
  "Breakout Rooms",
];

// ─── Photo URL helper ───────────────────────────────────────

const photoCache = new Map<string, string>();

async function getPhotoUrl(photoName: string): Promise<string | null> {
  if (photoCache.has(photoName)) return photoCache.get(photoName)!;
  try {
    const resp = await fetch(
      `/api/places?photoName=${encodeURIComponent(photoName)}&maxWidth=600`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.url) {
      photoCache.set(photoName, data.url);
      return data.url;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Component ──────────────────────────────────────────────

export default function BrandVenueFinder() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Search state
  const [query, setQuery] = useState("");
  const [venueType, setVenueType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Results
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
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

  // ─── Search ─────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowSaved(false);

    // Build query string with filters
    let searchQuery = query.trim();
    if (venueType) {
      const typeLabel = VENUE_TYPES.find((t) => t.value === venueType)?.label;
      if (typeLabel && !searchQuery.toLowerCase().includes(typeLabel.toLowerCase())) {
        searchQuery += ` ${typeLabel}`;
      }
    }
    if (capacity) {
      const capMap: Record<string, string> = {
        small: "small venue",
        medium: "medium venue",
        large: "large venue",
        xlarge: "large convention center",
      };
      if (capMap[capacity]) searchQuery += ` ${capMap[capacity]}`;
    }
    if (selectedAmenities.length > 0) {
      searchQuery += ` ${selectedAmenities.join(" ")}`;
    }

    try {
      const resp = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          type: venueType || undefined,
          maxResultCount: 20,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `API returned ${resp.status}`);
      }

      const data = await resp.json();
      const places: PlaceResult[] = data.places || [];
      setResults(places);

      // Resolve photos in background
      const photoMap: Record<string, string> = {};
      const photoPromises = places
        .filter((p) => p.photos && p.photos.length > 0)
        .slice(0, 10) // limit photo fetches
        .map(async (p) => {
          const url = await getPhotoUrl(p.photos![0].name);
          if (url) photoMap[p.id] = url;
        });
      await Promise.all(photoPromises);
      setPhotoUrls((prev) => ({ ...prev, ...photoMap }));
    } catch (err) {
      console.error("[VenueFinder] Search error:", err);
      toast({
        title: "Search Failed",
        description: err instanceof Error ? err.message : "Could not search venues",
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Save venue ─────────────────────────────────────────
  const saveVenue = async (place: PlaceResult) => {
    if (!user) return;
    setSavingIds((prev) => new Set(prev).add(place.id));

    const payload = {
      user_id: user.id,
      place_id: place.id,
      venue_name: place.displayName.text,
      address: place.formattedAddress,
      website: place.websiteUri || null,
      phone: place.nationalPhoneNumber || null,
      rating: place.rating || null,
      photo_url: photoUrls[place.id] || null,
      venue_type: place.primaryType || null,
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
      next.delete(place.id);
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Venue Removed" });
      loadSavedVenues();
    }
  };

  const savedPlaceIds = new Set(savedVenues.map((v) => v.place_id));

  // ─── Toggle amenity ────────────────────────────────────
  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const clearFilters = () => {
    setVenueType("");
    setCapacity("");
    setSelectedAmenities([]);
  };

  const activeFilterCount =
    (venueType ? 1 : 0) + (capacity ? 1 : 0) + selectedAmenities.length;

  // ─── Format type label ─────────────────────────────────
  const formatType = (type: string) =>
    type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search venues by name or city (e.g. 'event venues in San Diego')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
            disabled={loading || !query.trim()}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Venue Type
                </label>
                <Select value={venueType} onValueChange={setVenueType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_TYPES.map((t) => (
                      <SelectItem key={t.value || "all"} value={t.value || "all"}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Capacity
                </label>
                <Select value={capacity} onValueChange={setCapacity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPACITY_OPTIONS.map((c) => (
                      <SelectItem key={c.value || "any"} value={c.value || "any"}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedAmenities.includes(a)
                        ? "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {a}
                  </button>
                ))}
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
              <span className="ml-3 text-gray-500">Searching venues...</span>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No venues found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try broadening your search or adjusting filters.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                {results.length} venue{results.length !== 1 ? "s" : ""} found
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((place) => (
                  <VenueCard
                    key={place.id}
                    place={place}
                    photoUrl={photoUrls[place.id]}
                    isSaved={savedPlaceIds.has(place.id)}
                    saving={savingIds.has(place.id)}
                    onSave={() => saveVenue(place)}
                    onUnsave={() => unsaveVenue(place.id)}
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
                Enter a city, venue name, or description to find available event spaces. Results powered by Google Places.
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
  place,
  photoUrl,
  isSaved,
  saving,
  onSave,
  onUnsave,
}: {
  place: PlaceResult;
  photoUrl?: string;
  isSaved: boolean;
  saving: boolean;
  onSave: () => void;
  onUnsave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Photo */}
      <div className="h-40 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-gray-800 relative overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={place.displayName.text}
            className="w-full h-full object-cover"
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

        {/* Type badge */}
        {place.primaryType && (
          <Badge className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 text-xs border-0">
            {formatType(place.primaryType)}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
          {place.displayName.text}
        </h3>

        <div className="flex items-start gap-1.5 text-sm text-gray-500">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{place.formattedAddress}</span>
        </div>

        {/* Rating */}
        {place.rating && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {place.rating}
            </span>
            {place.userRatingCount && (
              <span className="text-gray-400">
                ({place.userRatingCount.toLocaleString()} reviews)
              </span>
            )}
          </div>
        )}

        {/* Editorial summary */}
        {place.editorialSummary?.text && (
          <p className="text-xs text-gray-500 line-clamp-2">
            {place.editorialSummary.text}
          </p>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {place.nationalPhoneNumber && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Phone className="w-3.5 h-3.5" />
                <a href={`tel:${place.nationalPhoneNumber}`} className="hover:text-purple-600">
                  {place.nationalPhoneNumber}
                </a>
              </div>
            )}
            {place.websiteUri && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <a
                  href={place.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 truncate"
                >
                  {place.websiteUri.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              </div>
            )}
            {place.googleMapsUri && (
              <a
                href={place.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700"
              >
                <Navigation className="w-3.5 h-3.5" />
                View on Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {place.types && place.types.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {place.types.slice(0, 5).map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {formatType(t)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-0.5 pt-1"
        >
          {expanded ? (
            <>
              Less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              More details <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
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
      <div className="h-32 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-gray-800 relative overflow-hidden">
        {venue.photo_url ? (
          <img
            src={venue.photo_url}
            alt={venue.venue_name}
            className="w-full h-full object-cover"
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
            {venue.venue_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
