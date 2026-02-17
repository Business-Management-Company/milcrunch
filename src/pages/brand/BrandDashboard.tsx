import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { fetchCredits } from "@/lib/influencers-club";
import { useLists } from "@/contexts/ListContext";
import { Loader2, CreditCard, Users, ListChecks, Sparkles, Send, Eye, Mic, TrendingUp } from "lucide-react";
import { getChatResponse } from "@/lib/chat-responses";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── AI Chat response logic ───────────────────────────────────── */

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  cta?: { label: string; to: string };
  followUp?: string;
};

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  text: "Welcome back! I'm your RecurrentX assistant. Ask me about creators, events, podcasts, or analytics — or pick a quick action below.",
};

function getAssistantResponse(input: string): ChatMessage {
  const r = getChatResponse(input);
  return {
    role: "assistant",
    text: r.text,
    cta: r.cta ? { label: r.cta.label, to: r.cta.link } : undefined,
    followUp: r.followUp,
  };
}

/* ── Quick-action pills ───────────────────────────────────────── */

const QUICK_ACTIONS = [
  { emoji: "🔍", label: "Find Creators" },
  { emoji: "📋", label: "Build a List" },
  { emoji: "🎙️", label: "Podcasts" },
  { emoji: "📊", label: "Analytics" },
  { emoji: "🎤", label: "Keynote Speakers" },
  { emoji: "✅", label: "Verify Creator" },
  { emoji: "📅", label: "Events" },
  { emoji: "🏪", label: "SWAG Store" },
];

/* ── 365 Insights data ────────────────────────────────────────── */

const INSIGHTS_CHART_DATA = [
  { month: "Sep", value: 350000 },
  { month: "Oct", value: 520000 },
  { month: "Nov", value: 640000 },
  { month: "Dec", value: 600000 },
  { month: "Jan", value: 500000 },
  { month: "Feb", value: 380000 },
  { month: "Mar", value: 50000 },
  { month: "Apr", value: 60000 },
  { month: "May", value: 70000 },
  { month: "Jun", value: 80000 },
  { month: "Jul", value: 100000 },
  { month: "Aug", value: 120000 },
];

const INSIGHTS_STATS = [
  { value: "3.4M", label: "Total Impressions", icon: Eye, color: "text-[#6C5CE7]" },
  { value: "2,400", label: "Community Members", icon: Users, color: "text-blue-600" },
  { value: "1,467", label: "Active Creators", icon: Mic, color: "text-green-600" },
  { value: "+34%", label: "YoY Growth", icon: TrendingUp, color: "text-teal-600" },
];

/* ── Component ────────────────────────────────────────────────── */

const BrandDashboard = () => {
  const [credits, setCredits] = useState<{ credits_remaining: number | null; credits_used: number | null; credits_total: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const { lists } = useLists();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCredits().then((c) => { setCredits(c); setLoading(false); });
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const totalCreators = lists.reduce((sum, l) => sum + l.creators.length, 0);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setTyping(true);

    setTimeout(() => {
      setMessages((prev) => [...prev, getAssistantResponse(text)]);
      setTyping(false);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Brand Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Community and campaign stats at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Available</p>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <p className="text-2xl font-bold text-[#000741] dark:text-white">
              {credits?.credits_remaining != null ? Number(credits.credits_remaining).toLocaleString() : "—"}
            </p>
          )}
        </Card>
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Used</p>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <p className="text-2xl font-bold text-[#000741] dark:text-white">
              {credits?.credits_used != null ? Number(credits.credits_used).toLocaleString() : "—"}
            </p>
          )}
        </Card>
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ListChecks className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lists</p>
          </div>
          <p className="text-2xl font-bold text-[#000741] dark:text-white">{lists.length}</p>
        </Card>
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Creators in Lists</p>
          </div>
          <p className="text-2xl font-bold text-[#000741] dark:text-white">{totalCreators}</p>
        </Card>
      </div>

      {/* AI Chat */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Messages */}
          <div className="max-h-[250px] overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    msg.role === "user"
                      ? "bg-[#6C5CE7] text-white rounded-2xl px-4 py-2 max-w-[70%] text-sm"
                      : "bg-gray-50 text-gray-800 rounded-2xl px-4 py-2 max-w-[70%] text-sm"
                  }
                >
                  {msg.text}
                  {msg.cta && (
                    <Link
                      to={msg.cta.to}
                      className="block mt-2 bg-[#6C5CE7] text-white text-xs px-4 py-2 rounded-full hover:bg-[#5A4BD1] w-fit transition-colors"
                    >
                      {msg.cta.label}
                    </Link>
                  )}
                  {msg.followUp && (
                    <p className="text-xs text-gray-400 mt-2">{msg.followUp}</p>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-gray-50 text-gray-800 rounded-2xl px-4 py-2 max-w-[70%] text-sm flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex gap-2 items-center">
            <Sparkles className="h-5 w-5 text-[#6C5CE7] shrink-0" />
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-full bg-[#6C5CE7] text-white hover:bg-[#5A4BD1] disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Quick Action Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => sendMessage(action.label)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 text-center hover:border-[#6C5CE7] hover:text-[#6C5CE7] hover:bg-purple-50 cursor-pointer transition flex items-center justify-center gap-2"
            >
              <span>{action.emoji}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* 365 Insights Snapshot */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">365 Insights Snapshot</h2>

        {/* Mini stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {INSIGHTS_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 text-center"
              >
                <Icon className={`h-5 w-5 ${stat.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Mini chart */}
        <div className="bg-white dark:bg-[#1A1D27] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={INSIGHTS_CHART_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                  formatter={(val: number) => [val.toLocaleString(), "Impressions"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6C5CE7"
                  strokeWidth={2.5}
                  fill="url(#dashPurple)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <Link to="/brand/events" className="text-[#6C5CE7] text-sm font-medium hover:underline">
              View Full Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default BrandDashboard;
