import { useState, useEffect, useCallback } from "react";
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
import { uploadText, type UploadPostPlatform } from "@/services/upload-post";

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
}

interface SponsorOption {
  id: string;
  name: string;
}

interface TagGroup {
  name: string;
  hashtags: string;
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
const TAG_STORAGE_KEY = "rx_campaign_tag_groups";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function loadTagGroups(): TagGroup[] {
  try {
    const raw = localStorage.getItem(TAG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTagGroups(groups: TagGroup[]) {
  localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(groups));
}

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
      <div className="border-l-4 border-[#6C5CE7] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs font-bold flex items-center justify-center shrink-0">
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
              ? "bg-[#6C5CE7] text-white border-[#6C5CE7]"
              : "bg-white dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#6C5CE7]/40"
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
/* Sponsor Multi-Select with handles/hashtags                          */
/* ------------------------------------------------------------------ */

function SponsorMultiSelect({
  sponsors,
  selected,
  onChange,
}: {
  sponsors: SponsorOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (sponsors.length === 0) {
    return <p className="text-sm text-gray-400 italic">No sponsors linked to this event.</p>;
  }
  return (
    <div className="space-y-2">
      {sponsors.map((s) => {
        const active = selected.includes(s.id);
        const handle = sponsorHandle(s.name);
        const tag = sponsorHashtag(s.name);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() =>
              onChange(active ? selected.filter((id) => id !== s.id) : [...selected, s.id])
            }
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
              active
                ? "bg-[#6C5CE7]/5 border-[#6C5CE7]/30"
                : "bg-white dark:bg-[#0F1117] border-gray-200 dark:border-gray-700 hover:border-[#6C5CE7]/40"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                active
                  ? "bg-[#6C5CE7] border-[#6C5CE7]"
                  : "border-gray-300 dark:border-gray-600"
              )}
            >
              {active && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", active ? "text-[#6C5CE7]" : "text-gray-700 dark:text-gray-300")}>
                {s.name}
              </p>
              <p className="text-xs text-gray-400">
                {handle} &middot; {tag}
              </p>
            </div>
          </button>
        );
      })}
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
  onSave: (g: TagGroup) => void;
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
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7]"
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
                onSave({ name: name.trim(), hashtags: tags.trim() });
                onClose();
              }}
              className="bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
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
  scheduling,
}: {
  post: CampaignPost;
  onSchedule: () => void;
  scheduling: boolean;
}) {
  return (
    <div className="bg-white dark:bg-[#1A1D27] border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#6C5CE7] bg-[#6C5CE7]/10 px-2.5 py-1 rounded-full">
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
        </div>
      </div>

      <p className="text-sm text-gray-800 dark:text-gray-200 mb-2 leading-relaxed">{post.caption}</p>

      {post.hashtags && (
        <p className="text-xs text-[#6C5CE7] font-medium mb-2">{post.hashtags}</p>
      )}

      {post.suggested_visual && (
        <p className="text-xs text-gray-400 italic mb-3">
          Visual: {post.suggested_visual}
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={onSchedule}
        disabled={scheduling}
        className="text-xs"
      >
        {scheduling ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <CalendarClock className="h-3 w-3 mr-1" />
        )}
        Schedule
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function BrandCampaigns() {
  const { user } = useAuth();
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  // Form state
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("Custom");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(30);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [sponsors, setSponsors] = useState<SponsorOption[]>([]);
  const [selectedSponsors, setSelectedSponsors] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "tiktok"]);

  // Tag groups
  const [tagGroups, setTagGroups] = useState<TagGroup[]>(loadTagGroups);
  const [showTagModal, setShowTagModal] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [activePhase, setActivePhase] = useState(0);
  const [error, setError] = useState("");

  // Scheduling state
  const [schedulingPosts, setSchedulingPosts] = useState<Set<number>>(new Set());
  const [scheduledPosts, setScheduledPosts] = useState<Set<number>>(new Set());
  const [scheduleAllLoading, setScheduleAllLoading] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Computed: date-based duration
  const hasDateRange = !!(startDate && endDate && endDate >= startDate);
  const dateDuration = hasDateRange ? daysBetween(startDate, endDate) : null;
  const effectiveDuration = dateDuration ?? duration;

  // Auto-append sponsor handles/hashtags when selection changes
  useEffect(() => {
    if (selectedSponsors.length === 0) return;
    const additions: string[] = [];
    sponsors
      .filter((s) => selectedSponsors.includes(s.id))
      .forEach((s) => {
        const h = sponsorHandle(s.name);
        const t = sponsorHashtag(s.name);
        if (!hashtags.includes(h)) additions.push(h);
        if (!hashtags.includes(t)) additions.push(t);
      });
    if (additions.length > 0) {
      setHashtags((prev) => (prev ? prev + " " + additions.join(" ") : additions.join(" ")));
    }
    // Only run when selectedSponsors changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSponsors]);

  // Load events
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, start_date")
        .order("start_date", { ascending: false });
      setEvents(data ?? []);
    })();
  }, []);

  // Load sponsors for selected event
  useEffect(() => {
    if (!selectedEventId) {
      setSponsors([]);
      setSelectedSponsors([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("sponsorship_deals")
        .select("sponsor_id, sponsors(id, name)")
        .eq("event_id", selectedEventId);
      const unique = new Map<string, SponsorOption>();
      (data ?? []).forEach((d: any) => {
        const s = d.sponsors;
        if (s && s.id) unique.set(s.id, { id: s.id, name: s.name });
      });
      setSponsors(Array.from(unique.values()));
      setSelectedSponsors([]);
    })();
  }, [selectedEventId]);

  // Get selected event details
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Handle tag group save
  const handleSaveTagGroup = (g: TagGroup) => {
    const updated = [...tagGroups, g];
    setTagGroups(updated);
    saveTagGroups(updated);
  };

  const handleDeleteTagGroup = (idx: number) => {
    const updated = tagGroups.filter((_, i) => i !== idx);
    setTagGroups(updated);
    saveTagGroups(updated);
  };

  const applyTagGroup = (g: TagGroup) => {
    setHashtags((prev) => {
      const combined = prev ? prev + " " + g.hashtags : g.hashtags;
      // Deduplicate
      const unique = [...new Set(combined.split(/\s+/).filter(Boolean))];
      return unique.join(" ");
    });
  };

  // Generate campaign
  const handleGenerate = useCallback(async () => {
    if (!selectedEventId || platforms.length === 0) return;
    setGenerating(true);
    setError("");
    setCampaign(null);

    const sponsorNames = sponsors
      .filter((s) => selectedSponsors.includes(s.id))
      .map((s) => s.name);

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
Key Speakers: ${speakers || "None specified"}
Sponsors to Feature: ${sponsorNames.length > 0 ? sponsorNames.join(", ") : "None specified"}
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

      // Save to Supabase
      await supabase.from("event_campaigns").insert({
        event_id: selectedEventId,
        campaign_name: parsed.campaign_name,
        campaign_data: parsed as any,
        status: "draft",
      });
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
  }, [selectedEventId, selectedEvent, goal, effectiveDuration, hasDateRange, startDate, endDate, speakers, sponsors, selectedSponsors, hashtags, platforms, apiKey]);

  // Schedule a single post
  const schedulePost = useCallback(
    async (post: CampaignPost, globalIndex: number) => {
      if (!selectedEvent?.start_date || !user?.id) return;
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

        await uploadText({
          title: post.caption.slice(0, 100),
          user: user.id,
          platform: [post.platform as UploadPostPlatform],
          scheduled_date: postDate.toISOString(),
          async_upload: true,
        });

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
    [selectedEvent, user]
  );

  // Schedule all posts
  const scheduleAll = useCallback(async () => {
    if (!campaign) return;
    setScheduleAllLoading(true);
    setScheduleFeedback(null);
    let success = 0;
    let fail = 0;
    let globalIdx = 0;
    for (const phase of campaign.phases) {
      for (const post of phase.posts) {
        try {
          await schedulePost(post, globalIdx);
          success++;
        } catch {
          fail++;
        }
        globalIdx++;
      }
    }
    setScheduleAllLoading(false);
    setScheduleFeedback({
      type: fail === 0 ? "success" : "error",
      msg: fail === 0 ? `All ${success} posts scheduled!` : `${success} scheduled, ${fail} failed.`,
    });
  }, [campaign, schedulePost]);

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

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-[#6C5CE7]" />
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
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title}
                      {ev.start_date && (
                        <span className="text-gray-400 ml-2">
                          ({new Date(ev.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                        </span>
                      )}
                    </SelectItem>
                  ))}
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
                          ? "bg-[#6C5CE7] text-white border-[#6C5CE7]"
                          : "bg-white dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#6C5CE7]/40"
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
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F1117] text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-0.5 block">End</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F1117] text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
                    />
                  </div>
                </div>
                {hasDateRange && (
                  <p className="text-xs text-[#6C5CE7] font-medium mt-1.5">
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
                            ? "bg-[#6C5CE7] text-white border-[#6C5CE7]"
                            : "bg-white dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#6C5CE7]/40"
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
              <Input
                placeholder="e.g. John Smith, Jane Doe"
                value={speakers}
                onChange={(e) => setSpeakers(e.target.value)}
              />
            </FormSection>

            {/* 4. Sponsors */}
            <FormSection number={4} title="Sponsors to Feature">
              {selectedEventId ? (
                <SponsorMultiSelect
                  sponsors={sponsors}
                  selected={selectedSponsors}
                  onChange={setSelectedSponsors}
                />
              ) : (
                <p className="text-sm text-gray-400 italic">Select an event first.</p>
              )}
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
                    {tagGroups.map((g, idx) => (
                      <div key={idx} className="group flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => applyTagGroup(g)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#6C5CE7]/10 text-[#6C5CE7] border border-[#6C5CE7]/20 hover:bg-[#6C5CE7]/20 transition-colors"
                        >
                          <Tag className="h-3 w-3" />
                          {g.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTagGroup(idx)}
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
                  className="flex items-center gap-1 text-xs text-[#6C5CE7] hover:underline font-medium"
                >
                  <Plus className="h-3 w-3" /> New Tag Group
                </button>
              </div>

              <Input
                placeholder="e.g. #MIC2026, #MilSpouseFest"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
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
                className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white font-semibold py-3"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
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
              <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-12">
                <Loader2 className="h-10 w-10 animate-spin text-[#6C5CE7] mb-4" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">Generating your campaign...</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isLargeCampaign
                    ? "Large campaigns may take 15-30 seconds."
                    : "This may take a few seconds."}
                </p>
              </div>
            )}

            {!generating && !campaign && (
              <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-[#0F1117] border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
                <Megaphone className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 font-medium">Your campaign will appear here</p>
                <p className="text-sm text-gray-400 mt-1">
                  Fill out the form and click Generate Campaign.
                </p>
              </div>
            )}

            {!generating && campaign && (
              <div className="space-y-4">
                {/* Campaign header */}
                <div className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{campaign.campaign_name}</h2>
                      <span className="text-xs font-medium text-[#6C5CE7] bg-[#6C5CE7]/10 px-2.5 py-1 rounded-full">
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
                        className="bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
                      >
                        {scheduleAllLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CalendarClock className="h-4 w-4 mr-1" />
                        )}
                        Schedule All
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
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {scheduleFeedback.msg}
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

                {/* Post cards */}
                <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                  {campaign.phases[activePhase]?.posts.map((post, postIdx) => {
                    const globalIdx = getGlobalIndex(activePhase, postIdx);
                    return (
                      <PostCard
                        key={`${activePhase}-${postIdx}`}
                        post={post}
                        onSchedule={() => schedulePost(post, globalIdx)}
                        scheduling={schedulingPosts.has(globalIdx) || scheduledPosts.has(globalIdx)}
                      />
                    );
                  })}
                </div>
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
