import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Sparkles, Plus, Loader2, ListPlus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { searchCreators, type CreatorCard } from "@/lib/influencers-club";
import { getChatResponse } from "@/lib/chat-responses";
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
}

function getQuickPrompts(pathname: string): string[] {
  if (pathname.startsWith("/brand/discover") || pathname.startsWith("/admin/discover"))
    return ["🎤 Find keynote speakers", "🎙️ Find podcasters", "📚 Find authors", "👥 Find brand ambassadors"];
  if (pathname.startsWith("/brand/events") || pathname.startsWith("/admin/events"))
    return ["📊 View 365 Insights", "🎤 Book a speaker", "💰 Sponsor report"];
  if (pathname.startsWith("/brand/podcasts") || pathname.startsWith("/admin/podcasts"))
    return ["🔍 Search podcasts", "📈 Top military podcasts", "🎙️ Submit a podcast"];
  if (pathname.startsWith("/brand/dashboard") || pathname.startsWith("/admin/dashboard") || pathname === "/brand" || pathname === "/admin")
    return ["📊 Show my analytics", "🔍 Find creators", "📅 Upcoming events"];
  return ["🔍 Find creators", "🎙️ Browse podcasts", "📅 View events", "📊 Analytics"];
}

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
    { id: makeId(), role: "assistant", text: "Hi! I'm your MilCrunch AI assistant. How can I help today?" },
  ]);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [pendingCreator, setPendingCreator] = useState<CreatorCard | null>(null);
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
      setPendingCreator(null);
    }
  };

  const addResponse = async (input: string) => {
    const userMsg: ChatMessage = { id: makeId(), role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    const lower = input.toLowerCase();
    const isCreatorSearch = lower.match(
      /find|show|give|list|search|looking for|need|want|creators?|influencers?|speakers?|keynote|podcasters?|authors?|ambassadors?|veterans?|military|army|navy|marines|air force|coast guard/
    );

    if (isCreatorSearch) {
      const loadingId = makeId();
      setMessages((m) => [
        ...m,
        { id: loadingId, role: "assistant" as const, text: "Searching our military creator network...", loading: true },
      ]);

      try {
        const { creators } = await searchCreators(input, { page: 1 });
        setMessages((m) => m.filter((msg) => msg.id !== loadingId));

        if (creators.length > 0) {
          setMessages((m) => [
            ...m,
            {
              id: makeId(),
              role: "assistant" as const,
              text: `Found ${creators.length} creators matching your search. Showing top ${Math.min(creators.length, 10)}:`,
              creators: creators.slice(0, 10),
              cta: { label: "See more in Discovery →", link: `/brand/discover?q=${encodeURIComponent(input)}` },
            },
          ]);
        } else {
          setMessages((m) => [
            ...m,
            {
              id: makeId(),
              role: "assistant" as const,
              text: "I couldn't find results for that search. Try different keywords or open Creator Discovery for advanced filters.",
              cta: { label: "Open Creator Discovery →", link: "/brand/discover" },
            },
          ]);
        }
      } catch (err) {
        console.error("[FloatingChat] Search error:", err);
        setMessages((m) => m.filter((msg) => msg.id !== loadingId));
        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: "assistant" as const,
            text: "Something went wrong searching creators. Try again or use Creator Discovery directly.",
            cta: { label: "Open Creator Discovery →", link: "/brand/discover" },
          },
        ]);
      }
      return;
    }

    // Fall back to canned responses for non-creator queries
    setTimeout(() => {
      const response = getChatResponse(input);
      setMessages((m) => [...m, { id: makeId(), role: "assistant" as const, ...response }]);
    }, 500);
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
  const quickPrompts = getQuickPrompts(location.pathname);

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

            {/* Quick prompt pills */}
            <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => addResponse(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#6C5CE7]/20 bg-[#6C5CE7]/5 text-[#6C5CE7] hover:bg-[#6C5CE7]/10 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

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
                  {/* Loading spinner */}
                  {m.loading ? (
                    <div className="flex items-center gap-2 py-1">
                      <Loader2 className="h-4 w-4 animate-spin text-[#6C5CE7]" />
                      <span className="text-sm text-muted-foreground">{m.text}</span>
                    </div>
                  ) : m.role === "assistant" ? (
                    <MarkdownRenderer content={m.text} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  )}

                  {/* Creator result cards */}
                  {m.creators && m.creators.length > 0 && (
                    <div className="space-y-2 mt-3 max-h-96 overflow-y-auto pr-1">
                      {m.creators.map((c, i) => {
                        const { branch, keywords } = detectMilitaryKeywords(c);
                        const alreadyAdded = isCreatorInList(c.id);

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
                              {/* Matched military keywords */}
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
                            {alreadyAdded ? (
                              <span className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                <Check className="h-3 w-3" />
                                Added
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
                  )}

                  {/* CTA button — "See more in Discovery" at bottom of results */}
                  {m.cta && (
                    <button
                      onClick={() => {
                        navigate(m.cta!.link);
                        setOpen(false);
                      }}
                      className="block mt-3 bg-[#6C5CE7] text-white text-xs px-4 py-2 rounded-full hover:bg-[#5A4BD5] transition-colors"
                    >
                      {m.cta.label}
                    </button>
                  )}
                  {m.followUp && (
                    <p className="text-xs text-gray-400 mt-2">{m.followUp}</p>
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
