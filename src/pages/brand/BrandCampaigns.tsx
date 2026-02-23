import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Megaphone,
  Loader2,
  Download,
  CalendarClock,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Hash,
  Image,
  Video,
  Type,
  Layers,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Tag,
  Search,
  MapPin,
  Users,
  Pencil,
  Check,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Target,
  ImagePlus,
  Upload,
  Trash2,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadText, uploadPhotos, uploadVideo, type UploadPostPlatform } from "@/services/upload-post";
import { useUploadPostConnect } from "@/hooks/useUploadPostConnect";
import { useDemoMode } from "@/hooks/useDemoMode";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface CampaignPost {
  day: number;
  date_label: string;
  platform: string;
  content_type: string;
  caption: string;
  hashtags: string;
  suggested_visual: string;
  best_time: string;
}

interface CampaignPhase {
  phase: string;
  posts: CampaignPost[];
}

interface CampaignData {
  campaign_name: string;
  total_posts: number;
  phases: CampaignPhase[];
}

interface EventOption {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  venue: string | null;
  hasCampaign?: boolean;
}

/** Safely format a date value that may be ISO string, date-only, null, or malformed. */
const formatDate = (d: string | null | undefined): string => {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

interface SponsorOption {
  id: string;
  name: string;
}

interface TagGroup {
  id: string;
  name: string;
  hashtags: string[];
  use_count: number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const GOALS = ["Custom", "Pre-Event Hype", "Day-Of Coverage", "Post-Event Recap", "Full Campaign"] as const;
const DURATIONS = [30, 60, 90] as const;
const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "tiktok", label: "TikTok", icon: Hash },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "x", label: "X", icon: Twitter },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
] as const;

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  tiktok: <TikTokIcon className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  x: <Twitter className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
};

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
  carousel: <Layers className="h-3.5 w-3.5" />,
  text: <Type className="h-3.5 w-3.5" />,
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function sponsorHandle(name: string): string {
  return "@" + name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sponsorHashtag(name: string): string {
  return "#" + name.replace(/[^a-zA-Z0-9]+/g, "");
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

/* ------------------------------------------------------------------ */
/* Section Wrapper                                                     */
/* ------------------------------------------------------------------ */

function FormSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="border-l-4 border-[#1e3a5f] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-bold flex items-center justify-center shrink-0">
            {number}
          </span>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Platform Toggles                                                    */
/* ------------------------------------------------------------------ */

function PlatformToggles({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (key: string) => {
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );
  };
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all",
            selected.includes(key)
              ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
              : "bg-white dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#1e3a5f]/40"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Directory Member Combobox (Key Speakers)                            */
/* ------------------------------------------------------------------ */

function DirectoryMemberCombobox({
  selected,
  onChange,
  eventLinked = [],
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  eventLinked?: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ creator_name: string; creator_handle: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("directory_members")
        .select("creator_name, creator_handle")
        .or(`creator_name.ilike.%${query}%,creator_handle.ilike.%${query}%`)
        .limit(8);
      setResults(data ?? []);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const addSpeaker = (name: string) => {
    if (!selected.includes(name)) {
      onChange([...selected, name]);
    }
    setQuery("");
    setOpen(false);
  };

  const removeSpeaker = (name: string) => {
    onChange(selected.filter((s) => s !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      addSpeaker(query.trim());
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => {
            const isFromEvent = eventLinked.includes(name);
            return (
              <span
                key={name}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                  isFromEvent
                    ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                    : "bg-[#1e3a5f]/10 text-[#1e3a5f] border-[#1e3a5f]/20"
                )}
              >
                {name}
                <button type="button" onClick={() => removeSpeaker(name)} className={isFromEvent ? "hover:text-white/70" : "hover:text-[#2d5282]"}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {selected.length === 0 && eventLinked.length === 0 && (
        <p className="text-xs text-gray-400 italic">No speakers linked to this event yet — type to add one.</p>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search speakers or type a name..."
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
        {open && results.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.creator_handle}
                type="button"
                onClick={() => addSpeaker(r.creator_name || r.creator_handle)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#0F1117] text-sm flex items-center gap-2 transition-colors"
              >
                <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="font-medium text-gray-800 dark:text-gray-200">{r.creator_name || r.creator_handle}</span>
                {r.creator_name && r.creator_handle && (
                  <span className="text-xs text-gray-400">@{r.creator_handle}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-400">Press Enter to add a custom speaker name</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sponsor Combobox (All Sponsors)                                     */
/* ------------------------------------------------------------------ */

function SponsorCombobox({
  allSponsors,
  selected,
  onChange,
  eventLinked = [],
}: {
  allSponsors: SponsorOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  eventLinked?: string[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? allSponsors.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : allSponsors;

  const selectedSponsors = selected.map((id) => {
    if (id.startsWith("custom:")) return { id, name: id.replace("custom:", "") };
    return allSponsors.find((s) => s.id === id) ?? { id, name: id };
  });

  const addSponsor = (id: string) => {
    if (!selected.includes(id)) {
      onChange([...selected, id]);
    }
    setQuery("");
    setOpen(false);
  };

  const removeSponsor = (id: string) => {
    onChange(selected.filter((s) => s !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      const customId = `custom:${query.trim()}`;
      addSponsor(customId);
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      {selectedSponsors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSponsors.map((s) => {
            const isFromEvent = eventLinked.includes(s.id);
            return (
              <span
                key={s.id}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                  isFromEvent
                    ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                    : "bg-[#1e3a5f]/10 text-[#1e3a5f] border-[#1e3a5f]/20"
                )}
              >
                {s.name}
                <button type="button" onClick={() => removeSponsor(s.id)} className={isFromEvent ? "hover:text-white/70" : "hover:text-[#2d5282]"}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {selectedSponsors.length === 0 && eventLinked.length === 0 && (
        <p className="text-xs text-gray-400 italic">No sponsors linked to this event yet — type to add one.</p>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          placeholder="Search sponsors or type a name..."
          className="pl-9"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {filtered.map((s) => {
              const isSelected = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => isSelected ? removeSponsor(s.id) : addSponsor(s.id)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                    isSelected
                      ? "bg-[#1e3a5f]/5 text-[#1e3a5f]"
                      : "hover:bg-gray-50 dark:hover:bg-[#0F1117] text-gray-800 dark:text-gray-200"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0",
                      isSelected ? "bg-[#1e3a5f] border-[#1e3a5f]" : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {isSelected && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="font-medium">{s.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-400">Press Enter to add a custom sponsor name</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tag Group Modal                                                     */
/* ------------------------------------------------------------------ */

function TagGroupModal({
  onSave,
  onClose,
}: {
  onSave: (name: string, hashtagsRaw: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1A1D27] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">New Tag Group</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Group Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "MIC 2026"'
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Hashtags
            </Label>
            <textarea
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="#MIC2026 #MilitaryInfluencer #VeteranCreators"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || !tags.trim()}
              onClick={() => {
                onSave(name.trim(), tags.trim());
                onClose();
              }}
              className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
            >
              Save Group
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post Card                                                           */
/* ------------------------------------------------------------------ */

function PostCard({
  post,
  onSchedule,
  onUpdate,
  scheduling,
  scheduled,
  accountHandle,
  mediaUrl,
  mediaType,
  mediaUploading,
  onMediaUpload,
  onMediaRemove,
}: {
  post: CampaignPost;
  onSchedule: () => void;
  onUpdate: (patch: Partial<CampaignPost>) => void;
  scheduling: boolean;
  scheduled: boolean;
  accountHandle?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  mediaUploading?: boolean;
  onMediaUpload?: (file: File) => void;
  onMediaRemove?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editHashtags, setEditHashtags] = useState(post.hashtags);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveEdit = () => {
    onUpdate({ caption: editCaption, hashtags: editHashtags });
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditCaption(post.caption);
    setEditHashtags(post.hashtags);
    setEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onMediaUpload) onMediaUpload(file);
    if (e.target) e.target.value = "";
  };

  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#1e3a5f] bg-[#1e3a5f]/10 px-2.5 py-1 rounded-full">
            {post.date_label}
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            {PLATFORM_ICONS[post.platform] ?? null}
            <span className="text-xs font-medium capitalize">{post.platform}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 dark:bg-[#0F1117] px-2 py-1 rounded-full">
            {CONTENT_TYPE_ICONS[post.content_type] ?? <Type className="h-3.5 w-3.5" />}
            {post.content_type}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {post.best_time}
          </span>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1 rounded-md text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10 transition-colors"
              title="Edit post"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button type="button" onClick={saveEdit} className="p-1 rounded-md text-green-600 hover:bg-green-50 transition-colors" title="Save"><Check className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={cancelEdit} className="p-1 rounded-md text-gray-400 hover:bg-gray-100 transition-colors" title="Cancel"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2 mb-3">
          <textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-[#1e3a5f]/30 bg-gray-50 dark:bg-[#0F1117] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
          />
          <input
            value={editHashtags}
            onChange={(e) => setEditHashtags(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-xs text-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
            placeholder="Hashtags..."
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-800 dark:text-gray-200 mb-2 leading-relaxed">{post.caption}</p>
          {post.hashtags && (
            <p className="text-xs text-[#1e3a5f] font-medium mb-2">{post.hashtags}</p>
          )}
        </>
      )}

      {post.suggested_visual && !editing && (
        <p className="text-xs text-gray-400 italic mb-3">
          Visual: {post.suggested_visual}
        </p>
      )}

      {/* Media preview / upload */}
      {mediaUrl ? (
        <div className="relative mb-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {mediaType === "video" ? (
            <video
              src={mediaUrl}
              className="w-full max-h-40 object-cover"
              controls={false}
              muted
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Post media"
              className="w-full max-h-40 object-cover"
            />
          )}
          <button
            type="button"
            onClick={onMediaRemove}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            title="Remove media"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium text-white bg-black/50 px-1.5 py-0.5 rounded">
            {mediaType === "video" ? "Video" : "Image"} attached
          </span>
        </div>
      ) : (
        <div className="mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={mediaUploading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 transition-colors"
          >
            {mediaUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImagePlus className="h-3 w-3" />
            )}
            {mediaUploading ? "Uploading..." : "+ Add Media"}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onSchedule}
          disabled={scheduling || scheduled}
          className={cn("text-xs", scheduled && "border-green-300 text-green-600")}
        >
          {scheduling ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : scheduled ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <CalendarClock className="h-3 w-3 mr-1" />
          )}
          {scheduled ? "Scheduled" : "Schedule"}
        </Button>
        {accountHandle && (
          <span className="text-[10px] text-gray-400">
            {PLATFORM_ICONS[post.platform] ? <span className="inline-flex items-center gap-1">{PLATFORM_ICONS[post.platform]} @{accountHandle}</span> : `@${accountHandle}`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign Live Preview                                               */
/* ------------------------------------------------------------------ */

function CampaignLivePreview({
  eventTitle,
  startDate,
  endDate,
  goal,
  speakerNames,
  sponsorNames,
  hashtags,
  platforms,
  duration,
}: {
  eventTitle: string | null;
  startDate: string;
  endDate: string;
  goal: string;
  speakerNames: string[];
  sponsorNames: string[];
  hashtags: string;
  platforms: string[];
  duration: number;
}) {
  const isEmpty = !eventTitle;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-12"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#8B7CF7] flex items-center justify-center mb-5 shadow-md">
          <Megaphone className="h-8 w-8 text-white" />
        </div>
        <p className="text-gray-800 dark:text-gray-200 font-semibold text-base mb-1.5">Campaign Preview</p>
        <p className="text-sm text-gray-400 leading-relaxed max-w-[280px] text-center">
          Fill out the form to see your campaign preview
        </p>
      </div>
    );
  }

  const hashtagList = hashtags.split(/\s+/).filter((h) => h.startsWith("#"));
  const hasDateRange = !!(startDate && endDate && endDate >= startDate);
  const dateDuration = hasDateRange ? daysBetween(startDate, endDate) : null;

  return (
    <div
      className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
    >
      {/* Event name */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Event</p>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{eventTitle}</h3>
      </div>

      {/* Date range */}
      {(startDate || endDate) && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <CalendarClock className="h-4 w-4 text-[#1e3a5f]" />
          <span>
            {formatDate(startDate)}
            {startDate && endDate && " — "}
            {formatDate(endDate)}
          </span>
        </div>
      )}

      {/* Goal badge + duration pill */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] border border-[#1e3a5f]/20">
          {goal}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
          {dateDuration ?? duration} days
        </span>
      </div>

      {/* Platform icons */}
      {platforms.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Platforms</p>
          <div className="flex gap-2">
            {platforms.map((p) => (
              <span
                key={p}
                className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f] flex items-center justify-center"
              >
                {PLATFORM_ICONS[p]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Speaker chips */}
      {speakerNames.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Speakers</p>
          <div className="flex flex-wrap gap-1.5">
            {speakerNames.map((name) => (
              <span key={name} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sponsor chips */}
      {sponsorNames.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Sponsors</p>
          <div className="flex flex-wrap gap-1.5">
            {sponsorNames.map((name) => (
              <span key={name} className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hashtag chips */}
      {hashtagList.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Hashtags</p>
          <div className="flex flex-wrap gap-1.5">
            {hashtagList.map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] border border-[#1e3a5f]/20">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign Summary (collapsible)                                      */
/* ------------------------------------------------------------------ */

function CampaignSummary({
  campaign,
  eventTitle,
  startDate,
  endDate,
  goal,
  platforms,
  speakerNames,
  sponsorNames,
}: {
  campaign: CampaignData;
  eventTitle: string;
  startDate: string;
  endDate: string;
  goal: string;
  platforms: string[];
  speakerNames: string[];
  sponsorNames: string[];
}) {
  const [open, setOpen] = useState(true);

  // Compute per-phase post counts
  const phaseCounts = campaign.phases.map((p) => ({
    label: p.phase,
    count: p.posts.length,
  }));

  // Compute campaign window (min/max day)
  let minDay = 0;
  let maxDay = 0;
  for (const phase of campaign.phases) {
    for (const post of phase.posts) {
      if (post.day < minDay) minDay = post.day;
      if (post.day > maxDay) maxDay = post.day;
    }
  }

  // Duration in days
  const hasDateRange = !!(startDate && endDate && endDate >= startDate);
  const durationDays = hasDateRange ? daysBetween(startDate, endDate) : null;

  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="border-l-4 border-[#1e3a5f]">
        {/* Header row */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-[#0F1117]/50 transition-colors"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Campaign Summary
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {/* Collapsible body */}
        {open && (
          <div className="px-5 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800">
            {/* Event + Date + Duration row */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3">
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Event</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{eventTitle}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Date</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {formatDate(startDate)}
                  {startDate && endDate && startDate !== endDate && ` — ${formatDate(endDate)}`}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Duration</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {durationDays ? `${durationDays} day${durationDays !== 1 ? "s" : ""}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Goal</p>
                <span className="inline-flex items-center gap-1 text-sm text-[#1e3a5f] font-medium">
                  <Target className="h-3.5 w-3.5" />
                  {goal}
                </span>
              </div>
            </div>

            {/* Total Posts with phase breakdown */}
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Total Posts</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {campaign.total_posts}
                </span>
                <span className="text-xs text-gray-400">
                  ({phaseCounts.map((pc) => `${pc.label}: ${pc.count}`).join(" | ")})
                </span>
              </div>
            </div>

            {/* Platforms */}
            {platforms.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Platforms</p>
                <div className="flex gap-1.5">
                  {platforms.map((p) => (
                    <span
                      key={p}
                      className="w-7 h-7 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f] flex items-center justify-center"
                      title={p}
                    >
                      {PLATFORM_ICONS[p]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Speakers */}
            {speakerNames.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Speakers</p>
                <div className="flex flex-wrap gap-1.5">
                  {speakerNames.map((name) => (
                    <span
                      key={name}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sponsors */}
            {sponsorNames.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Sponsors</p>
                <div className="flex flex-wrap gap-1.5">
                  {sponsorNames.map((name) => (
                    <span
                      key={name}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign window */}
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Campaign Window</p>
              <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                <Calendar className="h-3.5 w-3.5 text-[#1e3a5f]" />
                <span>
                  Day {minDay < 0 ? minDay : `+${minDay}`} through Day {maxDay > 0 ? `+${maxDay}` : maxDay}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign Calendar                                                   */
/* ------------------------------------------------------------------ */

function CampaignCalendar({ campaign, startDate }: { campaign: CampaignData; startDate: string }) {
  const eventDate = startDate ? new Date(startDate + "T00:00") : new Date();
  const [viewMonth, setViewMonth] = useState(() => new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));

  // Build map: YYYY-MM-DD → count of posts
  const postsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const phase of campaign.phases) {
      for (const post of phase.posts) {
        const d = new Date(eventDate);
        d.setDate(d.getDate() + post.day);
        const key = d.toISOString().split("T")[0];
        map[key] = (map[key] ?? 0) + 1;
      }
    }
    return map;
  }, [campaign, eventDate]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="h-4 w-4 text-gray-500" /></button>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
          {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h4>
        <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight className="h-4 w-4 text-gray-500" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-[10px] font-medium text-gray-400 pb-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = postsByDate[dateKey] ?? 0;
          const isToday = dateKey === today;
          return (
            <div
              key={dateKey}
              className={cn(
                "relative flex flex-col items-center justify-center h-8 rounded-md text-xs",
                isToday && "ring-1 ring-[#1e3a5f]",
                count > 0 ? "font-semibold text-gray-900 dark:text-white" : "text-gray-400"
              )}
            >
              {day}
              {count > 0 && (
                <span className="absolute -bottom-0.5 w-4 h-1.5 rounded-full bg-[#1e3a5f] text-[7px] text-white flex items-center justify-center leading-none">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Connected Socials Banner                                            */
/* ------------------------------------------------------------------ */

function ConnectedSocialsBanner({
  accounts,
  loading,
  onConnect,
}: {
  accounts: { platform: string; platform_username: string | null }[];
  loading: boolean;
  onConnect: () => void;
}) {
  if (loading) return null;

  if (accounts.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2.5 mb-4">
        <WifiOff className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
          No social accounts connected. Connect your accounts to schedule posts.
        </p>
        <Button size="sm" variant="outline" onClick={onConnect} className="text-xs shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100">
          Connect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2 mb-4">
      <Wifi className="h-4 w-4 text-green-600 shrink-0" />
      <div className="flex items-center gap-2 flex-wrap flex-1">
        <span className="text-xs font-medium text-green-700 dark:text-green-300">Connected:</span>
        {accounts.map((a) => (
          <span key={`${a.platform}-${a.platform_username}`} className="flex items-center gap-1 text-[10px] font-medium text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-800/40 px-2 py-0.5 rounded-full">
            {PLATFORM_ICONS[a.platform.toLowerCase()] ?? null}
            {a.platform_username ? `@${a.platform_username}` : a.platform}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function BrandCampaigns() {
  const navigate = useNavigate();
  const { user, effectiveUserId } = useAuth();
  const { guardAction } = useDemoMode();
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const { accounts: connectedAccounts, loading: socialsLoading, openConnectPopup } = useUploadPostConnect();

  // Map platform → connected account handle
  const platformHandles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of connectedAccounts) {
      const p = a.platform.toLowerCase();
      if (a.platform_username) map[p] = a.platform_username;
    }
    return map;
  }, [connectedAccounts]);

  // Form state
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("Custom");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(30);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [speakerNames, setSpeakerNames] = useState<string[]>([]);
  const [eventSpeakerNames, setEventSpeakerNames] = useState<string[]>([]); // auto-populated from event
  const [allSponsors, setAllSponsors] = useState<SponsorOption[]>([]);
  const [selectedSponsors, setSelectedSponsors] = useState<string[]>([]);
  const [eventSponsorIds, setEventSponsorIds] = useState<string[]>([]); // auto-populated from event
  const [hashtags, setHashtags] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "tiktok"]);

  // Tag groups (Supabase-backed)
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [activePhase, setActivePhase] = useState(0);
  const [error, setError] = useState("");

  // Animate generation steps
  const GEN_STEPS = ["Analyzing your audience", "Selecting optimal creators", "Crafting messaging strategy", "Setting campaign parameters", "Finalizing your campaign"];
  useEffect(() => {
    if (!generating) { setGenStep(0); return; }
    const interval = setInterval(() => {
      setGenStep((prev) => (prev < GEN_STEPS.length ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [generating]);

  // Scheduling state
  const [schedulingPosts, setSchedulingPosts] = useState<Set<number>>(new Set());
  const [scheduledPosts, setScheduledPosts] = useState<Set<number>>(new Set());
  const [scheduleAllLoading, setScheduleAllLoading] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Saved campaign state
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [loadedFromSaved, setLoadedFromSaved] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  // Media state: keyed by global post index
  const [postMedia, setPostMedia] = useState<Record<number, { file: File; url: string; type: "image" | "video" }>>({});
  const [uploadingMedia, setUploadingMedia] = useState<Set<number>>(new Set());

  // Computed: date-based duration
  const hasDateRange = !!(startDate && endDate && endDate >= startDate);
  const dateDuration = hasDateRange ? daysBetween(startDate, endDate) : null;
  const effectiveDuration = dateDuration ?? duration;

  // Resolve sponsor names for preview and AI prompt
  const resolvedSponsorNames = selectedSponsors.map((id) => {
    if (id.startsWith("custom:")) return id.replace("custom:", "");
    return allSponsors.find((s) => s.id === id)?.name ?? id;
  });

  // Auto-append sponsor handles/hashtags when selection changes
  useEffect(() => {
    if (selectedSponsors.length === 0) return;
    const additions: string[] = [];
    selectedSponsors.forEach((id) => {
      const name = id.startsWith("custom:")
        ? id.replace("custom:", "")
        : allSponsors.find((s) => s.id === id)?.name;
      if (!name) return;
      const h = sponsorHandle(name);
      const t = sponsorHashtag(name);
      if (!hashtags.includes(h)) additions.push(h);
      if (!hashtags.includes(t)) additions.push(t);
    });
    if (additions.length > 0) {
      setHashtags((prev) => (prev ? prev + " " + additions.join(" ") : additions.join(" ")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSponsors]);

  // Load events (expanded fields) + check which have saved campaigns
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, start_date, end_date, description, city, state, venue")
        .order("start_date", { ascending: false });
      const eventList = (data ?? []) as EventOption[];
      if (eventList.length > 0) {
        const { data: campaignRows } = await supabase
          .from("event_campaigns")
          .select("event_id")
          .in("event_id", eventList.map((e) => e.id));
        const campaignEventIds = new Set((campaignRows ?? []).map((r: { event_id: string }) => r.event_id));
        for (const ev of eventList) {
          ev.hasCampaign = campaignEventIds.has(ev.id);
        }
      }
      setEvents(eventList);
    })();
  }, []);

  // Pre-populate form dates + speakers + sponsors from selected event
  useEffect(() => {
    if (!selectedEventId) {
      setEventSpeakerNames([]);
      setEventSponsorIds([]);
      return;
    }
    const ev = events.find((e) => e.id === selectedEventId);
    if (!ev) return;
    if (ev.start_date) {
      setStartDate(ev.start_date.split("T")[0]);
    }
    if (ev.end_date) {
      setEndDate(ev.end_date.split("T")[0]);
    }

    // Fetch linked speakers
    (async () => {
      const { data } = await supabase
        .from("event_speakers")
        .select("creator_name, creator_handle")
        .eq("event_id", selectedEventId);
      const names = (data ?? [])
        .map((s: { creator_name: string | null; creator_handle: string | null }) => s.creator_name || s.creator_handle || "")
        .filter(Boolean);
      setEventSpeakerNames(names);
      // Merge into speakerNames (keep any manually-added ones, prepend event speakers)
      setSpeakerNames((prev) => {
        const combined = [...new Set([...names, ...prev])];
        return combined;
      });
    })();

    // Fetch linked sponsors
    (async () => {
      const { data } = await supabase
        .from("event_sponsors")
        .select("sponsor_name")
        .eq("event_id", selectedEventId);
      const sponsorNames = (data ?? [])
        .map((s: { sponsor_name: string }) => s.sponsor_name)
        .filter(Boolean);
      // Match to allSponsors by name, or create custom entries
      const ids = sponsorNames.map((name: string) => {
        const match = allSponsors.find((s) => s.name.toLowerCase() === name.toLowerCase());
        return match ? match.id : `custom:${name}`;
      });
      setEventSponsorIds(ids);
      setSelectedSponsors((prev) => {
        const combined = [...new Set([...ids, ...prev])];
        return combined;
      });
    })();
  }, [selectedEventId, events, allSponsors]);

  // Load saved campaign when event is selected
  useEffect(() => {
    if (!selectedEventId) {
      setCampaign(null);
      setSavedCampaignId(null);
      setLoadedFromSaved(false);
      setPostMedia({});
      setUploadingMedia(new Set());
      return;
    }
    (async () => {
      let query = supabase
        .from("event_campaigns")
        .select("id, campaign_data")
        .eq("event_id", selectedEventId);
      if (user?.id) query = query.eq("user_id", user.id);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return;
      const cd = data.campaign_data as unknown as CampaignData;
      if (cd && cd.campaign_name && cd.phases) {
        setCampaign(cd);
        setSavedCampaignId(data.id);
        setLoadedFromSaved(true);
        setActivePhase(0);
        setPostMedia({});
        setScheduledPosts(new Set());
      }
    })();
  }, [selectedEventId, user?.id]);

  // Load ALL sponsors on mount (not tied to event)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sponsors")
        .select("id, name")
        .order("name");
      setAllSponsors((data ?? []) as SponsorOption[]);
    })();
  }, []);

  // Load tag groups from Supabase
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("hashtag_groups")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load hashtag groups:", error);
        return;
      }
      setTagGroups(
        ((data ?? []) as TagGroup[]).map((g) => ({
          ...g,
          hashtags: Array.isArray(g.hashtags)
            ? g.hashtags
            : typeof g.hashtags === "string"
              ? JSON.parse(g.hashtags as string)
              : [],
        }))
      );
    })();
  }, []);

  // Get selected event details
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Handle tag group save to Supabase
  const handleSaveTagGroup = async (name: string, hashtagsRaw: string) => {
    const parsed = hashtagsRaw
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const { data, error } = await supabase
      .from("hashtag_groups")
      .insert({ name, hashtags: parsed as any, use_count: 0 })
      .select()
      .single();

    if (error) {
      console.error("Failed to save tag group:", error);
      return;
    }
    if (data) {
      setTagGroups((prev) => [...prev, { ...data, hashtags: parsed } as TagGroup]);
    }
  };

  const handleDeleteTagGroup = async (id: string) => {
    const { error } = await supabase.from("hashtag_groups").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete tag group:", error);
      return;
    }
    setTagGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const applyTagGroup = async (g: TagGroup) => {
    setHashtags((prev) => {
      const existing = prev.split(/\s+/).filter(Boolean);
      const combined = [...new Set([...existing, ...g.hashtags])];
      return combined.join(" ");
    });
    // Increment use_count
    await supabase
      .from("hashtag_groups")
      .update({ use_count: (g.use_count ?? 0) + 1 })
      .eq("id", g.id);
    setTagGroups((prev) =>
      prev.map((tg) => (tg.id === g.id ? { ...tg, use_count: (tg.use_count ?? 0) + 1 } : tg))
    );
  };

  // Generate campaign
  const handleGenerate = useCallback(async () => {
    if (guardAction("save")) return;
    if (!selectedEventId || platforms.length === 0) return;
    setGenerating(true);
    setError("");
    setCampaign(null);

    const goalInstruction =
      goal === "Custom"
        ? "Create a balanced campaign with a mix of pre-event hype, day-of coverage, and post-event recap. Adjust the mix based on the duration."
        : goal === "Full Campaign"
          ? "Include all three phases: Pre-Event, Day-Of, and Post-Event."
          : `Focus on the ${goal} phase but include brief supporting posts in other phases.`;

    const systemPrompt = `You are a military event social media strategist. Generate a complete social media campaign calendar. Return ONLY valid JSON matching the exact schema requested. No markdown, no code fences, no explanation — just the JSON object.`;

    const userPrompt = `Generate a social media campaign with the following details:

Event: ${selectedEvent?.title ?? "Unknown"}
Event Date: ${selectedEvent?.start_date ?? "TBD"}
Campaign Goal: ${goal}
Campaign Duration: ${effectiveDuration} days${hasDateRange ? ` (${startDate} to ${endDate})` : ""}
Key Speakers: ${speakerNames.length > 0 ? speakerNames.join(", ") : "None specified"}
Sponsors to Feature: ${resolvedSponsorNames.length > 0 ? resolvedSponsorNames.join(", ") : "None specified"}
Hashtags: ${hashtags || "None specified"}
Platforms: ${platforms.join(", ")}

Return this exact JSON structure:
{
  "campaign_name": "string",
  "total_posts": number,
  "phases": [
    {
      "phase": "Pre-Event" | "Day-Of" | "Post-Event",
      "posts": [
        {
          "day": number (negative for pre-event, 0 for day-of, positive for post-event),
          "date_label": "string (e.g. Day -14, Day 0, Day +3)",
          "platform": "instagram" | "tiktok" | "youtube" | "x" | "linkedin",
          "content_type": "video" | "image" | "carousel" | "text",
          "caption": "string (full caption optimized for the platform, including emojis and calls to action)",
          "hashtags": "string (relevant hashtags)",
          "suggested_visual": "string (description of what to film or design)",
          "best_time": "string (e.g. 9:00 AM ET)"
        }
      ]
    }
  ]
}

${goalInstruction}
Generate posts across the specified platforms, varying content types. Create ${effectiveDuration <= 30 ? "15-25" : effectiveDuration <= 60 ? "25-40" : "40-60"} total posts spread across the campaign duration.
Make the captions authentic and engaging for a military community audience. Reference the speakers and sponsors naturally where appropriate.`;

    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey ?? "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `API ${res.status}`);
      }

      const result = await res.json();
      const text =
        result.content?.[0]?.text ??
        (typeof result.content === "string" ? result.content : "");

      // Strip markdown code fences if present
      const cleaned = text
        .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
        .replace(/```[\s\S]*$/, "")
        .trim();

      // Find the JSON object boundaries
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart
        ? cleaned.slice(jsonStart, jsonEnd + 1)
        : cleaned;

      let parsed: CampaignData;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error(
          "Campaign generation failed — try selecting fewer platforms or a shorter duration."
        );
      }

      setCampaign(parsed);
      setActivePhase(0);
      setPostMedia({});
      setScheduledPosts(new Set());

      // Flatten all posts into a single array for the posts column
      const allPosts = parsed.phases.flatMap((ph) =>
        ph.posts.map((p) => ({ ...p, phase: ph.phase })),
      );

      // Save to Supabase
      const { data: insertedCampaign } = await supabase
        .from("event_campaigns")
        .insert({
          event_id: selectedEventId,
          user_id: user?.id ?? null,
          title: parsed.campaign_name,
          campaign_name: parsed.campaign_name,
          campaign_data: parsed as any,
          posts: allPosts as any,
          status: "draft",
        })
        .select("id")
        .single();
      setSavedCampaignId(insertedCampaign?.id ?? null);
      setLoadedFromSaved(false);

      // Mark event as having a campaign so badge shows immediately
      if (insertedCampaign?.id) {
        setEvents((prev) => prev.map((e) => e.id === selectedEventId ? { ...e, hasCampaign: true } : e));
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 2500);
      }
    } catch (err: any) {
      console.error("Campaign generation failed:", err);
      setError(
        err.message?.includes("Campaign generation failed")
          ? err.message
          : err.message || "Failed to generate campaign. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }, [guardAction, selectedEventId, selectedEvent, goal, effectiveDuration, hasDateRange, startDate, endDate, speakerNames, resolvedSponsorNames, hashtags, platforms, apiKey]);

  // Schedule a single post
  const schedulePost = useCallback(
    async (post: CampaignPost, globalIndex: number) => {
      if (!selectedEvent?.start_date || !effectiveUserId) return;
      setSchedulingPosts((prev) => new Set(prev).add(globalIndex));
      try {
        const eventDate = new Date(selectedEvent.start_date);
        const postDate = new Date(eventDate);
        postDate.setDate(postDate.getDate() + post.day);
        const timeMatch = post.best_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]);
          const meridiem = timeMatch[3].toUpperCase();
          if (meridiem === "PM" && hour !== 12) hour += 12;
          if (meridiem === "AM" && hour === 12) hour = 0;
          postDate.setHours(hour, minute, 0, 0);
        }

        const media = postMedia[globalIndex];
        if (media?.type === "video") {
          await uploadVideo({
            title: post.caption.slice(0, 100),
            user: effectiveUserId,
            platform: [post.platform as UploadPostPlatform],
            video: media.url,
            scheduled_date: postDate.toISOString(),
            async_upload: true,
          });
        } else if (media?.type === "image") {
          await uploadPhotos({
            title: post.caption.slice(0, 100),
            user: effectiveUserId,
            platform: [post.platform as UploadPostPlatform],
            photos: [media.url],
            scheduled_date: postDate.toISOString(),
            async_upload: true,
          });
        } else {
          await uploadText({
            title: post.caption.slice(0, 100),
            user: effectiveUserId,
            platform: [post.platform as UploadPostPlatform],
            scheduled_date: postDate.toISOString(),
            async_upload: true,
          });
        }

        setScheduledPosts((prev) => new Set(prev).add(globalIndex));
      } catch (err) {
        console.error("Failed to schedule post:", err);
      } finally {
        setSchedulingPosts((prev) => {
          const next = new Set(prev);
          next.delete(globalIndex);
          return next;
        });
      }
    },
    [selectedEvent, user, postMedia]
  );

  // Schedule all posts
  const scheduleAll = useCallback(async () => {
    console.log("1. Send to Posting Queue clicked");
    if (!campaign) { console.log("1a. No campaign — aborting"); return; }
    setScheduleAllLoading(true);
    setScheduleFeedback(null);

    const selectedEvent = events.find((e) => e.id === selectedEventId);
    const eventDate = selectedEvent?.start_date ?? null;
    console.log("2. Event context:", { selectedEventId, eventDate, eventTitle: selectedEvent?.title, phaseCount: campaign.phases.length, totalPosts: campaign.phases.reduce((n, p) => n + p.posts.length, 0) });

    // Convert day offset + human time string → ISO 8601 timestamp
    const toISO = (day: number, timeStr: string | null): string | null => {
      if (!eventDate) return null;
      const base = new Date(eventDate);
      base.setDate(base.getDate() + day);
      if (!timeStr) { base.setHours(12, 0, 0, 0); return base.toISOString(); }
      try {
        const cleanTime = timeStr.replace(/\s*(ET|EST|EDT|PT|PST|PDT|CT|CST|CDT|MT|MST|MDT)\s*/gi, "").trim();
        const match = cleanTime.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
        if (!match) { console.log("toISO: no match for", timeStr, "→ defaulting to noon"); base.setHours(12, 0, 0, 0); return base.toISOString(); }
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2] || "0", 10);
        const meridiem = (match[3] || "").toUpperCase();
        if (meridiem === "PM" && h !== 12) h += 12;
        if (meridiem === "AM" && h === 12) h = 0;
        base.setHours(h, m, 0, 0);
        return base.toISOString();
      } catch {
        base.setHours(12, 0, 0, 0);
        return base.toISOString();
      }
    };

    const rows = campaign.phases.flatMap((phase) =>
      phase.posts.map((post) => {
        const scheduledTime = toISO(post.day, post.best_time);
        console.log("3. Post row:", { day: post.day, best_time: post.best_time, scheduledTime, platform: post.platform, captionPreview: (post.caption || "").slice(0, 60) });
        return {
          user_id: user?.id ?? null,
          caption: `${post.caption}\n\n${post.hashtags ?? ""}`.trim(),
          platforms: [post.platform],
          file_url: null,
          scheduled_time: scheduledTime,
          status: "queued",
          results: {
            phase: phase.phase,
            day: post.day,
            date_label: post.date_label,
            content_type: post.content_type,
            suggested_visual: post.suggested_visual,
            best_time_label: post.best_time || null,
            event_id: selectedEventId,
            campaign_id: savedCampaignId,
          },
        } as Record<string, unknown>;
      })
    );

    console.log("4. Full insert payload:", JSON.stringify(rows, null, 2));
    const { data: insertData, error: insertError } = await supabase.from("social_posts").insert(rows).select();
    console.log("5. Supabase result — data:", insertData, "error:", insertError);
    setScheduleAllLoading(false);

    if (insertError) {
      console.error("6. INSERT FAILED:", insertError.message, insertError.details, insertError.hint);
      setScheduleFeedback({ type: "error", msg: `Failed to queue posts: ${insertError.message}` });
    } else {
      console.log("6. INSERT OK —", rows.length, "rows inserted");
      setScheduleFeedback({ type: "success", msg: `✓ ${rows.length} posts sent to Posting queue` });
    }
  }, [campaign, selectedEventId, savedCampaignId, user?.id, events]);

  // Update a post inline
  const updatePost = useCallback((phaseIdx: number, postIdx: number, patch: Partial<CampaignPost>) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      const phases = prev.phases.map((phase, pi) => {
        if (pi !== phaseIdx) return phase;
        const posts = phase.posts.map((post, pj) => (pj === postIdx ? { ...post, ...patch } : post));
        return { ...phase, posts };
      });
      return { ...prev, phases };
    });
  }, []);

  // Upload media for a post
  const handleMediaUpload = useCallback(async (file: File, globalIndex: number) => {
    if (!selectedEventId) return;
    setUploadingMedia((prev) => new Set(prev).add(globalIndex));
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${selectedEventId}/${globalIndex}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("campaign-media")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) {
        console.error("Media upload failed:", uploadError);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("campaign-media")
        .getPublicUrl(path);
      const mediaType: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
      setPostMedia((prev) => ({
        ...prev,
        [globalIndex]: { file, url: urlData.publicUrl, type: mediaType },
      }));
    } catch (err) {
      console.error("Media upload error:", err);
    } finally {
      setUploadingMedia((prev) => {
        const next = new Set(prev);
        next.delete(globalIndex);
        return next;
      });
    }
  }, [selectedEventId]);

  // Remove media from a post
  const removeMedia = useCallback((globalIndex: number) => {
    setPostMedia((prev) => {
      const next = { ...prev };
      delete next[globalIndex];
      return next;
    });
  }, []);

  // Export CSV
  const exportCsv = useCallback(() => {
    if (!campaign) return;
    const rows: string[][] = [
      ["Phase", "Day", "Date Label", "Platform", "Content Type", "Caption", "Hashtags", "Suggested Visual", "Best Time"],
    ];
    for (const phase of campaign.phases) {
      for (const p of phase.posts) {
        rows.push([
          phase.phase,
          String(p.day),
          p.date_label,
          p.platform,
          p.content_type,
          `"${p.caption.replace(/"/g, '""')}"`,
          p.hashtags,
          `"${p.suggested_visual.replace(/"/g, '""')}"`,
          p.best_time,
        ]);
      }
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign.campaign_name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [campaign]);

  // Compute global index for a post
  const getGlobalIndex = (phaseIdx: number, postIdx: number): number => {
    if (!campaign) return 0;
    let idx = 0;
    for (let p = 0; p < phaseIdx; p++) idx += campaign.phases[p].posts.length;
    return idx + postIdx;
  };

  const isLargeCampaign = goal === "Full Campaign" && effectiveDuration >= 90;

  // Parse hashtags into removable chips
  const hashtagChips = hashtags.split(/\s+/).filter(Boolean);
  const removeHashtag = (tag: string) => {
    setHashtags((prev) => prev.split(/\s+/).filter((t) => t !== tag).join(" "));
  };

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-[#1e3a5f]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-pd-navy dark:text-white">
                AI Campaign Builder
              </h1>
              <p className="text-sm text-muted-foreground">
                Generate a complete social media campaign for your event in seconds.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* LEFT — Campaign Setup (sticky) */}
          <div className="lg:col-span-2 lg:sticky lg:top-20 space-y-4">
            {/* 1. Event */}
            <FormSection number={1} title="Event">
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((ev) => {
                    const dateStr = formatDate(ev.start_date);
                    return (
                      <SelectItem
                        key={ev.id}
                        value={ev.id}
                        className={ev.hasCampaign ? "border-l-2 border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>
                            {ev.title}
                            {dateStr && <span className="text-gray-400 text-xs ml-1">({dateStr})</span>}
                          </span>
                          {ev.hasCampaign && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                              ● Campaign
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </FormSection>

            {/* 2. Goal & Duration */}
            <FormSection number={2} title="Goal & Duration">
              <div>
                <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Campaign Goal</Label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGoal(g)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                        goal === g
                          ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                          : "bg-white dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#1e3a5f]/40"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div>
                <Label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  Campaign Dates
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 mb-0.5 block">Start</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F1117] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-0.5 block">End</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F1117] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                    />
                  </div>
                </div>
                {hasDateRange && (
                  <p className="text-xs text-[#1e3a5f] font-medium mt-1.5">
                    {dateDuration} days
                  </p>
                )}
              </div>

              {/* Duration pills — only show when no date range */}
              {!hasDateRange && (
                <div>
                  <Label className="text-xs font-medium text-gray-500 mb-1.5 block">
                    Or select duration
                  </Label>
                  <div className="flex gap-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-medium border transition-all",
                          duration === d
                            ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                            : "bg-white dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#1e3a5f]/40"
                        )}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </FormSection>

            {/* 3. Key Speakers */}
            <FormSection number={3} title="Key Speakers">
              <DirectoryMemberCombobox
                selected={speakerNames}
                onChange={setSpeakerNames}
                eventLinked={eventSpeakerNames}
              />
            </FormSection>

            {/* 4. Sponsors */}
            <FormSection number={4} title="Sponsors to Feature">
              <SponsorCombobox
                allSponsors={allSponsors}
                selected={selectedSponsors}
                onChange={setSelectedSponsors}
                eventLinked={eventSponsorIds}
              />
            </FormSection>

            {/* 5. Hashtags + Tags */}
            <FormSection number={5} title="Hashtags">
              {/* Saved tag groups */}
              {tagGroups.length > 0 && (
                <div>
                  <Label className="text-xs font-medium text-gray-500 mb-1.5 block">
                    Saved Tags
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tagGroups.map((g) => (
                      <div key={g.id} className="group flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => applyTagGroup(g)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] border border-[#1e3a5f]/20 hover:bg-[#1e3a5f]/20 transition-colors"
                        >
                          <Tag className="h-3 w-3" />
                          {g.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTagGroup(g.id)}
                          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs transition-opacity hover:bg-red-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTagModal(true)}
                  className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:underline font-medium"
                >
                  <Plus className="h-3 w-3" /> New Tag Group
                </button>
              </div>

              <Input
                placeholder="e.g. #MIC2026, #MilSpouseFest"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />

              {/* Hashtag chips */}
              {hashtagChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hashtagChips.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] border border-[#1e3a5f]/20"
                    >
                      {tag}
                      <button type="button" onClick={() => removeHashtag(tag)} className="hover:text-[#2d5282]">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </FormSection>

            {/* 6. Platforms */}
            <FormSection number={6} title="Platforms">
              <PlatformToggles selected={platforms} onChange={setPlatforms} />
            </FormSection>

            {/* Generate Button */}
            <div className="space-y-3">
              {isLargeCampaign && (
                <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs">
                    Full Campaign with {effectiveDuration}+ days generates 40-60 posts. This may take 15-30 seconds.
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!selectedEventId || platforms.length === 0 || generating}
                className="w-full bg-[#1e3a5f] hover:bg-[#2d5282] text-white font-semibold py-3"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : loadedFromSaved ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Campaign
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Campaign
                  </>
                )}
              </Button>

              {error && (
                <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Campaign Output */}
          <div className="lg:col-span-3 min-h-[400px]">
            {generating && (
              <div className="fixed inset-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 max-w-sm text-center p-8">
                  {/* Pulsing icon */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-blue-700 flex items-center justify-center animate-pulse">
                      <span className="text-2xl text-white">✦</span>
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-blue-500 animate-ping opacity-20" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Building Your Campaign</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI is crafting your campaign strategy...</p>
                  </div>

                  {/* Animated step list */}
                  <div className="w-full space-y-3 text-left">
                    {GEN_STEPS.map((step, i) => (
                      <div key={step} className="flex items-center gap-3 text-sm">
                        {genStep > i ? (
                          <span className="text-green-500 font-bold">✓</span>
                        ) : genStep === i ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">○</span>
                        )}
                        <span className={genStep >= i ? "text-gray-800 dark:text-gray-200" : "text-gray-300 dark:text-gray-600"}>{step}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-700 h-1.5 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min((genStep / GEN_STEPS.length) * 100, 100)}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-400">This usually takes 15–30 seconds</p>
                </div>
              </div>
            )}

            {!generating && !campaign && (
              <CampaignLivePreview
                eventTitle={selectedEvent?.title ?? null}
                startDate={startDate}
                endDate={endDate}
                goal={goal}
                speakerNames={speakerNames}
                sponsorNames={resolvedSponsorNames}
                hashtags={hashtags}
                platforms={platforms}
                duration={duration}
              />
            )}

            {!generating && campaign && (
              <div className="space-y-4">
                {/* Connected socials status */}
                <ConnectedSocialsBanner
                  accounts={connectedAccounts}
                  loading={socialsLoading}
                  onConnect={openConnectPopup}
                />

                {/* Campaign Summary card */}
                <CampaignSummary
                  campaign={campaign}
                  eventTitle={selectedEvent?.title ?? ""}
                  startDate={startDate}
                  endDate={endDate}
                  goal={goal}
                  platforms={platforms}
                  speakerNames={speakerNames}
                  sponsorNames={resolvedSponsorNames}
                />

                {/* Campaign header */}
                <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{campaign.campaign_name}</h2>
                        {savedCampaignId && (
                          <span className={cn(
                            "flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800 transition-all duration-300",
                            saveFlash && "ring-2 ring-green-400 ring-offset-1 scale-105",
                          )}>
                            <CheckCircle2 className="h-3 w-3" />
                            {saveFlash ? "Saved!" : "Saved"}
                          </span>
                        )}
                        {loadedFromSaved && (
                          <span className="text-xs text-gray-400">(loaded from saved)</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#1e3a5f] bg-[#1e3a5f]/10 px-2.5 py-1 rounded-full">
                        {campaign.total_posts} posts
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportCsv}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export CSV
                      </Button>
                      <Button
                        size="sm"
                        onClick={scheduleAll}
                        disabled={scheduleAllLoading}
                        className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
                      >
                        {scheduleAllLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Send className="h-4 w-4 mr-1" />
                        )}
                        Send to Posting Queue →
                      </Button>
                    </div>
                  </div>
                  {scheduleFeedback && (
                    <div
                      className={cn(
                        "flex items-center gap-2 mt-3 text-sm rounded-lg px-3 py-2",
                        scheduleFeedback.type === "success"
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                      )}
                    >
                      {scheduleFeedback.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      {scheduleFeedback.msg}
                      {scheduleFeedback.type === "success" && (
                        <button
                          onClick={() => navigate("/brand/posting")}
                          className="ml-auto text-xs font-semibold text-[#1e3a5f] hover:underline whitespace-nowrap"
                        >
                          View in Posting →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Phase tabs */}
                {campaign.phases.length > 1 && (
                  <div className="flex gap-1 bg-gray-100 dark:bg-[#0F1117] rounded-lg p-1">
                    {campaign.phases.map((phase, idx) => (
                      <button
                        key={phase.phase}
                        type="button"
                        onClick={() => setActivePhase(idx)}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
                          activePhase === idx
                            ? "bg-white dark:bg-[#1A1D27] text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        {phase.phase}
                        <span className="ml-1.5 text-xs text-gray-400">
                          ({phase.posts.length})
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Post cards — natural page scroll, no fixed container */}
                <div className="space-y-3">
                  {campaign.phases[activePhase]?.posts.map((post, postIdx) => {
                    const globalIdx = getGlobalIndex(activePhase, postIdx);
                    return (
                      <PostCard
                        key={`${activePhase}-${postIdx}`}
                        post={post}
                        onSchedule={() => schedulePost(post, globalIdx)}
                        onUpdate={(patch) => updatePost(activePhase, postIdx, patch)}
                        scheduling={schedulingPosts.has(globalIdx)}
                        scheduled={scheduledPosts.has(globalIdx)}
                        accountHandle={platformHandles[post.platform] ?? null}
                        mediaUrl={postMedia[globalIdx]?.url ?? null}
                        mediaType={postMedia[globalIdx]?.type ?? null}
                        mediaUploading={uploadingMedia.has(globalIdx)}
                        onMediaUpload={(file) => handleMediaUpload(file, globalIdx)}
                        onMediaRemove={() => removeMedia(globalIdx)}
                      />
                    );
                  })}
                </div>

                {/* Campaign calendar */}
                <CampaignCalendar campaign={campaign} startDate={startDate} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tag Group Modal */}
      {showTagModal && (
        <TagGroupModal
          onSave={handleSaveTagGroup}
          onClose={() => setShowTagModal(false)}
        />
      )}
    </div>
  );
}
