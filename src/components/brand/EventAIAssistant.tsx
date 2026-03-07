import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Send, Trash2, ArrowRight, MapPin, AlertTriangle, CalendarPlus } from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { AICTAButtons } from "@/components/ui/ai-cta-buttons";
import { getAgentContext } from "@/lib/ai-agent-context";
import { supabase } from "@/integrations/supabase/client";

/* ---------- types ---------- */
interface Props {
  eventTitle: string;
  eventDescription: string | null;
  eventType: string | null;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  capacity: number | null;
  status: string;
  sponsors: { sponsor_name: string; tier: string | null }[];
  speakers: { creator_name: string; role: string | null; confirmed: boolean }[];
  tickets: { name: string; price: number; quantity: number; sold: number }[];
  registrationCount: number;
  agendaSessionCount: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

/* ---------- Anthropic helper (multi-turn) ---------- */
async function callAnthropic(
  system: string,
  messages: { role: string; content: string }[],
  maxTokens = 4096,
): Promise<string> {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

/* ---------- smart CTA detection ---------- */
interface SmartCTA {
  label: string;
  icon: typeof ArrowRight;
  action: "link" | "draft";
  path?: string;
  draftTitle?: string;
  draftLocation?: string;
}

function detectCTAs(text: string): SmartCTA[] {
  const lower = text.toLowerCase();
  const ctas: SmartCTA[] = [];

  if (/conflict|competing event|schedule clash|date overlap/i.test(lower)) {
    ctas.push({
      label: "Check Conflicts & Collabs",
      icon: AlertTriangle,
      action: "link",
      path: "/brand/conflicts-collabs",
    });
  }

  if (/\bvenue\b|location|space|facility|auditorium|conference center/i.test(lower)) {
    ctas.push({
      label: "Find a Venue",
      icon: MapPin,
      action: "link",
      path: "/brand/venues",
    });
  }

  // Detect event idea: look for a quoted title or "**Title**" pattern with a location hint
  const titleMatch = text.match(/\*\*([A-Z][^*]{4,60})\*\*/);
  const locationMatch = text.match(/(?:in|at|@)\s+([A-Z][A-Za-z\s,]{3,40})/);
  if (titleMatch) {
    ctas.push({
      label: "Save as Draft Event",
      icon: CalendarPlus,
      action: "draft",
      draftTitle: titleMatch[1].trim(),
      draftLocation: locationMatch?.[1]?.trim() ?? undefined,
    });
  }

  return ctas;
}

/* ---------- quick prompts ---------- */
const QUICK_PROMPTS = [
  "How full is this event?",
  "What should I focus on?",
  "Write a sponsor outreach email",
  "Generate a day-of checklist",
  "What's my revenue looking like?",
];

/* ======================================== */
export default function EventAIAssistant({
  eventTitle, eventDescription, eventType,
  startDate, endDate, venue, city, state, capacity, status,
  sponsors, speakers, tickets, registrationCount, agendaSessionCount,
}: Props) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  /* ---- Build system prompt from event context ---- */
  const location = [venue, city, state].filter(Boolean).join(", ") || "TBD";
  const fillRate = capacity && capacity > 0 ? Math.round((registrationCount / capacity) * 100) : null;
  const daysUntil = startDate ? differenceInDays(parseISO(startDate), new Date()) : null;

  const confirmedSpeakers = speakers.filter((s) => s.confirmed).length;
  const sponsorTiers = sponsors.reduce<Record<string, number>>((acc, s) => {
    const t = s.tier || "unspecified";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = tickets.reduce((sum, t) => sum + t.sold * t.price, 0);
  const totalSold = tickets.reduce((sum, t) => sum + t.sold, 0);
  const totalAvailable = tickets.reduce((sum, t) => sum + t.quantity, 0);

  // Build system prompt with shared context (fetched once and cached per render cycle)
  const [platformContext, setPlatformContext] = useState("");
  useEffect(() => {
    getAgentContext().then(setPlatformContext);
  }, []);

  const systemPrompt = `You are an expert event planning assistant for MilCrunch, a military creator & experience platform. You have FULL access to all platform data AND full context about this specific event. Answer with specific numbers and names — NEVER say "I don't have access."

THIS EVENT:
- Name: ${eventTitle}
- Type: ${eventType || "General"}
- Status: ${status}
- Dates: ${startDate || "TBD"}${endDate && endDate !== startDate ? ` to ${endDate}` : ""}
- Location: ${location}
- Capacity: ${capacity ?? "TBD"}
- Registrations: ${registrationCount}${fillRate !== null ? ` (${fillRate}% fill rate)` : ""}
${daysUntil !== null ? `- Days until event: ${daysUntil}${daysUntil < 0 ? " (past)" : ""}` : ""}

SPEAKERS (${speakers.length} total, ${confirmedSpeakers} confirmed):
${speakers.length > 0 ? speakers.map((s) => `- ${s.creator_name}${s.role ? ` (${s.role})` : ""} — ${s.confirmed ? "confirmed" : "unconfirmed"}`).join("\n") : "- None yet"}

SPONSORS (${sponsors.length} total):
${sponsors.length > 0 ? Object.entries(sponsorTiers).map(([tier, count]) => `- ${tier}: ${count}`).join("\n") : "- None yet"}

TICKETS (${totalSold} sold / ${totalAvailable} available, $${totalRevenue.toLocaleString()} revenue):
${tickets.length > 0 ? tickets.map((t) => `- ${t.name}: $${t.price} × ${t.sold}/${t.quantity} sold ($${(t.sold * t.price).toLocaleString()})`).join("\n") : "- None configured"}

AGENDA: ${agendaSessionCount} session${agendaSessionCount !== 1 ? "s" : ""} scheduled

${eventDescription ? `DESCRIPTION: ${eventDescription}` : ""}

${platformContext ? `\n--- PLATFORM-WIDE DATA ---\n${platformContext}` : ""}

Keep answers concise but thorough. Use markdown formatting (bold, bullets, headers) for readability. Focus on military/veteran community best practices. Always answer first, then offer to go deeper.`;

  /* ---- Send message ---- */
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const reply = await callAnthropic(
        systemPrompt,
        nextMessages.map((m) => ({ role: m.role, content: m.content })),
      );
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("[EventAI] Error:", e);
      setError("Failed to get a response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSaveDraft = async (title: string, locationStr?: string) => {
    setSavingDraft(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + `-${Date.now()}`;
      const { data: user } = await supabase.auth.getUser();
      const payload: Record<string, unknown> = {
        title,
        slug,
        is_published: false,
        created_by: user?.user?.id ?? null,
      };
      if (locationStr) payload.venue = locationStr;
      const { data: event, error: err } = await supabase
        .from("events")
        .insert(payload)
        .select("id")
        .single();
      if (err) throw err;
      navigate(`/brand/events/${event.id}`);
    } catch (e) {
      console.error("[EventAI] Draft save failed:", e);
      setError("Failed to create draft event.");
    } finally {
      setSavingDraft(false);
    }
  };

  /* ======================================== */
  return (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" /> Event AI Assistant
        </h3>
        {messages.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setMessages([]); setError(null); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Clear
          </Button>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-full border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Conversation area */}
      {(messages.length > 0 || loading) && (
        <div ref={scrollRef} className="max-h-[520px] overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 text-sm text-gray-800 dark:text-gray-200">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-start gap-2">
                <div className="max-w-[90%] rounded-xl px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <MarkdownRenderer content={m.content} />
                  <AICTAButtons text={m.content} />
                </div>
                {/* Smart CTAs */}
                {(() => {
                  const ctas = detectCTAs(m.content);
                  if (ctas.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1.5 ml-1">
                      {ctas.map((cta) => (
                        <button
                          key={cta.label}
                          type="button"
                          disabled={savingDraft}
                          onClick={() => {
                            if (cta.action === "link" && cta.path) {
                              navigate(cta.path);
                            } else if (cta.action === "draft" && cta.draftTitle) {
                              handleSaveDraft(cta.draftTitle, cta.draftLocation);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-50"
                        >
                          {savingDraft && cta.action === "draft" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <cta.icon className="h-3 w-3" />
                          )}
                          {cta.label}
                          {cta.action === "link" && <ArrowRight className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ),
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                {error}
                <button
                  onClick={() => {
                    const lastUser = [...messages].reverse().find((m) => m.role === "user");
                    if (lastUser) {
                      // Remove the last user message and resend
                      setMessages(messages.slice(0, -1));
                      setError(null);
                      sendMessage(lastUser.content);
                    }
                  }}
                  className="ml-2 underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your event..."
          className="min-h-[42px] max-h-[120px] resize-none text-sm"
          rows={1}
          disabled={loading}
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="shrink-0 bg-[#1e3a5f] hover:bg-[#2d5282] text-white h-[42px] w-[42px]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
