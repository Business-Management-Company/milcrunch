import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Sparkles, Plus, Loader2, ListPlus, Check, ChevronDown, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { searchCreators, enrichCreatorProfile, type CreatorCard } from "@/lib/influencers-club";

import { useLists } from "@/contexts/ListContext";
import CreateListModal from "@/components/CreateListModal";
import { detectBranch } from "@/lib/featured-creators";
import { fetchDirectoriesWithCounts, addToDirectory, type Directory } from "@/lib/directories";
import { toast } from "sonner";
import { getAgentContext } from "@/lib/ai-agent-context";
import { AICTAButtons } from "@/components/ui/ai-cta-buttons";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  cta?: { label: string; link: string };
  followUp?: string;
  creators?: CreatorCard[];
  loading?: boolean;
  chips?: string[];
  hidden?: boolean;
  /** Context from the search that produced these creators */
  searchContext?: { query: string; location?: string; gender?: string; branch?: string; keywords?: string[] };
}

/* ------------------------------------------------------------------ */
/* Evidence tag helpers — show WHY a creator matched                    */
/* ------------------------------------------------------------------ */

interface EvidenceTag {
  label: string;
  type: "location" | "keyword" | "hashtag";
}

function getEvidenceTags(
  creator: CreatorCard,
  ctx?: ChatMessage["searchContext"],
): EvidenceTag[] {
  const tags: EvidenceTag[] = [];
  const seen = new Set<string>();
  const add = (label: string, type: EvidenceTag["type"]) => {
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push({ label, type });
  };

  // 1. Location — from creator data or search context
  if (creator.location) {
    add(`📍 ${creator.location}`, "location");
  } else if (ctx?.location) {
    add(`📍 ${ctx.location}`, "location");
  }

  // 2. Parse militaryEvidence strings from scoring system
  if (creator.militaryEvidence && creator.militaryEvidence.length > 0) {
    for (const ev of creator.militaryEvidence) {
      const lower = ev.toLowerCase();
      // "Uses #veteran, #military hashtags" → extract hashtags
      if (lower.startsWith("uses ")) {
        const hashMatches = ev.match(/#[\w]+/g);
        if (hashMatches) {
          for (const h of hashMatches.slice(0, 3)) add(h, "hashtag");
        }
      }
      // 'Mentions "veteran" in bio' → extract quoted keywords
      else if (lower.includes("in bio")) {
        const quotedMatches = ev.match(/"([^"]+)"/g);
        if (quotedMatches) {
          for (const q of quotedMatches.slice(0, 3)) {
            const word = q.replace(/"/g, "");
            add(word.charAt(0).toUpperCase() + word.slice(1), "keyword");
          }
        }
      }
      // "Located near Fort Liberty" → location
      else if (lower.startsWith("located near")) {
        const place = ev.replace(/^Located near\s*/i, "").trim();
        if (place) add(`📍 ${place}`, "location");
      }
      // "Niche: Military, Fitness" → keywords
      else if (lower.startsWith("niche:")) {
        const niches = ev.replace(/^Niche:\s*/i, "").split(",").map((s) => s.trim()).filter(Boolean);
        for (const n of niches.slice(0, 2)) add(n, "keyword");
      }
      // "Name/username contains ..." → keyword
      else if (lower.includes("name") && lower.includes("contains")) {
        const quotedMatches = ev.match(/"([^"]+)"/g);
        if (quotedMatches) {
          for (const q of quotedMatches.slice(0, 2)) {
            const word = q.replace(/"/g, "");
            add(word.charAt(0).toUpperCase() + word.slice(1), "keyword");
          }
        }
      }
    }
  }

  // 3. Fallback: if no evidence from scoring, use search context
  if (tags.length <= 1 && ctx) {
    if (ctx.branch) add(ctx.branch, "keyword");
    if (ctx.keywords) {
      for (const kw of ctx.keywords.slice(0, 3)) {
        add(kw.charAt(0).toUpperCase() + kw.slice(1), "keyword");
      }
    }
    if (ctx.gender) add(ctx.gender === "female" ? "👩 Female" : ctx.gender === "male" ? "👨 Male" : ctx.gender, "keyword");
  }

  // 4. Pull from bio if we still have room
  if (tags.length < 3 && creator.bio) {
    const bio = creator.bio.toLowerCase();
    const milTerms = ["veteran", "military", "army", "navy", "marines", "air force", "coast guard",
      "milspouse", "military spouse", "active duty", "national guard"];
    for (const term of milTerms) {
      if (bio.includes(term)) add(term.charAt(0).toUpperCase() + term.slice(1), "keyword");
      if (tags.length >= 5) break;
    }
  }

  return tags.slice(0, 5);
}

const EVIDENCE_STYLES: Record<EvidenceTag["type"], string> = {
  location: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  keyword: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  hashtag: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const DEFAULT_CHIPS = [
  "🎖️ Find Army veteran influencers and keynote speakers",
  "💼 Find Military Spouse businesses",
  "🔍 Find creators with 50K+ followers",
  "📋 Build a list of Marine veterans",
  "🎪 Plan an event for military families",
  "🤝 Find veteran entrepreneurs",
];

const CREATORS_PREVIEW_COUNT = 5;

let idCounter = 0;
function makeId() {
  return `msg-${++idCounter}-${Date.now()}`;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const MILITARY_KEYWORDS = [
  "military", "veteran", "army", "navy", "air force", "marines",
  "coast guard", "national guard", "space force", "usmc", "usaf",
  "active duty", "reserve", "service member", "milspouse", "milso",
  "combat", "deployment", "infantry", "special forces", "ranger",
  "seal", "green beret", "airborne", "paratrooper",
];

function detectMilitaryKeywords(creator: CreatorCard): { branch: string | null; keywords: string[] } {
  const text = [
    creator.bio ?? "",
    creator.name ?? "",
    creator.specialties?.join(" ") ?? "",
    creator.hashtags?.join(" ") ?? "",
    creator.category ?? "",
  ].join(" ").toLowerCase();

  const branch = creator.branch || detectBranch(text);
  const keywords: string[] = [];
  for (const kw of MILITARY_KEYWORDS) {
    if (text.includes(kw)) keywords.push(kw);
  }
  return { branch, keywords: [...new Set(keywords)].slice(0, 5) };
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface TagPill {
  label: string;
  color: string; // tailwind classes for bg + text
}

const TAG_COLOR_MAP: Record<string, string> = {
  military: "bg-green-100 text-green-700",
  veteran: "bg-green-100 text-green-700",
  army: "bg-green-100 text-green-700",
  navy: "bg-green-100 text-green-700",
  marines: "bg-green-100 text-green-700",
  marine: "bg-green-100 text-green-700",
  "air force": "bg-green-100 text-green-700",
  "coast guard": "bg-green-100 text-green-700",
  spouse: "bg-pink-100 text-pink-700",
  milspouse: "bg-pink-100 text-pink-700",
  "mil spouse": "bg-pink-100 text-pink-700",
  business: "bg-blue-100 text-blue-700",
  entrepreneur: "bg-blue-100 text-blue-700",
  founder: "bg-blue-100 text-blue-700",
  ceo: "bg-blue-100 text-blue-700",
  fitness: "bg-orange-100 text-orange-700",
  health: "bg-orange-100 text-orange-700",
  wellness: "bg-orange-100 text-orange-700",
};

function getTagColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(TAG_COLOR_MAP)) {
    if (lower.includes(key)) return color;
  }
  return "bg-slate-100 text-slate-600";
}

function getRelevancePills(creator: CreatorCard): TagPill[] {
  const seen = new Set<string>();
  const military: TagPill[] = [];
  const topic: TagPill[] = [];

  const addPill = (label: string, isMilitary: boolean) => {
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const pill = { label, color: getTagColor(label) };
    if (isMilitary) military.push(pill);
    else topic.push(pill);
  };

  // 1. Pull from hashtags (primary source)
  if (creator.hashtags?.length) {
    for (const h of creator.hashtags) {
      const clean = h.replace(/^#/, "").trim();
      if (!clean) continue;
      const lower = clean.toLowerCase();
      const isMil = /\b(military|veteran|army|navy|marine|air\s?force|coast\s?guard|milspouse|mil\s?spouse|spouse)\b/i.test(lower);
      addPill(clean.charAt(0).toUpperCase() + clean.slice(1), isMil);
    }
  }

  // 2. Pull from specialties
  if (creator.specialties?.length) {
    for (const s of creator.specialties) {
      const lower = s.toLowerCase();
      const isMil = /\b(military|veteran|army|navy|marine|air\s?force|coast\s?guard|milspouse|mil\s?spouse|spouse)\b/i.test(lower);
      addPill(s, isMil);
    }
  }

  // 3. Pull from category / nicheClass
  if (creator.category) addPill(creator.category, false);
  if (creator.nicheClass && creator.nicheClass !== creator.category) addPill(creator.nicheClass, false);

  // 4. Parse from bio if we still need more
  if (military.length + topic.length < 3) {
    const bio = (creator.bio || "").toLowerCase();
    const bioChecks: [RegExp, string, boolean][] = [
      [/\b(veteran)\b/, "Veteran", true],
      [/\b(military)\b/, "Military", true],
      [/\b(army)\b/, "Army", true],
      [/\b(navy)\b/, "Navy", true],
      [/\b(marine)\b/, "Marines", true],
      [/\b(air\s?force)\b/, "Air Force", true],
      [/\b(milspouse|mil spouse)\b/, "MilSpouse", true],
      [/\b(military\s?sp)\b/, "MilSpouse", true],
      [/\b(fitness|health|wellness)\b/, "Fitness", false],
      [/\b(entrepreneur|founder|ceo)\b/, "Business", false],
      [/\b(podcast)\b/, "Podcaster", false],
      [/\b(speaker)\b/, "Speaker", false],
      [/\b(author|book)\b/, "Author", false],
      [/\b(coach)\b/, "Coach", false],
      [/\b(real estate|realtor)\b/, "Real Estate", false],
      [/\b(content creator|ugc)\b/, "Creator", false],
    ];
    for (const [re, label, isMil] of bioChecks) {
      if (re.test(bio)) addPill(label, isMil);
    }
  }

  return [...military, ...topic].slice(0, 3);
}

function getTierBadge(followers: number): string | null {
  if (followers >= 1_000_000) return "Mega";
  if (followers >= 100_000) return "Macro";
  if (followers >= 10_000) return "Mid-Tier";
  if (followers >= 1_000) return "Micro";
  return null;
}

export default function FloatingAdminChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lists, addCreatorToList, createList, isCreatorInList } = useLists();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId(), role: "assistant", text: "👋 Hi! I'm your MilCrunch AI assistant. How can I help today?" },
  ]);
  const [loading, setLoading] = useState(false);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [pendingCreator, setPendingCreator] = useState<CreatorCard | null>(null);
  const [expandedMsgIds, setExpandedMsgIds] = useState<Set<string>>(new Set());
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());
  const [selectedCreator, setSelectedCreator] = useState<CreatorCard | null>(null);
  const [listCreatedMsgIds, setListCreatedMsgIds] = useState<Set<string>>(new Set());
  const [creatingListMsgId, setCreatingListMsgId] = useState<string | null>(null);
  const [awaitingListName, setAwaitingListName] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastQueryRef = useRef<string>("");

  // Drawer action dropdowns
  const [drawerDropdown, setDrawerDropdown] = useState<"list" | "directory" | "event" | null>(null);
  const [drawerDirs, setDrawerDirs] = useState<Directory[]>([]);
  const [drawerEvents, setDrawerEvents] = useState<{ id: string; title: string; start_date: string }[]>([]);
  const [drawerDropdownLoading, setDrawerDropdownLoading] = useState(false);
  const [newListNameInput, setNewListNameInput] = useState("");
  const [newDirNameInput, setNewDirNameInput] = useState("");
  const drawerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  // Listen for "open-ai-chat" events from the dashboard command bar
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const msg = detail?.message;
      if (msg) {
        setOpen(true);
        setTimeout(() => addResponse(msg), 150);
      } else {
        setOpen(true);
      }
    };
    window.addEventListener("open-ai-chat", handler);
    return () => window.removeEventListener("open-ai-chat", handler);
  }, []);

  // Close drawer dropdown on outside click or Escape
  useEffect(() => {
    if (!drawerDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (drawerDropdownRef.current && !drawerDropdownRef.current.contains(e.target as Node)) {
        setDrawerDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerDropdown(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [drawerDropdown]);

  // Close drawer dropdown when selected creator changes
  useEffect(() => { setDrawerDropdown(null); }, [selectedCreator]);

  // Auto-enrich creator when drawer opens to populate analytics fields
  useEffect(() => {
    if (!selectedCreator) return;
    // Skip if we already have analytics data
    if (selectedCreator.mediaCount || selectedCreator.avgLikes || selectedCreator.avgViews) return;
    const handle = selectedCreator.username || selectedCreator.name.toLowerCase().replace(/\s+/g, "");
    const platform = selectedCreator.platforms?.[0] || "instagram";
    const controller = new AbortController();
    (async () => {
      try {
        const enrichment = await enrichCreatorProfile(handle, controller.signal, platform);
        if (!enrichment || controller.signal.aborted) return;
        const ig = enrichment.instagram || {};
        const result = enrichment.result || {};
        const pickNum = (...keys: string[]): number | undefined => {
          for (const src of [ig, result]) {
            for (const k of keys) {
              const v = (src as Record<string, unknown>)[k];
              if (v != null && v !== "" && v !== false) {
                const n = Number(v);
                if (!isNaN(n) && n > 0) return n;
              }
            }
          }
          return undefined;
        };
        const mediaCount = pickNum("media_count", "number_of_posts", "post_count", "posts_count");
        let avgLikes = pickNum("avg_likes", "average_likes", "avg_like_count");
        let avgComments = pickNum("avg_comments", "average_comments", "avg_comment_count");
        let avgViews = pickNum("avg_views", "average_views", "avg_video_views", "avg_reels_plays", "avg_view_count");
        const avgReelLikes = pickNum("avg_reel_likes", "average_reel_likes");
        let postsPerMonth = pickNum("posts_per_month", "posting_frequency");
        const followers = pickNum("follower_count", "followers", "number_of_followers");
        let engagementRate = pickNum("engagement_percent", "engagement_rate", "er");

        // RAW endpoint doesn't have direct analytics — compute from post_data
        const postData = (ig as Record<string, unknown>).post_data;
        if (Array.isArray(postData) && postData.length > 0 && (!avgLikes || !avgComments)) {
          let tLikes = 0, tComments = 0, tViews = 0, vCount = 0;
          const dates: number[] = [];
          for (const p of postData as Record<string, unknown>[]) {
            const eng = (p.engagement && typeof p.engagement === "object") ? p.engagement as Record<string, unknown> : p;
            tLikes += Number(eng.likes ?? eng.like_count ?? 0) || 0;
            tComments += Number(eng.comments ?? eng.comment_count ?? 0) || 0;
            const vc = Number(eng.view_count ?? eng.views ?? 0) || 0;
            if (vc > 0) { tViews += vc; vCount++; }
            const d = new Date(p.created_at as string);
            if (!isNaN(d.getTime())) dates.push(d.getTime());
          }
          const n = postData.length;
          if (!avgLikes && tLikes > 0) avgLikes = Math.round(tLikes / n);
          if (!avgComments && tComments > 0) avgComments = Math.round(tComments / n);
          if (!avgViews && vCount > 0) avgViews = Math.round(tViews / vCount);
          if (!postsPerMonth && dates.length >= 2) {
            dates.sort((a, b) => a - b);
            const daySpan = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
            if (daySpan > 0) postsPerMonth = Math.round((dates.length / daySpan) * 30 * 10) / 10;
          }
          const fc = followers ?? 0;
          if (!engagementRate && fc > 0) {
            engagementRate = Number((((tLikes / n + tComments / n) / fc) * 100).toFixed(2));
          }
        }
        console.log("[Drawer enrich]", handle, { mediaCount, avgLikes, avgComments, avgViews, avgReelLikes, postsPerMonth });
        if (mediaCount || avgLikes || avgComments || avgViews || avgReelLikes || postsPerMonth) {
          setSelectedCreator((prev) => prev ? {
            ...prev,
            mediaCount: prev.mediaCount || mediaCount,
            avgLikes: prev.avgLikes || avgLikes,
            avgComments: prev.avgComments || avgComments,
            avgViews: prev.avgViews || avgViews,
            avgReelLikes: prev.avgReelLikes || avgReelLikes,
            postsPerMonth: prev.postsPerMonth || postsPerMonth,
            followers: prev.followers || followers || prev.followers,
            engagementRate: prev.engagementRate || engagementRate || prev.engagementRate,
          } : prev);
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.warn("[Drawer enrich] failed for", handle, err);
        }
      }
    })();
    return () => controller.abort();
  }, [selectedCreator?.username, selectedCreator?.name]);

  const openDrawerDropdown = async (type: "list" | "directory" | "event") => {
    if (drawerDropdown === type) { setDrawerDropdown(null); return; }
    setDrawerDropdown(type);
    setDrawerDropdownLoading(true);
    try {
      if (type === "directory") {
        const dirs = await fetchDirectoriesWithCounts();
        setDrawerDirs(dirs);
      } else if (type === "event") {
        const { data } = await supabase
          .from("events")
          .select("id, title, start_date")
          .gte("start_date", new Date().toISOString())
          .order("start_date")
          .limit(10);
        setDrawerEvents(data ?? []);
      }
    } catch (err) {
      console.error("[drawer dropdown]", err);
    } finally {
      setDrawerDropdownLoading(false);
    }
  };

  const handleDrawerAddToDirectory = async (dir: Directory) => {
    if (!selectedCreator) return;
    const { error } = await addToDirectory(dir.id, {
      handle: selectedCreator.username || selectedCreator.name.toLowerCase().replace(/\s+/g, ""),
      display_name: selectedCreator.name,
      platform: selectedCreator.platforms?.[0] || "instagram",
      avatar_url: selectedCreator.avatar,
      follower_count: selectedCreator.followers,
      engagement_rate: selectedCreator.engagementRate,
      bio: selectedCreator.bio,
      branch: selectedCreator.branch || null,
      platforms: selectedCreator.platforms,
      category: selectedCreator.category || null,
    });
    if (error) {
      toast.error(`Failed: ${error}`);
    } else {
      toast.success(`Added to ${dir.name}`);
      setDrawerDropdown(null);
    }
  };

  const handleDrawerInviteToEvent = async (event: { id: string; title: string }) => {
    if (!selectedCreator) return;
    const handle = selectedCreator.username || selectedCreator.name.toLowerCase().replace(/\s+/g, "");
    const { error } = await supabase.from("event_team_members").insert({
      event_id: event.id,
      user_id: handle,
      role: "staff",
    });
    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success(`Invited to ${event.title}`);
      setDrawerDropdown(null);
    }
  };

  const creatorToListPayload = (c: CreatorCard) => ({
    id: c.id,
    name: c.name,
    username: c.username,
    avatar: c.avatar,
    followers: c.followers,
    engagementRate: c.engagementRate,
    platforms: c.platforms,
    bio: c.bio,
    location: c.location,
  });

  const handleAddToList = (listId: string, listName: string, creator: CreatorCard) => {
    addCreatorToList(listId, creatorToListPayload(creator));
    toast.success(`Added ${creator.name} to ${listName}`);
    // Show temporary "Added" state on this card
    setJustAddedIds((prev) => new Set(prev).add(creator.id));
    setTimeout(() => {
      setJustAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(creator.id);
        return next;
      });
    }, 2000);
  };

  const handleOpenCreateListForCreator = (creator: CreatorCard) => {
    setPendingCreator(creator);
    setCreateListModalOpen(true);
  };

  const handleCreateListAndAdd = (name: string) => {
    const newId = createList(name);
    if (pendingCreator) {
      addCreatorToList(newId, creatorToListPayload(pendingCreator));
      toast.success(`Created "${name}" and added ${pendingCreator.name}`);
      // Show temporary "Added" state
      setJustAddedIds((prev) => new Set(prev).add(pendingCreator!.id));
      setTimeout(() => {
        setJustAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(pendingCreator!.id);
          return next;
        });
      }, 2000);
      setPendingCreator(null);
    }
  };

  const LIST_PHRASES = /\b(build\s+(me\s+)?a\s+list|create\s+a\s+list|make\s+(me\s+)?a\s+list|save\s+(as|to)\s+a?\s*list)\b/i;

  const generateListName = (query: string): string => {
    // Strip list-related phrases and common filler words
    let name = query
      .replace(LIST_PHRASES, "")
      .replace(/\b(find|search|show|get|with|who|have|has|that|are|the|and|for|of|me|please|can you|could you|i want|i need)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Title-case the remaining words
    name = name
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return name || "AI Search Results";
  };

  const handleCreateListFromResults = (msgId: string, creators: CreatorCard[], userQuery: string) => {
    setCreatingListMsgId(msgId);
    const listName = generateListName(userQuery);
    const newId = createList(listName);
    for (const c of creators) {
      addCreatorToList(newId, creatorToListPayload(c));
    }
    setListCreatedMsgIds((prev) => new Set(prev).add(msgId));
    setCreatingListMsgId(null);
    toast.success(`List "${listName}" created with ${creators.length} creators`);

    // Append a system-like message with a link to the new list
    setMessages((m) => [
      ...m,
      {
        id: makeId(),
        role: "assistant" as const,
        text: `✨ Created list **"${listName}"** with ${creators.length} creators.`,
        cta: { label: `View List →`, link: `/lists/${newId}` },
      },
    ]);
  };

  const CREATE_LIST_NAMED = /(?:create|make|build)\s+(?:me\s+)?a\s+list\s+(?:called|named|with\s+the\s+name)\s+["'""\u201C\u201D]?(.+?)["'""\u201C\u201D]?\s*$/i;

  const createListByName = (listName: string): string => {
    const newId = createList(listName);
    toast.success(`List "${listName}" created!`);
    return newId;
  };

  const handleChipClick = (chip: string) => {
    // FIX 1: "Custom Name" chip — focus input instead of sending
    if (/custom\s*name/i.test(chip)) {
      setAwaitingListName(true);
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.placeholder = "Type your list name and press Enter...";
        inputRef.current.focus();
      }
      return;
    }

    // FIX 4: Named list chips in list-building context — create immediately
    const recentTexts = messages.slice(-6).map((m) => m.text.toLowerCase()).join(" ");
    const isListContext = LIST_PHRASES.test(recentTexts) || /what.*name|name.*list|list.*call/i.test(recentTexts);
    // Only treat as instant-create if the chip looks like a list name (not an action like "Add creators" or "No thanks")
    const isActionChip = /^(yes|no|add|leave|show|filter|all|see more)/i.test(chip);
    if (isListContext && !isActionChip) {
      const newId = createListByName(chip);
      setMessages((m) => [
        ...m,
        { id: makeId(), role: "user" as const, text: chip, hidden: true },
        {
          id: makeId(),
          role: "assistant" as const,
          text: `✅ **"${chip}"** list created! Want me to auto-populate it with matching creators?`,
          chips: ["Yes, add creators", "No thanks"],
          cta: { label: "View List →", link: `/lists/${newId}` },
        },
      ]);
      return;
    }

    // Default: send as regular message
    addResponse(chip);
  };

  const addResponse = async (input: string, opts?: { hidden?: boolean }) => {
    // FIX 1: If awaiting list name, create list immediately
    if (awaitingListName) {
      setAwaitingListName(false);
      if (inputRef.current) inputRef.current.placeholder = "Ask me anything about creators, events, or campaigns...";
      const listName = input.trim();
      const newId = createListByName(listName);
      setMessages((m) => [
        ...m,
        { id: makeId(), role: "user" as const, text: listName },
        {
          id: makeId(),
          role: "assistant" as const,
          text: `✅ List **"${listName}"** created! Want me to add creators to it? If so, what criteria — branch, follower count, or niche?`,
          chips: ["Add creators now", "Leave it empty"],
          cta: { label: "View List →", link: `/lists/${newId}` },
        },
      ]);
      return;
    }

    // FIX 2: Direct "create a list called [NAME]" — create immediately
    const namedMatch = input.match(CREATE_LIST_NAMED);
    if (namedMatch) {
      const listName = namedMatch[1].trim();
      const newId = createListByName(listName);
      setMessages((m) => [
        ...m,
        { id: makeId(), role: "user" as const, text: input },
        {
          id: makeId(),
          role: "assistant" as const,
          text: `✅ List **"${listName}"** created! Want me to add creators to it? If so, what criteria — branch, follower count, or niche?`,
          chips: ["Add creators now", "Leave it empty"],
          cta: { label: "View List →", link: `/lists/${newId}` },
        },
      ]);
      return;
    }

    const userMsgId = makeId();
    const loadingMsgId = makeId();
    setMessages((m) => [
      ...m,
      { id: userMsgId, role: "user" as const, text: input, hidden: opts?.hidden },
      { id: loadingMsgId, role: "assistant" as const, text: "", loading: true },
    ]);
    setLoading(true);
    lastQueryRef.current = input;

    try {
      // Fetch shared platform context
      const platformContext = await getAgentContext();

      const systemPrompt = `You are the MilCrunch AI assistant for a military creator and event management platform. You have FULL access to real-time platform data.

${platformContext}

Answer questions about events, creators, campaigns, lists, and directories directly from this data. NEVER say you lack access to the database or real-time data. Never output raw JSON. Always respond in natural language with specific numbers and names.

Be action-oriented. When the user's intent is clear, act immediately and confirm afterward. Only ask ONE clarifying question maximum, and only when the intent is genuinely ambiguous. Never ask multiple clarifying questions in the same response. If asked to create something, create it first then offer to refine.

## Formatting Rules

Use rich markdown for all responses:
- **Bold** for section headers, event names, key labels, and important numbers
- Use markdown tables when listing multiple items with comparable fields (events, creators, stats)
- Use bullet points for short lists or summaries
- Keep responses concise — lead with the answer, add detail after

When showing events, use a markdown table:

| Event | Date | Location | Registrations |
|-------|------|----------|---------------|
| **Event Name** | Mar 15 | City, ST | 42 |

When showing stats or summaries, bold the numbers: **4,300** total capacity, **12** creators added.

Never ask more than one question in a single response. If the user has already answered one question, proceed immediately to showing results — do not ask another question.

When you ask a clarifying question, always end your message with a line like:
CHIPS: Option A | Option B | Option C
These will be shown as quick-reply buttons. Keep each option under 30 characters. Always provide 2-4 chip options.

When the user provides enough context to search for creators/influencers/speakers, respond ONLY with a single valid JSON object (no other text before or after):
{"action":"search","query":"[search terms for ai_search]","branch":"[military branch or empty]","count":[number requested or 10],"location":"[city, state or empty]","gender":"[male|female or empty]","keywords":["keyword1","keyword2"]}
Include location, gender, and keywords fields when the user specifies them. The query field should contain the semantic search terms. IMPORTANT: Output ONLY the JSON object with no surrounding text, no markdown, no explanation.
For all other questions, respond naturally and concisely.`;

      // Build conversation history so follow-up chips have context
      const historyForApi: { role: string; content: string }[] = [];
      // Use a snapshot that includes everything except the loading msg we just added
      const snapshot = await new Promise<ChatMessage[]>((resolve) =>
        setMessages((m) => { resolve(m); return m; })
      );
      for (const msg of snapshot) {
        if (msg.loading) continue; // skip loading placeholder
        if (msg.id === loadingMsgId) continue;
        const content = msg.role === "assistant"
          ? (msg.creators && msg.creators.length > 0
              ? `${msg.text}\n[Returned ${msg.creators.length} creator cards]`
              : msg.text)
          : msg.text;
        if (content) historyForApi.push({ role: msg.role, content });
      }
      // Keep last 10 turns to stay within token limits
      const trimmedHistory = historyForApi.slice(-10);

      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: trimmedHistory,
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text ?? "";

      // Detect search action — try full JSON parse first, then regex extraction
      let actionObj: { action: string; query: string; branch?: string; count?: number; location?: string; gender?: string; keywords?: string[] } | null = null;
      let textWithoutAction = text;
      try {
        const parsed = JSON.parse(text.trim());
        if (parsed && parsed.action === "search") {
          actionObj = parsed;
          textWithoutAction = "";
        }
      } catch {
        // Not pure JSON — try to extract embedded JSON
        const jsonMatch = text.match(/\{[^{}]*"action"\s*:\s*"search"[^{}]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.action === "search") {
              actionObj = parsed;
              textWithoutAction = text.replace(jsonMatch[0], "").trim();
            }
          } catch { /* ignore parse error */ }
        }
      }

      if (actionObj) {
        // Execute the search action
        const searchQuery = actionObj.query || input;
        const branchLabel = actionObj.branch || "";
        const requestedCount = actionObj.count ?? 10;
        const locationFilter = actionObj.location || "";
        const genderFilter = actionObj.gender || "";
        const extraKeywords = actionObj.keywords ?? [];

        // Build search description for loading state
        const parts: string[] = [];
        if (requestedCount) parts.push(`${requestedCount}`);
        if (genderFilter) parts.push(genderFilter);
        if (branchLabel) parts.push(branchLabel);
        parts.push("creators");
        if (locationFilter) parts.push(`in ${locationFilter}`);
        const searchDesc = parts.join(" ");

        setMessages((m) => m.map((msg) =>
          msg.id === loadingMsgId
            ? { ...msg, text: `Searching for ${searchDesc}...` }
            : msg
        ));

        // Build filters for the API
        const keywords_in_bio = [...new Set([
          ...extraKeywords,
          ...(branchLabel ? [branchLabel] : []),
        ])].filter(Boolean);

        const searchOptions: Parameters<typeof searchCreators>[1] = {
          page: 1,
          account_type: "regular",
          ...(keywords_in_bio.length > 0 && { keywords_in_bio }),
          ...(locationFilter && { location: locationFilter }),
          ...(genderFilter && { gender: genderFilter }),
        };

        const { creators: rawResults } = await searchCreators(searchQuery, searchOptions);
        const searchResults = shuffleArray(rawResults);
        const displayCount = Math.min(searchResults.length, requestedCount);

        if (searchResults.length > 0) {
          const creatorSummary = searchResults.slice(0, displayCount).map(r => r.full_name || r.name || r.username).join(", ");

          const contextMsg = `The user asked: "${input}". The search returned exactly ${displayCount} creators: ${creatorSummary}. Write a natural 1-2 sentence response acknowledging this exact number and what was searched for. Do not invent or assume a different count. Ask a relevant follow-up question to refine the search. Vary your tone.`;

          const responseRes = await fetch("/api/anthropic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 200,
              messages: [{ role: "user", content: contextMsg }],
            }),
          });
          const responseData = await responseRes.json();
          const friendlyText = responseData.content?.[0]?.text ?? `Found ${displayCount} creators matching your request.`;

          // Build discovery URL with filters
          const discoverParams = new URLSearchParams({ q: searchQuery });
          if (locationFilter) discoverParams.set("location", locationFilter);
          if (genderFilter) discoverParams.set("gender", genderFilter);

          setMessages((m) => m.map((msg) =>
            msg.id === loadingMsgId
              ? {
                  ...msg,
                  text: friendlyText,
                  loading: false,
                  creators: searchResults.slice(0, displayCount),
                  searchContext: { query: searchQuery, location: locationFilter || undefined, gender: genderFilter || undefined, branch: branchLabel || undefined, keywords: extraKeywords.length > 0 ? extraKeywords : undefined },
                  cta: { label: "See more in Discovery →", link: `/brand/discover?${discoverParams.toString()}` },
                }
              : msg
          ));
        } else {
          setMessages((m) => m.map((msg) =>
            msg.id === loadingMsgId
              ? {
                  ...msg,
                  text: "I couldn't find results for that search. Try different keywords or open Creator Discovery for advanced filters.",
                  loading: false,
                  cta: { label: "Open Creator Discovery →", link: "/brand/discover" },
                }
              : msg
          ));
        }
        setLoading(false);
        return;
      }

      // Regular text response — strip any stray JSON action blocks and CHIPS: lines
      let cleanText = textWithoutAction;
      // Safety net: remove any remaining JSON action blocks the AI may have emitted
      cleanText = cleanText.replace(/\{[^{}]*"action"\s*:\s*"search"[^{}]*\}/g, "").trim();
      const chipsMatch = cleanText.match(/\nCHIPS:\s*(.+)$/m);
      const displayText = chipsMatch ? cleanText.replace(chipsMatch[0], "").trim() : cleanText;
      const chips = chipsMatch
        ? chipsMatch[1].split("|").map((s: string) => s.trim()).filter(Boolean)
        : undefined;
      // Replace loading message with real response
      setMessages((m) => m.map((msg) =>
        msg.id === loadingMsgId
          ? { ...msg, text: displayText, loading: false, chips }
          : msg
      ));
    } catch (e) {
      console.error("[FloatingChat] Error:", e);
      setMessages((m) => m.map((msg) =>
        msg.id === loadingMsgId
          ? { ...msg, text: "I'm having trouble connecting right now. Please try again.", loading: false }
          : msg
      ));
    }

    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputRef.current?.value?.trim();
    if (!text) return;
    inputRef.current!.value = "";
    addResponse(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = inputRef.current?.value?.trim();
      if (text) {
        inputRef.current!.value = "";
        addResponse(text);
      }
    }
  };

  const isOnChatPage = location.pathname === "/admin/chat";
  const showChips = messages.length <= 1;

  return (
    <>
      {/* Floating button */}
      {!isOnChatPage && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            className={cn(
              "flex items-center gap-2.5 px-6 h-14 rounded-full shadow-lg text-white font-medium text-sm transition-all duration-200",
              "hover:shadow-xl hover:-translate-y-0.5",
              open
                ? "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500"
                : "bg-gradient-to-r from-[#2d5282] to-[#1e3a5f] hover:from-[#1a2f4a] hover:to-[#2d5282]"
            )}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close AI chat" : "Open AI chat"}
            style={{ minWidth: 200 }}
          >
            {open ? (
              <>
                <X className="h-5 w-5" />
                <span>Close</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5" />
                <span>AI Agent Chat</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Slide-over panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-xl bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#1e3a5f]/10 via-[#1e3a5f]/5 to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#1e3a5f]" />
                <div>
                  <span className="font-bold text-base">MilCrunch AI</span>
                  <span className="text-xs text-muted-foreground ml-2">Assistant</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMessages([{ id: makeId(), role: "assistant", text: "👋 Hi! I'm your MilCrunch AI assistant. How can I help today?" }]);
                    if (inputRef.current) inputRef.current.value = "";
                    setExpandedMsgIds(new Set());
                    setListCreatedMsgIds(new Set());
                    setSelectedCreator(null);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1e3a5f] px-2 py-1 rounded hover:bg-[#1e3a5f]/5 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Chat
                </button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick prompt pills — only shown on empty/greeting state */}
            {showChips && (
              <div className="px-3 pt-3 pb-1 grid grid-cols-2 gap-1.5">
                {DEFAULT_CHIPS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleChipClick(prompt)}
                    className="text-xs px-3 py-2 rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.filter((m) => !m.hidden).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm",
                    m.role === "user"
                      ? "bg-[#1e3a5f] text-white rounded-br-sm ml-auto max-w-[80%]"
                      : "bg-white text-gray-800 rounded-bl-sm mr-auto shadow-sm dark:bg-gray-800 dark:text-gray-100 max-w-[95%]"
                  )}
                >
                  {/* Loading animation */}
                  {m.loading ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                      </div>
                      <span className="text-sm text-gray-500 italic">{m.text || "MilCrunch AI is thinking..."}</span>
                    </div>
                  ) : m.role === "assistant" ? (
                    <>
                      <MarkdownRenderer content={m.text} />
                      {/* CTA buttons — only for text responses without creator cards */}
                      {!m.creators?.length && <AICTAButtons text={m.text} onNavigate={() => setOpen(false)} />}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  )}

                  {/* Creator result cards */}
                  {m.creators && m.creators.length > 0 && (() => {
                    const isExpanded = expandedMsgIds.has(m.id);
                    const hasMore = m.creators.length > CREATORS_PREVIEW_COUNT;
                    const visibleCreators = isExpanded ? m.creators : m.creators.slice(0, CREATORS_PREVIEW_COUNT);
                    const hiddenCount = m.creators.length - CREATORS_PREVIEW_COUNT;

                    return (
                      <div className="mt-3">
                        {/* "X creators found" badge */}
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            🎖️ {m.creators.length} creators found
                          </span>
                        </div>

                        <div className="space-y-2">
                          {visibleCreators.map((c, i) => {
                            const { branch, keywords } = detectMilitaryKeywords(c);
                            const alreadyAdded = isCreatorInList(c.id);
                            const justAdded = justAddedIds.has(c.id);

                            return (
                              <div
                                key={c.id || i}
                                className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-[#1e3a5f]/40 transition-colors cursor-pointer"
                                onClick={() => setSelectedCreator(c)}
                              >
                                <img
                                  src={c.avatar}
                                  alt={c.name}
                                  className="h-11 w-11 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-gray-800"
                                  onError={(e) => {
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=6C5CE7&color=fff&size=128`;
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                                    {c.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    {c.username && <span className="truncate">@{c.username}</span>}
                                    {branch && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#1e3a5f]/10 text-[#1e3a5f] font-medium text-[10px] uppercase tracking-wide shrink-0">
                                        {branch}
                                      </span>
                                    )}
                                  </div>
                                  {c.followers > 0 && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                      <span>{formatFollowers(c.followers)} followers</span>
                                      {getTierBadge(c.followers) && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-medium">
                                          {getTierBadge(c.followers)}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {(() => {
                                    const tags = getEvidenceTags(c, m.searchContext);
                                    return tags.length > 0 ? (
                                      <div className="flex flex-wrap items-center gap-1 mt-1">
                                        {tags.map((tag, ti) => (
                                          <span
                                            key={ti}
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${EVIDENCE_STYLES[tag.type]}`}
                                          >
                                            {tag.label}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>

                                {/* Add to List dropdown */}
                                {alreadyAdded || justAdded ? (
                                  <span onClick={(e) => e.stopPropagation()} className={cn(
                                    "shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                                    justAdded
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                  )}>
                                    <Check className="h-3 w-3" />
                                    {justAdded ? "Added" : "Added"}
                                  </span>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#1e3a5f] text-white hover:bg-[#2d5282] transition-colors">
                                        <ListPlus className="h-3 w-3" />
                                        Add to List
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="z-[60]">
                                      {lists.map((list) => (
                                        <DropdownMenuItem
                                          key={list.id}
                                          onClick={() => handleAddToList(list.id, list.name, c)}
                                        >
                                          {list.name}
                                          <span className="ml-auto text-xs text-muted-foreground">
                                            {list.creators.length}
                                          </span>
                                        </DropdownMenuItem>
                                      ))}
                                      <DropdownMenuItem onClick={() => handleOpenCreateListForCreator(c)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create New List
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* "Show X more" toggle */}
                        {hasMore && !isExpanded && (
                          <button
                            onClick={() => setExpandedMsgIds((prev) => new Set(prev).add(m.id))}
                            className="w-full mt-2 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-[#1e3a5f] bg-[#1e3a5f]/5 hover:bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 transition-colors"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                            Show {hiddenCount} more
                          </button>
                        )}
                        {hasMore && isExpanded && (
                          <button
                            onClick={() => setExpandedMsgIds((prev) => { const next = new Set(prev); next.delete(m.id); return next; })}
                            className="w-full mt-2 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            Show less
                          </button>
                        )}

                        {/* "Create List from Results" button */}
                        {(() => {
                          if (listCreatedMsgIds.has(m.id)) return null;
                          const msgIdx = messages.indexOf(m);
                          const userMsg = msgIdx > 0 ? messages[msgIdx - 1] : null;
                          const userText = userMsg?.role === "user" ? userMsg.text : "";
                          const wantsList = LIST_PHRASES.test(userText);
                          if (!wantsList) return null;
                          return (
                            <button
                              onClick={() => handleCreateListFromResults(m.id, m.creators!, userText)}
                              disabled={creatingListMsgId === m.id}
                              className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#1e3a5f] to-[#2d5282] hover:from-[#2d5282] hover:to-[#1e3a5f] border border-[#1e3a5f]/30 shadow-sm transition-all"
                            >
                              {creatingListMsgId === m.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                              Create List from Results
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* CTA button — "See more in Discovery" full-width at bottom */}
                  {m.cta && (
                    <button
                      onClick={() => {
                        navigate(m.cta!.link);
                        setOpen(false);
                      }}
                      className="w-full mt-3 bg-[#1e3a5f] text-white text-xs px-4 py-2.5 rounded-full hover:bg-[#2d5282] transition-colors text-center font-medium"
                    >
                      {m.cta.label}
                    </button>
                  )}
                  {m.followUp && (
                    <p className="text-xs text-gray-400 mt-2">{m.followUp}</p>
                  )}
                  {/* Quick-reply chips — always below everything including cards */}
                  {m.chips && m.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.chips.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => handleChipClick(chip)}
                          className="text-xs px-3 py-1.5 rounded-full border border-[#1e3a5f]/30 bg-[#1e3a5f]/5 text-[#1e3a5f] hover:bg-[#1e3a5f]/15 transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  className="flex-1 min-h-[80px] max-h-[160px] rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.12)] transition-all"
                  placeholder="Ask me anything about creators, events, or campaigns..."
                  rows={2}
                  onKeyDown={handleKeyDown}
                />
                <Button type="submit" size="icon" className="bg-[#1e3a5f] hover:bg-[#2d5282]">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">Powered by Claude</p>
            </form>
          </div>
        </div>
      )}

      {/* Create List Modal */}
      <CreateListModal
        open={createListModalOpen}
        onOpenChange={setCreateListModalOpen}
        onCreate={handleCreateListAndAdd}
      />

      {/* Dark overlay behind profile drawer */}
      {selectedCreator && (
        <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setSelectedCreator(null)} />
      )}

      {/* Slide-out profile drawer */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-2xl z-[70] transform transition-transform duration-300",
        selectedCreator ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-sm text-gray-500">Creator Profile</span>
          <button
            onClick={() => setSelectedCreator(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Profile content */}
        {selectedCreator && (() => {
          console.log('Full creator object:', selectedCreator);
          const { branch, keywords } = detectMilitaryKeywords(selectedCreator);
          return (
            <div className="overflow-y-auto h-full pb-32">
              {/* Avatar + name + handle */}
              <div className="p-6 text-center border-b border-gray-100 dark:border-gray-800">
                <img
                  src={selectedCreator.avatar}
                  alt={selectedCreator.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full mx-auto mb-3 object-cover ring-2 ring-white dark:ring-gray-800 shadow-md"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCreator.name)}&background=6C5CE7&color=fff&size=128`;
                  }}
                />
                <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">{selectedCreator.name}</h2>
                {selectedCreator.username && (
                  <p className="text-gray-500 text-sm">@{selectedCreator.username}</p>
                )}
                {selectedCreator.location && (
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">📍 {selectedCreator.location}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {selectedCreator.followers > 0 && (
                    <span>{formatFollowers(selectedCreator.followers)} followers</span>
                  )}
                  {selectedCreator.followers > 0 && selectedCreator.engagementRate > 0 && (
                    <span className="text-gray-300">·</span>
                  )}
                  {selectedCreator.engagementRate > 0 && (
                    <span>{selectedCreator.engagementRate}% engagement</span>
                  )}
                </div>
                {branch && (
                  <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-medium text-xs uppercase tracking-wide">
                    {branch}
                  </span>
                )}
                {(selectedCreator.category || selectedCreator.nicheClass) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{selectedCreator.category || selectedCreator.nicheClass}</p>
                )}
              </div>

              {/* Bio */}
              {selectedCreator.bio && (
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selectedCreator.bio}</p>
                </div>
              )}

              {/* Military keywords */}
              {keywords.length > 0 && (
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Military Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw) => (
                      <span key={kw} className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {selectedCreator.hashtags && selectedCreator.hashtags.length > 0 && (
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Hashtags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCreator.hashtags.map((tag) => (
                      <span key={tag} className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Platforms */}
              {(() => {
                const allPlatforms = [
                  ...new Set([
                    ...(selectedCreator.socialPlatforms ?? []),
                    ...(selectedCreator.platforms ?? []),
                  ].map((p) => p.toLowerCase())),
                ];
                if (allPlatforms.length === 0) return null;
                const handle = selectedCreator.username || selectedCreator.name?.toLowerCase().replace(/\s+/g, "");
                const urlMap: Record<string, string> = {
                  instagram: `https://instagram.com/${handle}`,
                  tiktok: `https://tiktok.com/@${handle}`,
                  youtube: `https://youtube.com/@${handle}`,
                  twitter: `https://x.com/${handle}`,
                  facebook: `https://facebook.com/${handle}`,
                  linkedin: `https://linkedin.com/in/${handle}`,
                };
                const pillStyle: Record<string, string> = {
                  instagram: "border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/20",
                  tiktok: "border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800",
                  youtube: "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20",
                  twitter: "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800",
                  facebook: "border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20",
                  linkedin: "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20",
                };
                const displayName: Record<string, string> = {
                  instagram: "Instagram",
                  tiktok: "TikTok",
                  youtube: "YouTube",
                  twitter: "X / Twitter",
                  facebook: "Facebook",
                  linkedin: "LinkedIn",
                };
                return (
                  <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platforms</p>
                    <div className="flex flex-wrap gap-2">
                      {allPlatforms.map((p) => {
                        const url = urlMap[p];
                        const style = pillStyle[p] ?? "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";
                        const label = displayName[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
                        return (
                          <a
                            key={p}
                            href={url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${style}`}
                          >
                            {label}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Analytics */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Analytics</p>
                {(() => { console.log("[Drawer] selectedCreator analytics:", { mediaCount: selectedCreator.mediaCount, postsPerMonth: selectedCreator.postsPerMonth, avgViews: selectedCreator.avgViews, avgReelLikes: selectedCreator.avgReelLikes, avgLikes: selectedCreator.avgLikes, avgComments: selectedCreator.avgComments, followers: selectedCreator.followers, engagementRate: selectedCreator.engagementRate }); return null; })()}
                <div>
                  {([
                    ["Followers", selectedCreator.followers != null && selectedCreator.followers > 0 ? formatFollowers(selectedCreator.followers) : null],
                    ["Engagement Rate", selectedCreator.engagementRate != null && selectedCreator.engagementRate > 0 ? `${selectedCreator.engagementRate}%` : null],
                    ["Number of Posts", selectedCreator.mediaCount != null && selectedCreator.mediaCount > 0 ? formatFollowers(selectedCreator.mediaCount) : null],
                    ["Posts per Month", selectedCreator.postsPerMonth != null && selectedCreator.postsPerMonth > 0 ? selectedCreator.postsPerMonth.toFixed(1) : null],
                    ["Average Views", selectedCreator.avgViews != null && selectedCreator.avgViews > 0 ? formatFollowers(selectedCreator.avgViews) : null],
                    ["Average Reel Likes", selectedCreator.avgReelLikes != null && selectedCreator.avgReelLikes > 0 ? formatFollowers(selectedCreator.avgReelLikes) : null],
                    ["Average Likes", selectedCreator.avgLikes != null && selectedCreator.avgLikes > 0 ? formatFollowers(selectedCreator.avgLikes) : null],
                    ["Average Comments", selectedCreator.avgComments != null && selectedCreator.avgComments > 0 ? formatFollowers(selectedCreator.avgComments) : null],
                  ] as [string, string | null][]).map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{value ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons with dropdowns */}
              <div className="p-6 flex flex-col gap-2" ref={drawerDropdownRef}>
                {/* + Add to List */}
                <div className="relative">
                  <button
                    onClick={() => openDrawerDropdown("list")}
                    className="w-full py-2.5 px-4 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5282] transition-colors"
                  >
                    + Add to List
                  </button>
                  {drawerDropdown === "list" && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-[200px] overflow-y-auto z-10">
                      {lists.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => {
                            handleAddToList(l.id, l.name, selectedCreator);
                            setDrawerDropdown(null);
                          }}
                          className="w-full flex items-center gap-2.5 py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-left transition-colors"
                        >
                          <img
                            src={l.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(l.name)}&background=6C5CE7&color=fff&size=32`}
                            alt=""
                            className="w-6 h-6 rounded-full shrink-0"
                          />
                          <span className="truncate text-gray-800 dark:text-gray-200">{l.name}</span>
                          <span className="ml-auto text-xs text-gray-400 shrink-0">{l.creators.length}</span>
                        </button>
                      ))}
                      {/* Create New List inline */}
                      <div className="border-t border-gray-100 dark:border-gray-700 py-2 px-3">
                        {newListNameInput !== null ? (
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const name = newListNameInput.trim();
                            if (!name) return;
                            const newId = createList(name);
                            handleAddToList(newId, name, selectedCreator);
                            setNewListNameInput("");
                            setDrawerDropdown(null);
                          }} className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-[#1e3a5f] shrink-0" />
                            <input
                              autoFocus
                              value={newListNameInput}
                              onChange={(e) => setNewListNameInput(e.target.value)}
                              placeholder="New list name…"
                              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                            />
                          </form>
                        ) : (
                          <button onClick={() => setNewListNameInput("")} className="flex items-center gap-2 text-sm text-[#1e3a5f] font-medium">
                            <Plus className="h-4 w-4" /> Create New List
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add to Directory */}
                <div className="relative">
                  <button
                    onClick={() => openDrawerDropdown("directory")}
                    className="w-full py-2.5 px-4 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg text-sm font-medium hover:bg-[#1e3a5f]/5 transition-colors"
                  >
                    Add to Directory
                  </button>
                  {drawerDropdown === "directory" && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-[200px] overflow-y-auto z-10">
                      {drawerDropdownLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      ) : drawerDirs.length === 0 ? (
                        <p className="py-3 px-3 text-sm text-gray-400 text-center">No directories yet</p>
                      ) : (
                        drawerDirs.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => handleDrawerAddToDirectory(d)}
                            className="w-full flex items-center gap-2.5 py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-left transition-colors"
                          >
                            <span className="truncate text-gray-800 dark:text-gray-200">{d.name}</span>
                            <span className="ml-auto text-xs text-gray-400 shrink-0">{d.member_count ?? 0}</span>
                          </button>
                        ))
                      )}
                      {/* Create New Directory inline */}
                      <div className="border-t border-gray-100 dark:border-gray-700 py-2 px-3">
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const name = newDirNameInput.trim();
                          if (!name) return;
                          const { data, error } = await supabase.from("directories").insert({ name }).select().single();
                          if (error) { toast.error(error.message); return; }
                          toast.success(`Directory "${name}" created`);
                          if (data) await handleDrawerAddToDirectory({ ...data, member_count: 0 } as Directory);
                          setNewDirNameInput("");
                        }} className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-[#1e3a5f] shrink-0" />
                          <input
                            autoFocus
                            value={newDirNameInput}
                            onChange={(e) => setNewDirNameInput(e.target.value)}
                            placeholder="New directory name…"
                            className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                          />
                        </form>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invite to Event */}
                <div className="relative">
                  <button
                    onClick={() => openDrawerDropdown("event")}
                    className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Invite to Event
                  </button>
                  {drawerDropdown === "event" && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-[200px] overflow-y-auto z-10">
                      {drawerDropdownLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      ) : drawerEvents.length === 0 ? (
                        <p className="py-3 px-3 text-sm text-gray-400 text-center">No upcoming events</p>
                      ) : (
                        drawerEvents.map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => handleDrawerInviteToEvent(ev)}
                            className="w-full flex items-center justify-between py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-left transition-colors"
                          >
                            <span className="truncate text-gray-800 dark:text-gray-200">{ev.title}</span>
                            <span className="text-xs text-gray-400 shrink-0 ml-2">
                              {new Date(ev.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
