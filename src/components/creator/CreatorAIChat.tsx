import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, X, Plus, Loader2, Instagram, Youtube, Linkedin, Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

type ModelOption = "Auto" | "Claude" | "Gemini" | "GPT-4o";
const MODEL_OPTIONS: { value: ModelOption; label: string }[] = [
  { value: "Auto", label: "Auto" },
  { value: "Claude", label: "Claude" },
  { value: "Gemini", label: "Gemini" },
  { value: "GPT-4o", label: "GPT-4o" },
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  loading?: boolean;
}

let idCounter = 0;
function makeId() {
  return `cmsg-${++idCounter}-${Date.now()}`;
}

const GREETING = "Hey! \ud83d\udc4b I'm your MilCrunch AI assistant. I can help with captions, brand pitches, content strategy, and more. What are you working on? \ud83d\ude80";

const CREATOR_CHIPS = [
  "\u270d\ufe0f Write a caption",
  "\ud83c\udfaf Find brands to pitch",
  "\ud83d\udcc5 Plan my content this week",
  "\ud83d\udcc8 Grow my following",
  "\ud83d\udc8c Draft a sponsorship email",
  "\ud83d\udd25 Analyze my best posts",
];

const CREATOR_SYSTEM_PROMPT = `You are the MilCrunch AI Assistant for military creators. You help veteran and military-affiliated content creators grow their brand, create content, and monetize their platform.

You can help with:
- Writing social media captions, bios, and post ideas
- Planning content calendars and cadence strategies
- Drafting sponsorship pitches and brand outreach emails
- Analyzing content performance and suggesting improvements
- Finding brand partnership opportunities
- Growing follower counts and engagement rates
- Optimizing bio pages and link-in-bio strategies
- Understanding military creator market rates and pricing

Keep responses concise, actionable, and encouraging. Use bullet points and bold for key takeaways. Always end with a clear next step or actionable suggestion. Never ask more than one question per response.

IMPORTANT: When you need to ask the user which social media platform they want to focus on, include the exact phrase "which platform" in your response. This triggers a platform selector UI for the user.`;

/* ── Platform SVG icons ── */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 3.76.92V6.69Z" />
    </svg>
  );
}

const PLATFORM_CHIPS = [
  {
    label: "Instagram",
    icon: (cls: string) => <Instagram className={cls} />,
    bg: "bg-gradient-to-br from-purple-500 to-pink-500",
    ring: "ring-purple-300 dark:ring-purple-700",
  },
  {
    label: "TikTok",
    icon: (cls: string) => <TikTokIcon className={cls} />,
    bg: "bg-black dark:bg-white/90",
    ring: "ring-gray-400 dark:ring-gray-500",
    textOverride: "text-white dark:text-black",
  },
  {
    label: "YouTube",
    icon: (cls: string) => <Youtube className={cls} />,
    bg: "bg-red-600",
    ring: "ring-red-300 dark:ring-red-700",
  },
  {
    label: "LinkedIn",
    icon: (cls: string) => <Linkedin className={cls} />,
    bg: "bg-[#0A66C2]",
    ring: "ring-blue-300 dark:ring-blue-700",
  },
  {
    label: "All Platforms",
    icon: (cls: string) => <Globe className={cls} />,
    bg: "bg-gray-600 dark:bg-gray-500",
    ring: "ring-gray-300 dark:ring-gray-600",
  },
];

/* Does the assistant message look like it's asking the user to pick a platform? */
function asksPlatform(text: string): boolean {
  const lower = text.toLowerCase();
  return /which platform/i.test(lower) || /what platform/i.test(lower) || /choose a platform/i.test(lower) || /select a platform/i.test(lower) || /specific platform/i.test(lower);
}

export interface CreatorAIChatRef {
  open: () => void;
  openWithMessage: (msg: string) => void;
}

