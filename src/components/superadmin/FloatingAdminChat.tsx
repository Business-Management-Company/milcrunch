import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Sparkles, Plus, Loader2, ListPlus, Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { searchCreators, type CreatorCard } from "@/lib/influencers-club";

import { useLists } from "@/contexts/ListContext";
import CreateListModal from "@/components/CreateListModal";
import { detectBranch } from "@/lib/featured-creators";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  cta?: { label: string; link: string };
  followUp?: string;
  creators?: CreatorCard[];
  loading?: boolean;
  chips?: string[];
}

const DEFAULT_CHIPS = [
  "🔍 Find creators with 50K+ followers",
  "🏛️ Find me a venue",
  "📅 Upcoming events",
  "🎖️ Army veteran speakers",
  "💍 MilSpouse influencers",
  "📊 Top engaged creators",
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const addResponse = async (input: string) => {
    // FIX 1: Show loading immediately — synchronously before any await
    const loadingMsgId = makeId();
    setMessages((m) => [
      ...m,
      { id: makeId(), role: "user" as const, text: input },
      { id: loadingMsgId, role: "assistant" as const, text: "", loading: true },
    ]);
    setLoading(true);

    try {
      // Fetch upcoming events and creators for context
      const [{ data: events }, { data: creators }] = await Promise.all([
        supabase
          .from("events")
          .select("title, start_date, end_date, location, description, event_type, photo_url, slug, id")
          .gte("start_date", new Date().toISOString())
          .order("start_date", { ascending: true })
          .limit(20),
        supabase
          .from("directory_members")
          .select("creator_name, creator_handle, platform, branch")
          .limit(50),
      ]);

      const eventsBlock = events?.length
        ? events.map(e => {
            const date = e.start_date ? new Date(e.start_date).toLocaleDateString() : "TBD";
            const loc = e.location || "Location TBD";
            const url = e.slug ? `/brand/events/${e.slug}` : `/brand/events`;
            const photo = e.photo_url ? ` | Photo: ${e.photo_url}` : "";
            return `- ${e.title} | ${date} | ${loc} | Link: ${url}${photo}`;
          }).join("\n")
        : "No upcoming events found.";

      const creatorsBlock = creators?.length
        ? creators.map(c => `${c.creator_name} (@${c.creator_handle}, ${c.branch || "branch unknown"})`).join(", ")
        : "No creators found.";

      const systemPrompt = `You are the MilCrunch AI assistant for a military creator and event management platform. You have access to the following upcoming events in the platform database:

${eventsBlock}

Creators in the platform: ${creatorsBlock}

Answer questions about these events and creators directly from this data. Do not say you lack access to the database. Never output raw JSON. Always respond in natural language.

When showing events, always format each event as:
**[Event Name](event_url or #)** - Date | Location
Include the event photo if available. Always end event listings with a direct link. Format responses with clear sections and emojis for scannability.

Ask MAXIMUM ONE clarifying question before showing results. Never ask more than one question in a single response. If the user has already answered one question, proceed immediately to showing results from the database — do not ask another question. Format creator results as:

**[Name]** (@handle) — [branch] | [followers] followers | [engagement]% engagement

Show at least 5 results when displaying creators. Lead with: "Here are [X] creators matching your criteria:" then list them. After results, offer one follow-up like "Want me to filter by follower count or content type?"

When you ask a clarifying question, always end your message with a line like:
CHIPS: Option A | Option B | Option C
These will be shown as quick-reply buttons. Keep each option under 30 characters. Always provide 2-4 chip options.

When the user provides enough context to search for creators/influencers/speakers, respond ONLY with valid JSON like:
{"action":"search","query":"[search terms]","branch":"[branch if specified or empty]","count":[number requested or 10]}
For all other questions, respond naturally and concisely.`;

      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: input }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text ?? "";

      // Check if Claude wants to search for creators
      try {
        const parsed = JSON.parse(text);
        if (parsed.action === "search") {
          // Update loading message text
          setMessages((m) => m.map((msg) =>
            msg.id === loadingMsgId
              ? { ...msg, text: `Searching for ${parsed.count ?? 10} ${parsed.branch ?? "military"} creators...` }
              : msg
          ));
          const { creators: searchResults } = await searchCreators(parsed.query, { page: 1 });

          const displayCount = Math.min(searchResults.length, parsed.count ?? 10);

          if (searchResults.length > 0) {
            const actualCount = displayCount;
            const creatorSummary = searchResults.slice(0, displayCount).map(r => r.full_name || r.name || r.username).join(', ');

            const contextMsg = `The user asked: "${input}". The search returned exactly ${actualCount} creators: ${creatorSummary}. Write a natural 1-2 sentence response acknowledging this exact number. Do not invent or assume a different count. Ask a relevant follow-up question to refine the search. Use authentic military culture naturally — not forced catchphrases. Vary your tone.`;

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
            const friendlyText = responseData.content?.[0]?.text ?? `Found ${actualCount} creators matching your request.`;
            // Replace loading message with real response
            setMessages((m) => m.map((msg) =>
              msg.id === loadingMsgId
                ? {
                    ...msg,
                    text: friendlyText,
                    loading: false,
                    creators: searchResults.slice(0, displayCount),
                    cta: { label: "See more in Discovery →", link: `/brand/discover?q=${encodeURIComponent(parsed.query)}` },
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
      } catch {
        // Not JSON — treat as regular text response
      }

      // Regular text response — extract CHIPS: line if present
      const chipsMatch = text.match(/\nCHIPS:\s*(.+)$/m);
      const displayText = chipsMatch ? text.replace(chipsMatch[0], "").trim() : text;
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
                : "bg-gradient-to-r from-[#5B4BD1] to-[#6C5CE7] hover:from-[#5040C0] hover:to-[#6050D8]"
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
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#6C5CE7]/10 via-[#6C5CE7]/5 to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#6C5CE7]" />
                <div>
                  <span className="font-bold text-base">MilCrunch AI</span>
                  <span className="text-xs text-muted-foreground ml-2">Assistant</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick prompt pills — only shown on empty/greeting state */}
            {showChips && (
              <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5">
                {DEFAULT_CHIPS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => addResponse(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#6C5CE7]/20 bg-[#6C5CE7]/5 text-[#6C5CE7] hover:bg-[#6C5CE7]/10 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm",
                    m.role === "user"
                      ? "bg-[#6C5CE7] text-white rounded-br-sm ml-auto max-w-[80%]"
                      : "bg-white text-gray-800 rounded-bl-sm mr-auto shadow-sm dark:bg-gray-800 dark:text-gray-100 max-w-[95%]"
                  )}
                >
                  {/* Loading animation */}
                  {m.loading ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                      </div>
                      <span className="text-sm text-gray-500 italic">{m.text || "MilCrunch AI is thinking..."}</span>
                    </div>
                  ) : m.role === "assistant" ? (
                    <MarkdownRenderer content={m.text} />
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
                                className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-[#6C5CE7]/40 transition-colors"
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
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#6C5CE7]/10 text-[#6C5CE7] font-medium text-[10px] uppercase tracking-wide shrink-0">
                                        {branch}
                                      </span>
                                    )}
                                  </div>
                                  {c.followers > 0 && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {formatFollowers(c.followers)} followers
                                    </p>
                                  )}
                                  {keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {keywords.map((kw) => (
                                        <span
                                          key={kw}
                                          className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        >
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Add to List dropdown */}
                                {alreadyAdded || justAdded ? (
                                  <span className={cn(
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
                                      <button className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#6C5CE7] text-white hover:bg-[#5A4BD5] transition-colors">
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
                            className="w-full mt-2 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-[#6C5CE7] bg-[#6C5CE7]/5 hover:bg-[#6C5CE7]/10 border border-[#6C5CE7]/20 transition-colors"
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
                      className="w-full mt-3 bg-[#6C5CE7] text-white text-xs px-4 py-2.5 rounded-full hover:bg-[#5A4BD5] transition-colors text-center font-medium"
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
                          onClick={() => addResponse(chip)}
                          className="text-xs px-3 py-1.5 rounded-full border border-[#6C5CE7]/30 bg-[#6C5CE7]/5 text-[#6C5CE7] hover:bg-[#6C5CE7]/15 transition-colors"
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
                  className="flex-1 min-h-[80px] max-h-[160px] rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7] focus:shadow-[0_0_0_3px_rgba(108,92,231,0.12)] transition-all"
                  placeholder="Ask me anything about creators, events, or campaigns..."
                  rows={2}
                  onKeyDown={handleKeyDown}
                />
                <Button type="submit" size="icon" className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
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
    </>
  );
}
