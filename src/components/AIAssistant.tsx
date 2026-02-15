import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Send, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import ChatCreatorCard from "@/components/ChatCreatorCard";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import type { CreatorCard } from "@/lib/influencers-club";
import type { AISearchParams } from "@/lib/ai-assistant";
import { cn, simpleMarkdownToHtml } from "@/lib/utils";

function buildDiscoveryUrl(params: AISearchParams): string {
  const sp = new URLSearchParams();
  if (params.query) sp.set("q", params.query);
  if (params.platform) sp.set("platform", params.platform);
  if (params.min_followers != null) sp.set("min_followers", String(params.min_followers));
  if (params.max_followers != null) sp.set("max_followers", String(params.max_followers));
  if (params.min_engagement != null) sp.set("min_engagement", String(params.min_engagement));
  return `/brand/discover?${sp.toString()}`;
}

function formatSearchCriteria(params: AISearchParams): string {
  const parts: string[] = [];
  if (params.query) parts.push(`"${params.query}"`);
  if (params.platform) parts.push(`platform=${params.platform}`);
  if (params.min_followers != null) parts.push(`followers>${formatNum(params.min_followers)}`);
  if (params.max_followers != null) parts.push(`followers<${formatNum(params.max_followers)}`);
  if (params.min_engagement != null) parts.push(`engagement>${params.min_engagement}%`);
  return parts.join(", ");
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const STARTER_PROMPTS = [
  "Find military fitness creators with 50K+ followers",
  "Show me Army veteran podcasters",
  "Who are the top Marine influencers?",
  "Find creators near San Diego",
];

const AI_PANEL_WIDTH = 420;

export default function AIAssistant() {
  const { isOpen, closePanel, messages, isLoading, sendMessage, clearChat } = useAIAssistant();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profileCreator, setProfileCreator] = useState<CreatorCard | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closePanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closePanel]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || isLoading) return;
    setInput("");
    sendMessage(t);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={closePanel}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed right-0 z-50 flex flex-col bg-white dark:bg-[#0F1117] border-l border-gray-200 dark:border-gray-800 w-full md:w-[560px]",
          "transition-[transform] duration-300 ease-in-out",
          "shadow-2xl"
        )}
        style={{
          top: 56,
          height: "calc(100vh - 56px)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          boxShadow: isOpen ? "-8px 0 30px rgba(0,0,0,0.2)" : "none",
        }}
      >
        <header className="flex items-center justify-between shrink-0 h-14 px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pd-blue" />
            <span className="font-bold text-foreground">RecurrentX AI</span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
              >
                Clear
              </button>
            )}
            <Button variant="ghost" size="icon" className="rounded-lg" onClick={closePanel} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Ask me anything about creators, events, or campaigns.</p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full bg-gray-100 dark:bg-[#1A1D27] hover:bg-gray-200 dark:hover:bg-gray-800 text-sm text-foreground px-4 py-2 transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "animate-in fade-in duration-200",
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                )}
              >
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#0064B1] text-white px-4 py-2.5 text-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[95%] flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <img
                        src="/favicon-32x32.png"
                        alt=""
                        className="h-5 w-5 mt-0.5 shrink-0 object-contain"
                      />
                      <div
                        className="rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-[#1A1D27] px-4 py-2.5 text-sm text-foreground [&_strong]:font-semibold [&_em]:italic"
                        dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(m.content) }}
                      />
                    </div>
                    {m.creators && m.creators.length > 0 && (
                      <div className="flex flex-col gap-2 pl-7">
                        {m.searchParams && (
                          <p className="text-[11px] text-muted-foreground px-2 py-1 rounded bg-gray-50 dark:bg-gray-800/50">
                            Searching: {formatSearchCriteria(m.searchParams)}
                          </p>
                        )}
                        {m.creators.slice(0, 15).map((creator) => (
                          <ChatCreatorCard
                            key={creator.id}
                            creator={creator}
                            onViewProfile={(c) => {
                              setProfileCreator(c);
                              setProfileModalOpen(true);
                            }}
                          />
                        ))}
                        {m.searchParams && (
                          <button
                            type="button"
                            onClick={() => {
                              closePanel();
                              navigate(buildDiscoveryUrl(m.searchParams!));
                            }}
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium pl-2 py-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            See All in Discovery
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 pl-7">
                <img src="/favicon-32x32.png" alt="" className="h-5 w-5 shrink-0 object-contain" />
                <div className="rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-[#1A1D27] px-4 py-3 flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-pd-blue animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-pd-blue animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-pd-blue animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about creators, events, campaigns..."
                className="flex-1 min-h-[44px] max-h-32 resize-y rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pd-blue/50"
                rows={1}
                disabled={isLoading}
              />
              <Button
                type="button"
                size="icon"
                className="shrink-0 h-11 w-11 rounded-lg bg-pd-blue hover:bg-pd-darkblue text-white"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                aria-label="Send"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Enter to send, Shift+Enter for new line</p>
          </div>
        </div>
      </aside>

      <CreatorProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        creator={profileCreator}
      />
    </>
  );
}

export { AI_PANEL_WIDTH };
