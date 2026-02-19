import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { fetchCredits } from "@/lib/influencers-club";
import { useLists } from "@/contexts/ListContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useAuth } from "@/contexts/AuthContext";
import DemoWelcomeModal from "@/components/demo/DemoWelcomeModal";
import DemoTour from "@/components/demo/DemoTour";
import { Loader2, CreditCard, Users, ListChecks, Sparkles, Send, Eye, Mic, TrendingUp, Search, ClipboardList, Headphones, BarChart3, CalendarDays, Radio, Mail, Handshake } from "lucide-react";
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
  text: "Welcome back! I'm your MilCrunch assistant. Ask me about creators, events, podcasts, or analytics — or pick a quick action below.",
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

const QUICK_ACTIONS: { icon: typeof Search; label: string }[] = [
  { icon: Search,       label: "Find Creators" },
  { icon: ClipboardList, label: "Build a List" },
  { icon: Headphones,   label: "Browse Podcasts" },
  { icon: CalendarDays, label: "Plan an Event" },
  { icon: Radio,        label: "Go Live" },
  { icon: BarChart3,    label: "Sponsor ROI" },
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

/* ── Demo-specific data ──────────────────────────────────────── */

const DEMO_CHART_DATA = [
  { month: "Mar", value: 45000 },
  { month: "Apr", value: 52000 },
  { month: "May", value: 68000 },
  { month: "Jun", value: 74000 },
  { month: "Jul", value: 82000 },
  { month: "Aug", value: 95000 },
  { month: "Sep", value: 120000 },
  { month: "Oct", value: 145000 },
  { month: "Nov", value: 178000 },
  { month: "Dec", value: 165000 },
  { month: "Jan", value: 192000 },
  { month: "Feb", value: 210000 },
];

const DEMO_INSIGHTS_STATS = [
  { value: "1.4M", label: "Total Impressions", icon: Eye, color: "text-[#6C5CE7]" },
  { value: "450", label: "Community Members", icon: Users, color: "text-blue-600" },
  { value: "87", label: "Active Creators", icon: Mic, color: "text-green-600" },
  { value: "+127%", label: "YoY Growth", icon: TrendingUp, color: "text-teal-600" },
];

const DEMO_STAT_CARDS = [
  { label: "Total Events", value: "3", icon: CalendarDays, iconBg: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400" },
  { label: "Total Registrations", value: "15", icon: Users, iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
  { label: "Active Sponsors", value: "5", icon: Handshake, iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
  { label: "Email Campaigns", value: "3", icon: Mail, iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400" },
];

/* ── Component ────────────────────────────────────────────────── */

const BrandDashboard = () => {
  const [credits, setCredits] = useState<{ credits_remaining: number | null; credits_used: number | null; credits_total: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const { lists } = useLists();
  const { isDemo } = useDemoMode();
  const { user, creatorProfile } = useAuth();
  const [tourActive, setTourActive] = useState(false);

  // Dynamic welcome name — profile → metadata → demo fallback
  const firstName = (() => {
    const name =
      creatorProfile?.display_name ||
      (user?.user_metadata?.full_name as string | undefined) ||
      (isDemo ? "MilCrunch" : "");
    return name.split(" ")[0] || "there";
  })();

  // 365 Insights: demo uses curated data, others use static defaults
  const chartData = isDemo ? DEMO_CHART_DATA : INSIGHTS_CHART_DATA;
  const insightsStats = isDemo ? DEMO_INSIGHTS_STATS : INSIGHTS_STATS;

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Welcome back, {firstName}</h1>
        <p className="text-gray-500 dark:text-gray-400">Here's what's happening across your network today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {isDemo ? (
          DEMO_STAT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                </div>
                <p className="text-2xl font-bold text-[#000741] dark:text-white">{card.value}</p>
              </Card>
            );
          })
        ) : (
          <>
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
                  {credits?.credits_remaining != null ? (500 - Number(credits.credits_remaining)).toLocaleString() : "—"}
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
          </>
        )}
      </div>

      {/* AI Chat + Quick Actions */}
      <div className="mb-8">
        <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          {/* Chat input — prominent, full width */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-[#111827] focus-within:border-[#6C5CE7] focus-within:ring-2 focus-within:ring-[#6C5CE7]/20 transition-all">
            <Sparkles className="h-5 w-5 text-[#6C5CE7] shrink-0" />
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask me anything about creators, events, or campaigns..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 dark:text-white"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-full bg-[#6C5CE7] text-white hover:bg-[#5A4BD1] disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Chat messages — only shown when conversation exists */}
          {(messages.length > 0 || typing) && (
            <div className="max-h-[200px] overflow-y-auto mt-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      msg.role === "user"
                        ? "bg-[#6C5CE7] text-white rounded-2xl px-4 py-2 max-w-[70%] text-sm"
                        : "bg-gray-50 dark:bg-[#111827] text-gray-800 dark:text-gray-200 rounded-2xl px-4 py-2 max-w-[70%] text-sm"
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
                  <div className="bg-gray-50 dark:bg-[#111827] text-gray-800 rounded-2xl px-4 py-2 max-w-[70%] text-sm flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Quick Action Pills — 4x2 grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => sendMessage(action.label)}
                  className="flex items-center justify-center gap-2 py-3 px-3 bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-[#6C5CE7] hover:text-white hover:border-[#6C5CE7] transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 365 Insights Snapshot */}
      <div className="mb-8" data-tour="insights">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">365 Insights Snapshot</h2>

        {/* Mini stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {insightsStats.map((stat) => {
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
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
      {/* Demo tour */}
      <DemoWelcomeModal
        isDemo={isDemo}
        onStartTour={() => setTourActive(true)}
        onSkip={() => {}}
      />
      <DemoTour
        active={tourActive}
        onComplete={() => setTourActive(false)}
      />
    </>
  );
};

export default BrandDashboard;
