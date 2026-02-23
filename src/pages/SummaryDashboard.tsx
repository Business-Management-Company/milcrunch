import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePresentationMode } from "@/hooks/usePresentationMode";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  BarChart3,
  Sparkles,
  ArrowRight,
  MapPin,
  Clock,
  Search,
  ListPlus,
  Mic,
  CheckCircle,
  Mail,
  Presentation,
  FolderOpen,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchDirectoriesWithCounts, type Directory } from "@/lib/directories";
import { classifyIntent, type ClassificationResult } from "@/lib/intent-classifier";
import { MarkdownResponse } from "@/components/MarkdownResponse";

/* ------------------------------------------------------------------ */
/* Quick-action card definitions                                       */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDateTime(): string {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} \u2022 ${time}`;
}

export default function SummaryDashboard() {
  const { user, effectiveUserId, creatorProfile } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [routing, setRouting] = useState(false);
  const [followUp, setFollowUp] = useState<{ question: string; originalQuery: string } | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiPanelRef = useRef<HTMLDivElement>(null);

  const pres = usePresentationMode();
  const firstName = pres.firstName;

  // Network stats — top 3 directories with member counts
  const [topDirectories, setTopDirectories] = useState<Directory[]>([]);

  // Upcoming events
  const [events, setEvents] = useState<
    { id: string; name: string; date_label: string; location: string }[]
  >([]);

  // Recent activity
  const [activity, setActivity] = useState<
    { label: string; time: string }[]
  >([]);

  useEffect(() => {
    // Top 3 directories with member counts
    fetchDirectoriesWithCounts().then((dirs) => {
      setTopDirectories(dirs.slice(0, 3));
    });

    // Upcoming events
    supabase
      .from("events")
      .select("id, title, start_date, city, state")
      .order("start_date", { ascending: true })
      .limit(3)
      .then(({ data, error }) => {
        if (error) {
          console.error("[SummaryDashboard] events query failed:", error.message);
        }
        if (data && data.length > 0) {
          setEvents(
            data.map((e) => {
              const row = e as Record<string, unknown>;
              const startDate = row.start_date as string | null;
              let dateLabel = "";
              if (startDate) {
                try { dateLabel = new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
                catch { dateLabel = startDate; }
              }
              return {
                id: row.id as string,
                name: (row.title as string) ?? "Event",
                date_label: dateLabel,
                location: [row.city, row.state].filter(Boolean).join(", "),
              };
            }),
          );
        } else {
          setEvents([
            { id: "1", name: "MilSpouseFest San Diego", date_label: "Mar 15", location: "San Diego, CA" },
            { id: "2", name: "MilCrunch at Fort Liberty", date_label: "Apr 5", location: "Fort Liberty, NC" },
            { id: "3", name: "MIC 2026", date_label: "Sep 15-17", location: "Washington, DC" },
          ]);
        }
      });

    // Recent activity — placeholder until we have an activity feed
    setActivity([
      { label: "Creator directory updated", time: "2 hours ago" },
      { label: "New list created: Q1 Outreach", time: "Yesterday" },
      { label: "3 creators added to Fitness list", time: "2 days ago" },
      { label: "Fort Liberty event created", time: "3 days ago" },
      { label: "Verification completed for @mattbest11x", time: "4 days ago" },
    ]);
  }, []);

  // Ask Claude AI for a conversational answer (shown inline)
  const askAI = useCallback(async (query: string) => {
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          temperature: 0.4,
          system: `You are the MilCrunch AI assistant — a military creator & event management platform. Answer the user's question helpfully and concisely. Use markdown formatting (bold, bullets, etc.) for readability. If the question relates to a specific feature, mention how to access it in MilCrunch (e.g. "Head to **Discover** to search creators"). Keep answers under 200 words.`,
          messages: [{ role: "user", content: query }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "Sorry, I couldn't generate a response.";
      setAiResponse(text);
      // Scroll panel into view
      setTimeout(() => aiPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch {
      setAiResponse("Something went wrong. Please try again or use the quick actions below.");
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Route based on classification result
  const executeIntent = useCallback((result: ClassificationResult, query: string) => {
    switch (result.intent) {
      case "FIND_CREATORS": {
        const params = new URLSearchParams();
        const f = result.filters;
        if (f?.keyword) params.set("q", f.keyword);
        if (f?.platform) params.set("platform", f.platform);
        if (f?.min_followers) params.set("min_followers", String(f.min_followers));
        if (f?.max_followers) params.set("max_followers", String(f.max_followers));
        if (f?.min_engagement) params.set("min_engagement", String(f.min_engagement));
        if (f?.branch) params.set("branch", f.branch);
        if (f?.category) params.set("category", f.category);
        // If no keyword was extracted, use the raw query
        if (!f?.keyword) params.set("q", query);
        navigate(`/brand/discover?${params.toString()}`);
        break;
      }
      case "BUILD_LIST":
        navigate("/brand/lists/new");
        break;
      case "MANAGE_EVENT":
        navigate("/brand/events");
        break;
      case "RUN_CAMPAIGN":
        navigate("/brand/campaigns");
        break;
      case "VERIFY_CREATOR":
        navigate("/brand/verification");
        break;
      case "UNCLEAR":
      default:
        askAI(query);
        break;
    }
  }, [navigate, askAI]);

  // AI-powered command router
  const handleSubmit = useCallback(async () => {
    const q = prompt.trim();
    if (!q || routing) return;
    setRouting(true);
    setFollowUp(null);

    try {
      const result = await classifyIntent(q);

      // If the AI wants a follow-up question, show it inline
      if (result.followUp) {
        setFollowUp({ question: result.followUp, originalQuery: q });
        setPrompt("");
        return;
      }

      setPrompt("");
      executeIntent(result, q);
    } catch {
      // Fallback: show AI response panel on error
      setPrompt("");
      askAI(q);
    } finally {
      setRouting(false);
    }
  }, [prompt, routing, executeIntent, askAI]);

  // Handle follow-up answer submission
  const handleFollowUpSubmit = useCallback(async () => {
    if (!followUp || !followUpAnswer.trim() || routing) return;
    setRouting(true);

    try {
      const combined = `${followUp.originalQuery} — ${followUpAnswer.trim()}`;
      const result = await classifyIntent(combined);
      setFollowUp(null);
      setFollowUpAnswer("");
      setPrompt("");
      executeIntent(result, combined);
    } catch {
      setFollowUp(null);
      setFollowUpAnswer("");
      askAI(followUp.originalQuery);
    } finally {
      setRouting(false);
    }
  }, [followUp, followUpAnswer, routing, executeIntent, askAI]);

  return (
    <div className="space-y-10 max-w-5xl mx-auto -m-6 p-6 min-h-full bg-[#F8F9FA] dark:bg-transparent rounded-xl">
      {/* Centered heading */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2.5 mb-2">
          <Sparkles className="h-7 w-7 text-[#1e3a5f]" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#000741] dark:text-white tracking-tight">
            {getGreeting()}, <span className="text-amber-400">{firstName}</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{formatDateTime()}</p>
      </div>

      {/* Large chat-style input card */}
      <div className="max-w-3xl mx-auto">
        <div className={cn(
          "rounded-2xl border bg-white dark:bg-[#1A1D27] transition-all",
          prompt.trim() || followUp
            ? "border-[#1e3a5f] shadow-[0_0_20px_rgba(30,58,95,0.15)]"
            : "border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg",
        )}>
          <textarea
            placeholder="Describe what you need — find creators, plan an event, build a list..."
            className="w-full min-h-[80px] px-6 pt-5 pb-2 text-base bg-transparent outline-none resize-none placeholder:text-gray-400 dark:text-white"
            rows={2}
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); if (followUp) setFollowUp(null); if (aiResponse) setAiResponse(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={routing}
          />
          <div className="flex items-center justify-between px-6 pb-4">
            <div className="flex items-center gap-2">
              {routing ? (
                <span className="flex items-center gap-1.5 text-xs text-[#1e3a5f] font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Understanding your request...
                </span>
              ) : (
                <Sparkles className="h-5 w-5 text-[#1e3a5f]/40" />
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!prompt.trim() || routing}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                prompt.trim() && !routing
                  ? "bg-[#1e3a5f] text-white hover:bg-[#2d5282] shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed",
              )}
            >
              {routing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Get started
            </button>
          </div>

          {/* Inline follow-up question */}
          {followUp && (
            <div className="px-6 pb-4 border-t border-[#1e3a5f]/10">
              <div className="flex items-center gap-2 pt-3 pb-2">
                <MessageCircle className="h-4 w-4 text-[#1e3a5f] shrink-0" />
                <p className="text-sm font-medium text-[#1e3a5f]">{followUp.question}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFollowUpSubmit();
                    }
                  }}
                  placeholder="Type your answer..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                  autoFocus
                  disabled={routing}
                />
                <button
                  type="button"
                  onClick={handleFollowUpSubmit}
                  disabled={!followUpAnswer.trim() || routing}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    followUpAnswer.trim() && !routing
                      ? "bg-[#1e3a5f] text-white hover:bg-[#2d5282]"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed",
                  )}
                >
                  {routing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Go"}
                </button>
                <button
                  type="button"
                  onClick={() => { setFollowUp(null); setFollowUpAnswer(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Response Panel */}
      {(aiLoading || aiResponse) && (
        <div ref={aiPanelRef} className="max-w-3xl mx-auto -mt-4">
          <div className="rounded-2xl border border-[#1e3a5f]/20 bg-white dark:bg-[#1A1D27] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#1e3a5f]/10 to-transparent border-b border-[#1e3a5f]/10">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-[#1e3a5f]/15">
                  <Sparkles className="h-4 w-4 text-[#1e3a5f]" />
                </span>
                <span className="text-sm font-semibold text-[#000741] dark:text-white">
                  MilCrunch AI
                </span>
              </div>
              {!aiLoading && (
                <button
                  type="button"
                  onClick={() => setAiResponse("")}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="px-5 py-4">
              {aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-[#1e3a5f]" />
                  Thinking...
                </div>
              ) : (
                <MarkdownResponse content={aiResponse} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Pills — flowing layout */}
      <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto">
        {[
          { icon: Search, label: "Find Creators", color: "#1e3a5f", prompt: "I want to find creators. What branch of service, follower range, or niche are you looking for? (e.g. Army veterans, 10K+ followers, fitness niche)" },
          { icon: ListPlus, label: "Build a List", color: "#0EA5E9", prompt: "Let's build a list! First, what would you like to name it?" },
          { icon: Mic, label: "Browse Podcasts", color: "#F59E0B", prompt: "Looking for military podcasts? I can filter by topic, branch, or episode count. What are you looking for?" },
          { icon: BarChart3, label: "Event Analytics", color: "#22C55E", prompt: "Which event would you like analytics for?" },
          { icon: Presentation, label: "Find Speakers", color: "#EC4899", prompt: "Let's find speakers for your event. What type of event, and do you have a preferred branch, topic, or follower minimum?" },
          { icon: CheckCircle, label: "Verify Creator", color: "#14B8A6", prompt: "Who would you like to verify? Type their name or Instagram handle and I'll check if they're already in the system." },
          { icon: Calendar, label: "Manage Events", color: "#0EA5E9", prompt: "Show me all upcoming events with their dates and locations." },
          { icon: Mail, label: "Email Campaigns", color: "#F43F5E", prompt: "Would you like to create a new email campaign or view existing ones?" },
        ].map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { message: pill.prompt } }))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-100 dark:border-gray-700 bg-white dark:bg-[#1A1D27] shadow-sm text-sm font-medium text-[#000741] dark:text-gray-200 hover:shadow-md transition-all"
            style={{ "--tw-border-opacity": 1 } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = pill.color;
              e.currentTarget.style.backgroundColor = `${pill.color}08`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.backgroundColor = "";
            }}
          >
            <pill.icon className="h-4 w-4" style={{ color: pill.color }} />
            {pill.label}
          </button>
        ))}
      </div>

      {/* Three-column section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden shadow-sm border-l-4 border-l-blue-500">
          <div className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f]/10 to-[#1e3a5f]/5 border-b border-[#1e3a5f]/10">
            <h2 className="font-bold text-[#000741] dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#1e3a5f]/15">
                <Clock className="h-4 w-4 text-[#1e3a5f]" />
              </span>
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {activity.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f] mt-2 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#000741] dark:text-white truncate">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden shadow-sm border-l-4 border-l-amber-500">
          <div className="px-6 py-3 bg-gradient-to-r from-[#0EA5E9]/10 to-[#0EA5E9]/5 border-b border-[#0EA5E9]/10">
            <h2 className="font-bold text-[#000741] dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#0EA5E9]/15">
                <Calendar className="h-4 w-4 text-[#0EA5E9]" />
              </span>
              Upcoming Events
            </h2>
          </div>
          <div className="p-6">
            {events.length > 0 ? (
              <ul className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start gap-3">
                    <span className="shrink-0 rounded-md bg-[#0EA5E9]/10 text-[#0EA5E9] text-xs font-semibold px-2 py-1">
                      {event.date_label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#000741] dark:text-white truncate">
                        {event.name}
                      </p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No upcoming events</p>
                <Link
                  to="/brand/events/create"
                  className="text-sm text-[#0EA5E9] hover:underline font-medium mt-1 inline-block"
                >
                  Create one →
                </Link>
              </div>
            )}
            <Link
              to="/events"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#0EA5E9] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Network Stats — Top Directories */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden shadow-sm border-l-4 border-l-green-500">
          <div className="px-6 py-3 bg-gradient-to-r from-[#22C55E]/10 to-[#22C55E]/5 border-b border-[#22C55E]/10">
            <h2 className="font-bold text-[#000741] dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#22C55E]/15">
                <FolderOpen className="h-4 w-4 text-[#22C55E]" />
              </span>
              Directories
            </h2>
          </div>
          <div className="p-6">
            {topDirectories.length > 0 ? (
              <ul className="space-y-3">
                {topDirectories.map((dir, i) => (
                  <li key={dir.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#000741] dark:text-white truncate">
                        {dir.name}
                      </span>
                      <span className="shrink-0 ml-2 text-sm font-bold text-[#22C55E]">
                        {dir.member_count ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dir.member_count === 1 ? "1 creator" : `${dir.member_count ?? 0} creators`}
                    </p>
                    {i < topDirectories.length - 1 && (
                      <div className="h-px bg-gray-100 dark:bg-gray-800 mt-3" />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No directories yet</p>
            )}
            <Link
              to="/brand/directories"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#22C55E] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
