import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

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

const CREATOR_CHIPS = [
  "Write a caption for my next post",
  "Find brands to pitch",
  "Plan my content this week",
  "Grow my Instagram following",
  "Draft a sponsorship email",
  "Analyze my best posts",
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

Keep responses concise, actionable, and encouraging. Use bullet points and bold for key takeaways. Always end with a clear next step or actionable suggestion. Never ask more than one question per response.`;

export interface CreatorAIChatRef {
  open: () => void;
  openWithMessage: (msg: string) => void;
}

const CreatorAIChat = forwardRef<CreatorAIChatRef>(function CreatorAIChat(_, ref) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId(), role: "assistant", text: "Hey! I'm your MilCrunch AI assistant. I can help with captions, brand pitches, content strategy, and more. What are you working on?" },
  ]);
  const [loading, setLoading] = useState(false);
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
      // Small delay so the panel renders before sending
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
      // Build conversation history (last 10 turns)
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
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: CREATOR_SYSTEM_PROMPT,
          messages: trimmed,
        }),
      });

      const data = await res.json();
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
      { id: makeId(), role: "assistant", text: "Hey! I'm your MilCrunch AI assistant. I can help with captions, brand pitches, content strategy, and more. What are you working on?" },
    ]);
    if (inputRef.current) inputRef.current.value = "";
  };

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
              <Sparkles className="h-4 w-4 text-[#C8A84B]" />
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
                <Sparkles className="h-5 w-5 text-[#C8A84B]" />
                <div>
                  <p className="font-semibold text-sm text-white">MilCrunch AI Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
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
                        <span className="w-2 h-2 bg-[#C8A84B] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-[#C8A84B] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-[#C8A84B] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
              <p className="text-[10px] text-muted-foreground text-center mt-2">Powered by Claude</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

export default CreatorAIChat;
