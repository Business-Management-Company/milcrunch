import { useState, useEffect } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Search, Image, Video, Trash2, ChevronDown, ChevronRight,
  FolderOpen, Tag, Filter, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface MediaRecord {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  cadence_tag: string | null;
  campaign_id: string | null;
  created_at: string;
  campaign_name?: string;
}

interface CampaignSummary {
  id: string;
  name: string;
  media_count: number;
}

export default function CreatorMediaLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video">("all");
  const [filterCadence, setFilterCadence] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [showUntagged, setShowUntagged] = useState(false);
  const [campaignsExpanded, setCampaignsExpanded] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch media and campaigns
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    const fetchData = async () => {
      // Fetch all media
      const { data: mediaData } = await supabase
        .from("creator_media")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch campaigns for sidebar
      const { data: campData } = await supabase
        .from("cadence_campaigns")
        .select("id, name")
        .or(`user_id.eq.${user.id},created_by.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const records = (mediaData ?? []) as MediaRecord[];

      // Enrich with campaign names
      const campMap = new Map((campData ?? []).map((c: any) => [c.id, c.name]));
      records.forEach((r) => {
        if (r.campaign_id && campMap.has(r.campaign_id)) {
          r.campaign_name = campMap.get(r.campaign_id);
        }
      });

      // Build campaign summaries with media counts
      const countMap = new Map<string, number>();
      records.forEach((r) => {
        if (r.campaign_id) {
          countMap.set(r.campaign_id, (countMap.get(r.campaign_id) ?? 0) + 1);
        }
      });
      const summaries: CampaignSummary[] = (campData ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        media_count: countMap.get(c.id) ?? 0,
      }));

      setMedia(records);
      setCampaigns(summaries);
      setLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const handleDelete = async (item: MediaRecord) => {
    if (!confirm(`Delete "${item.filename}"?`)) return;
    setDeleting(item.id);
    await supabase.from("creator_media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    setDeleting(null);
    toast.success("File deleted");
  };

  // Get unique cadence tags for filter dropdown
  const allTags = [...new Set(media.filter((m) => m.cadence_tag).map((m) => m.cadence_tag!))];

  // Apply filters
  const filtered = media.filter((m) => {
    if (searchQuery && !m.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType === "image" && m.file_type !== "image") return false;
    if (filterType === "video" && m.file_type !== "video") return false;
    if (filterCadence && m.cadence_tag !== filterCadence) return false;
    if (selectedCampaign && m.campaign_id !== selectedCampaign) return false;
    if (showUntagged && m.cadence_tag) return false;
    return true;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <CreatorLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* LEFT SIDEBAR */}
        <div className="w-[240px] shrink-0 border-r border-border bg-card overflow-y-auto hidden lg:block">
          <div className="p-3 space-y-1">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="h-8 text-xs pl-8"
              />
            </div>

            {/* All Media */}
            <button
              onClick={() => { setSelectedCampaign(null); setShowUntagged(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedCampaign && !showUntagged
                  ? "bg-[#1B3A6B]/10 text-[#1B3A6B] dark:bg-[#1B3A6B]/20 dark:text-blue-300"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              All Media
              <span className="ml-auto text-xs text-muted-foreground">{media.length}</span>
            </button>

            {/* Campaign Media */}
            <div>
              <button
                onClick={() => setCampaignsExpanded(!campaignsExpanded)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {campaignsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Campaign Media
              </button>
              {campaignsExpanded && campaigns.map((camp) => (
                <button
                  key={camp.id}
                  onClick={() => { setSelectedCampaign(camp.id); setShowUntagged(false); }}
                  className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedCampaign === camp.id
                      ? "bg-[#1B3A6B]/10 text-[#1B3A6B] font-medium dark:bg-[#1B3A6B]/20 dark:text-blue-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="truncate flex-1 text-left">{camp.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{camp.media_count}</span>
                </button>
              ))}
            </div>

            {/* Untagged */}
            <button
              onClick={() => { setShowUntagged(true); setSelectedCampaign(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showUntagged
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Tag className="h-4 w-4" />
              Untagged
              <span className="ml-auto text-xs text-muted-foreground">
                {media.filter((m) => !m.cadence_tag).length}
              </span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-foreground">Media Library</h1>
                <p className="text-sm text-muted-foreground">
                  {filtered.length} file{filtered.length !== 1 ? "s" : ""}
                  {selectedCampaign && campaigns.find((c) => c.id === selectedCampaign) && (
                    <span> in {campaigns.find((c) => c.id === selectedCampaign)!.name}</span>
                  )}
                  {showUntagged && " without cadence tags"}
                </p>
              </div>
              <Button
                className="bg-[#1B3A6B] hover:bg-[#152d54] text-white text-xs"
                onClick={() => navigate("/creator/post/new?tab=cadence")}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload via Campaign
              </Button>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mobile search */}
              <div className="relative lg:hidden flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-8 text-xs pl-8"
                />
              </div>

              {/* Type filter */}
              <div className="flex items-center gap-0 rounded-lg border border-border overflow-hidden">
                {(["all", "image", "video"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterType === t
                        ? "bg-[#1B3A6B] text-white"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "all" ? "All" : t === "image" ? "Images" : "Videos"}
                  </button>
                ))}
              </div>

              {/* Cadence tag filter */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={filterCadence}
                    onChange={(e) => setFilterCadence(e.target.value)}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All cadences</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Image className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-lg font-semibold text-muted-foreground">No media yet</h3>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                  Upload media from a Cadence Campaign to build your library
                </p>
                <Button
                  variant="outline"
                  className="mt-4 text-xs"
                  onClick={() => navigate("/creator/post/new?tab=cadence")}
                >
                  Create a Campaign
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-border overflow-hidden bg-card hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-36 bg-gray-100 dark:bg-gray-800">
                      {item.file_type === "video" ? (
                        <>
                          {item.file_url ? (
                            <video src={item.file_url} className="w-full h-full object-cover" muted />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
                              <div className="ml-0.5 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[12px] border-l-white" />
                            </div>
                          </div>
                        </>
                      ) : (
                        item.file_url ? (
                          <img src={item.file_url} className="w-full h-full object-cover" alt={item.filename} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )
                      )}

                      {/* Type badge */}
                      <span className={`absolute bottom-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.file_type === "video"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}>
                        {item.file_type === "video" ? "REEL" : "IMAGE"}
                      </span>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          className="bg-[#1B3A6B] hover:bg-[#152d54] text-white text-[11px] h-7 px-2.5"
                          onClick={() => navigate("/creator/post/new?tab=cadence")}
                        >
                          Use in Campaign
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-[11px] h-7 px-2"
                          onClick={() => handleDelete(item)}
                          disabled={deleting === item.id}
                        >
                          {deleting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5 space-y-1.5">
                      <p className="text-xs font-medium truncate" title={item.filename}>{item.filename}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{formatSize(item.file_size)}</span>
                        <span>&middot;</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.cadence_tag ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] dark:bg-[#1B3A6B]/20 dark:text-blue-300">
                            {item.cadence_tag}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                            Untagged
                          </span>
                        )}
                        {item.campaign_name && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {item.campaign_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </CreatorLayout>
  );
}
