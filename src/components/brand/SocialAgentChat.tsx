import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Send, Trash2 } from "lucide-react";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import type { Monitor } from "@/lib/social-monitoring-types";

interface Props {
  activeMonitorId: string | null;
  activeMonitor: Monitor | null;
  monitors: Monitor[];
  onFilterSentiment: (v: string) => void;
  onFilterPlatform: (v: string) => void;
  onFilterSponsored: () => void;
  onCompare: (brandB: string) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "Summarize sentiment", prompt: "Summarize the overall sentiment of recent mentions and highlight any trends" },
  { label: "Top creators", prompt: "Who are the top creators mentioning this brand and what are they saying?" },
  { label: "Negative mentions", prompt: "Show me any negative or critical mentions and what they're about" },
  { label: "Sponsored vs organic", prompt: "What's the breakdown of sponsored vs organic mentions?" },
  { label: "Content themes", prompt: "What are the main themes and topics across recent mentions?" },
];

export default function SocialAgentChat({
  activeMonitorId,
  activeMonitor,
  monitors,
  onFilterSentiment,
  onFilterPlatform,
  onFilterSponsored,
  onCompare,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset chat when monitor changes
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [activeMonitorId]);

  async function handleSend(prompt?: string) {
    const text = prompt || input.trim();
    if (!text || !activeMonitorId || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setExpanded(true);

    try {
      const res = await fetch("/api/social-listening-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          monitor_id: activeMonitorId,
          history: messages,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);

      // Handle action callbacks
      if (data.action) {
        handleAction(data.action);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `**Error:** ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleAction(action: { type: string; value: any }) {
    switch (action.type) {
      case "filter_sentiment":
        onFilterSentiment(action.value);
        break;
      case "filter_platform":
        onFilterPlatform(action.value);
        break;
      case "filter_sponsored":
        onFilterSponsored();
        break;
      case "compare":
        // Find another monitor to compare with
        const other = monitors.find((m) => m.id !== activeMonitorId);
        if (other) onCompare(other.brand_name);
        break;
    }
  }

  function handleClear() {
    setMessages([]);
    setExpanded(false);
  }

  const brandName = activeMonitor?.brand_name || "your brand";

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10 border-purple-200/50 dark:border-purple-800/30">
      {/* Input bar */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
        <Input
          placeholder={`Ask anything about ${brandName} mentions...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={loading}
          className="flex-1 bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800/50"
        />
        <Button
          size="sm"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" onClick={handleClear} className="text-gray-400 hover:text-gray-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Quick prompt chips — shown when no messages */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              onClick={() => handleSend(qp.prompt)}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-full bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Conversation history */}
      {expanded && messages.length > 0 && (
        <div ref={scrollRef} className="mt-4 max-h-96 overflow-y-auto space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 ml-8"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mr-4"
              }`}
            >
              {msg.role === "assistant" ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing mentions...
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
