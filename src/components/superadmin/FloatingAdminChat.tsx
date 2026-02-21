import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

import { getChatResponse } from "@/lib/chat-responses";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  cta?: { label: string; link: string };
  followUp?: string;
  creators?: any[];
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

async function searchCreatorsIC(query: string): Promise<any[]> {
  try {
    const res = await fetch('/api/ic-discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'instagram',
        filters: { ai_search: query },
        paging: { limit: 6, page: 1 }
      })
    });
    const data = await res.json();
    return data.results ?? data.influencers ?? [];
  } catch { return []; }
}

let idCounter = 0;
function makeId() {
  return `msg-${++idCounter}-${Date.now()}`;
}

export default function FloatingAdminChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId(), role: "assistant", text: "👋 Hi! I'm your MilCrunch AI assistant. How can I help today?" },
  ]);
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
        // Small delay so panel renders before adding the message
        setTimeout(() => addResponse(msg), 150);
      } else {
        setOpen(true);
      }
    };
    window.addEventListener("open-ai-chat", handler);
    return () => window.removeEventListener("open-ai-chat", handler);
  }, []);

  const addResponse = async (input: string) => {
    const userMsg: ChatMessage = { id: makeId(), role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    const lower = input.toLowerCase();
    const isCreatorSearch = lower.match(/find|show|give|list|search|looking for|need|want|creators?|influencers?|speakers?|veterans?|military|army|navy|marines|air force|coast guard/);

    if (isCreatorSearch) {
      const loadingId = makeId();
      setMessages(m => [...m, { id: loadingId, role: 'assistant' as const, text: 'Searching our military creator network...', loading: true }]);
      const results = await searchCreatorsIC(input);
      setMessages(m => m.filter(msg => msg.id !== loadingId));
      if (results.length > 0) {
        setMessages(m => [...m, {
          id: makeId(),
          role: 'assistant' as const,
          text: `Found ${results.length} creators matching your search:`,
          creators: results.slice(0, 6)
        }]);
      } else {
        setMessages(m => [...m, { id: makeId(), role: 'assistant' as const, text: "I couldn't find results for that search. Try adjusting your criteria or open Creator Discovery for advanced filters.", cta: { label: 'Open Discovery →', link: '/brand/discover' } }]);
      }
      return;
    }

    // Fall back to canned responses for non-creator queries
    setTimeout(() => {
      const response = getChatResponse(input);
      setMessages(m => [...m, { id: makeId(), role: 'assistant' as const, ...response }]);
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
                    "rounded-2xl px-4 py-2 text-sm max-w-[80%]",
                    m.role === "user"
                      ? "bg-[#6C5CE7] text-white rounded-br-sm ml-auto"
                      : "bg-white text-gray-800 rounded-bl-sm mr-auto shadow-sm dark:bg-gray-800 dark:text-gray-100"
                  )}
                >
                  {m.role === "assistant" ? (
                    <MarkdownRenderer content={m.text} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  )}
                  {m.creators && m.creators.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {m.creators.map((c: any, i: number) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                          <img
                            src={c.picture ?? c.avatar ?? `https://unavatar.io/instagram/${c.username}`}
                            alt={c.fullname ?? c.username}
                            className="h-10 w-10 rounded-full object-cover shrink-0"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.fullname ?? c.username ?? 'C')}&background=6C5CE7&color=fff`; }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{c.fullname ?? c.username}</p>
                            <p className="text-xs text-muted-foreground truncate">@{c.username}</p>
                            <p className="text-xs text-muted-foreground">{c.followers ? (c.followers >= 1000 ? `${(c.followers/1000).toFixed(1)}K` : c.followers) : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.cta && (
                    <button
                      onClick={() => {
                        navigate(m.cta!.link);
                        setOpen(false);
                      }}
                      className="block mt-2 bg-[#6C5CE7] text-white text-xs px-4 py-2 rounded-full hover:bg-[#5A4BD5] transition-colors"
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
    </>
  );
}