const CreatorAIChat = forwardRef<CreatorAIChatRef>(function CreatorAIChat(_, ref) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId(), role: "assistant", text: GREETING },
  ]);
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState("Claude");
  const [showProviderPill, setShowProviderPill] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>("Auto");
  const [providerError, setProviderError] = useState<string | null>(null);
  const providerTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const showChips = messages.length <= 1;

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    openWithMessage: (msg: string) => {
      setOpen(true);
      setTimeout(() => sendMessage(msg), 50);
    },
  }));

  const sendMessage = async (input: string) => {
    const userMsgId = makeId();
    const loadingMsgId = makeId();
    setMessages((m) => [
      ...m,
      { id: userMsgId, role: "user", text: input },
      { id: loadingMsgId, role: "assistant", text: "", loading: true },
    ]);
    setLoading(true);

    try {
      const snapshot = await new Promise<ChatMessage[]>((resolve) =>
        setMessages((m) => { resolve(m); return m; })
      );
      const history: { role: string; content: string }[] = [];
      for (const msg of snapshot) {
        if (msg.loading || msg.id === loadingMsgId) continue;
        if (msg.text) history.push({ role: msg.role, content: msg.text });
      }
      const trimmed = history.slice(-10);

      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 800,
          system: CREATOR_SYSTEM_PROMPT,
          messages: trimmed,
          ...(selectedModel !== "Auto" ? { forceProvider: selectedModel } : {}),
        }),
      });

      // Read header BEFORE calling .json() — headers are available immediately
      const provider = res.headers.get("X-AI-Provider") || "Claude";
      setActiveProvider(provider);
      setShowProviderPill(true);
      if (providerTimerRef.current) clearTimeout(providerTimerRef.current);
      providerTimerRef.current = setTimeout(() => setShowProviderPill(false), 5000);

      const data = await res.json();

      // Handle forced provider failure
      if (!res.ok && data.failedProvider) {
        setProviderError(`${data.failedProvider} is currently unavailable`);
        setActiveProvider("Unavailable");
      } else {
        setProviderError(null);
      }

      const text = data.content?.[0]?.text ?? "I'm having trouble right now. Please try again.";

      setMessages((m) => m.map((msg) =>
        msg.id === loadingMsgId ? { ...msg, text, loading: false } : msg
      ));
    } catch {
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
    if (!text || loading) return;
    inputRef.current!.value = "";
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = inputRef.current?.value?.trim();
      if (text && !loading) {
        inputRef.current!.value = "";
        sendMessage(text);
      }
    }
  };

  const resetChat = () => {
    setMessages([
      { id: makeId(), role: "assistant", text: GREETING },
    ]);
    if (inputRef.current) inputRef.current.value = "";
  };

  /* Check if the last assistant message asks about platforms */
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.loading);
  const showPlatformChips = lastAssistant && asksPlatform(lastAssistant.text) && !loading;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className={cn(
            "flex items-center gap-2.5 h-12 rounded-full shadow-lg text-white font-medium text-sm transition-all duration-200",
            "hover:shadow-xl hover:-translate-y-0.5",
            open
              ? "bg-gray-700 hover:bg-gray-600 px-5"
              : "bg-[#1B3A6B] hover:bg-[#152d54] px-5"
          )}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close AI chat" : "Open AI chat"}
        >
          {open ? (
            <>
              <X className="h-4 w-4" />
              <span>Close</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-[#1B3A6B]" />
              <span>MilCrunch AI</span>
            </>
          )}
        </button>
      </div>

      {/* Slide-out panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="relative bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200"
            style={{ width: 420, maxWidth: "100vw" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#1B3A6B]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-[#1B3A6B]" />
                <div>
                  <p className="font-semibold text-sm text-white">MilCrunch AI Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Model selector */}
                <div className="flex items-center gap-1 mr-1">
                  <span className="text-[10px] text-white/40 hidden sm:inline">Model:</span>
                  <div className="relative">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as ModelOption)}
                      className="appearance-none bg-white/10 text-white text-[11px] font-medium pl-2 pr-5 py-1 rounded border border-white/15 hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-teal-400/50 cursor-pointer transition-colors"
                    >
                      {MODEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#1B3A6B] text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-white/50 pointer-events-none" />
                  </div>
                </div>
                <button
                  onClick={resetChat}
                  className="flex items-center gap-1 text-xs text-white/60 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New Chat
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Prompt chips — shown on empty state */}
            {showChips && (
              <div className="px-3 pt-3 pb-1 grid grid-cols-2 gap-1.5 shrink-0">
                {CREATOR_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="text-xs px-3 py-2.5 rounded-xl border border-[#1B3A6B]/20 bg-[#1B3A6B]/5 text-[#1B3A6B] dark:border-white/10 dark:bg-white/5 dark:text-white/80 hover:bg-[#1B3A6B]/10 dark:hover:bg-white/10 transition-colors text-left"
                  >
                    {chip}
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
                    "rounded-2xl px-4 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-[#1B3A6B] text-white rounded-br-sm ml-auto max-w-[80%]"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm mr-auto shadow-sm max-w-[95%] border border-border"
                  )}
                >
                  {m.loading ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#1B3A6B] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-[#1B3A6B] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-[#1B3A6B] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm text-muted-foreground italic">Thinking...</span>
                    </div>
                  ) : m.role === "assistant" ? (
                    <MarkdownRenderer content={m.text} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  )}
                </div>
              ))}

              {/* Smart platform chips — rendered after the last assistant message when it asks about platforms */}
              {showPlatformChips && (
                <div className="flex flex-wrap gap-2 ml-1 mt-1">
                  {PLATFORM_CHIPS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => sendMessage(p.label)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white ring-1 transition-all",
                        "hover:scale-105 hover:shadow-md active:scale-100",
                        p.bg,
                        p.ring,
                        (p as any).textOverride,
                      )}
                    >
                      <span className="flex items-center justify-center h-5 w-5">
                        {p.icon("h-4 w-4")}
                      </span>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="shrink-0 p-3 border-t border-border">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  className="flex-1 min-h-[60px] max-h-[120px] rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 focus:border-[#1B3A6B] transition-all"
                  placeholder="Ask me anything about your content, brands, or growth..."
                  rows={2}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-[#1B3A6B] hover:bg-[#152d54] h-10 w-10 shrink-0"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-[10px] text-muted-foreground">
                  Powered by {activeProvider}
                </p>
                {showProviderPill && (
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full transition-opacity duration-300",
                      activeProvider === "Claude" && "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
                      activeProvider === "GPT-4o" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      activeProvider === "Gemini" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      activeProvider === "Unavailable" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    )}
                    title="Powered by this provider. MilCrunch uses Claude by default with automatic fallback."
                  >
                    {activeProvider}
                  </span>
                )}
                {providerError && (
                  <span className="text-[10px] text-red-500 dark:text-red-400">
                    {providerError}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

export default CreatorAIChat;
