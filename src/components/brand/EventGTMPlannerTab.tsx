import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ShieldAlert, CalendarCheck, Copy, Printer, Sparkles, Search,
  AlertTriangle, CheckCircle2, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { scrapeFirecrawl } from "@/lib/verification";
import { format, parseISO, isWithinInterval, addDays, subDays } from "date-fns";

/* ---------- types ---------- */
interface Props {
  eventId: string;
  eventTitle: string;
  eventDescription: string | null;
  eventType: string | null;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  capacity: number | null;
  speakerCount: number;
  sponsorCount: number;
  registrationCount: number;
}

interface HolidayConflict {
  name: string;
  date: Date;
  proximity: "same-day" | "within-3-days";
}

interface CompetingEvent {
  name: string;
  date: string;
  location: string;
  url: string;
  severity: "high" | "medium" | "low";
}

interface ConflictResults {
  holidays: HolidayConflict[];
  competing: CompetingEvent[];
  firecrawlFailed: boolean;
}

/* ---------- holidays ---------- */
function getHolidays(year: number): { name: string; date: Date }[] {
  // Fixed-date holidays
  const fixed = [
    { name: "New Year's Day", month: 0, day: 1 },
    { name: "Independence Day", month: 6, day: 4 },
    { name: "Veterans Day", month: 10, day: 11 },
    { name: "Christmas Day", month: 11, day: 25 },
    { name: "Armed Forces Day", month: 4, day: 17 }, // 3rd Saturday of May (approx)
    { name: "Flag Day", month: 5, day: 14 },
    { name: "Patriot Day (9/11)", month: 8, day: 11 },
    { name: "Pearl Harbor Remembrance Day", month: 11, day: 7 },
    { name: "National Guard Birthday", month: 11, day: 13 },
  ];

  // Nth-weekday holidays
  const nthWeekday = (m: number, weekday: number, n: number): Date => {
    const first = new Date(year, m, 1);
    let day = 1 + ((weekday - first.getDay() + 7) % 7);
    day += (n - 1) * 7;
    return new Date(year, m, day);
  };
  const lastMonday = (m: number): Date => {
    const last = new Date(year, m + 1, 0);
    const diff = (last.getDay() - 1 + 7) % 7;
    return new Date(year, m, last.getDate() - diff);
  };

  return [
    ...fixed.map((h) => ({ name: h.name, date: new Date(year, h.month, h.day) })),
    { name: "Martin Luther King Jr. Day", date: nthWeekday(0, 1, 3) },
    { name: "Presidents' Day", date: nthWeekday(1, 1, 3) },
    { name: "Memorial Day", date: lastMonday(4) },
    { name: "Labor Day", date: nthWeekday(8, 1, 1) },
    { name: "Columbus Day", date: nthWeekday(9, 1, 2) },
    { name: "Thanksgiving", date: nthWeekday(10, 4, 4) },
  ];
}

function findHolidayConflicts(startDate: string | null, endDate: string | null): HolidayConflict[] {
  if (!startDate) return [];
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : start;
  const years = new Set([start.getFullYear(), end.getFullYear()]);
  const conflicts: HolidayConflict[] = [];

  for (const y of years) {
    for (const h of getHolidays(y)) {
      const eventInterval = { start: subDays(start, 0), end: addDays(end, 0) };
      if (isWithinInterval(h.date, eventInterval)) {
        conflicts.push({ name: h.name, date: h.date, proximity: "same-day" });
      } else {
        const nearInterval = { start: subDays(start, 3), end: addDays(end, 3) };
        if (isWithinInterval(h.date, nearInterval)) {
          conflicts.push({ name: h.name, date: h.date, proximity: "within-3-days" });
        }
      }
    }
  }
  return conflicts;
}

/* ---------- Anthropic helper ---------- */
async function callAnthropic(system: string, userMessage: string, maxTokens = 4096): Promise<string> {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

/* ---------- simple markdown renderer ---------- */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700 dark:text-gray-300">
          {listItems.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />)}
        </ul>
      );
      listItems = [];
    }
  };

  const inlineFmt = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*(.+?)\*/g, "<em>$1</em>")
     .replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">$1</code>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = (line.match(/^#+/) || [""])[0].length;
      const text = line.replace(/^#+\s*/, "");
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      const cls = level === 1
        ? "text-lg font-bold mt-5 mb-2 text-gray-900 dark:text-white"
        : level === 2
        ? "text-base font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-100"
        : "text-sm font-semibold mt-3 mb-1 text-gray-700 dark:text-gray-200";
      elements.push(<Tag key={i} className={cls} dangerouslySetInnerHTML={{ __html: inlineFmt(text) }} />);
    } else if (/^[-*]\s/.test(line)) {
      listItems.push(line.replace(/^[-*]\s*/, ""));
    } else if (/^\d+\.\s/.test(line)) {
      listItems.push(line.replace(/^\d+\.\s*/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mb-2" dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />
      );
    }
  }
  flushList();
  return elements;
}

/* ======================================== */
export default function EventGTMPlannerTab({
  eventTitle,
  eventDescription,
  eventType,
  startDate,
  endDate,
  venue,
  city,
  state,
  capacity,
  speakerCount,
  sponsorCount,
  registrationCount,
}: Props) {
  /* Conflict Scanner */
  const [scanning, setScanning] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResults | null>(null);

  /* GTM Strategy */
  const [generatingGTM, setGeneratingGTM] = useState(false);
  const [gtmPlan, setGtmPlan] = useState<string | null>(null);

  /* Supervisor Summary */
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const location = [city, state].filter(Boolean).join(", ");
  const dateRange = startDate
    ? endDate && endDate !== startDate
      ? `${format(parseISO(startDate), "MMM d, yyyy")} – ${format(parseISO(endDate), "MMM d, yyyy")}`
      : format(parseISO(startDate), "MMM d, yyyy")
    : "TBD";

  /* ---- Conflict Scanner ---- */
  const runConflictScan = async () => {
    setScanning(true);
    setConflicts(null);
    try {
      const holidays = findHolidayConflicts(startDate, endDate);
      let competing: CompetingEvent[] = [];
      let firecrawlFailed = false;

      // Try Eventbrite scrape
      if (city || state) {
        const loc = encodeURIComponent(location || "united-states");
        const keywords = encodeURIComponent(eventType || "military veteran");
        const dateParam = startDate ? `&start_date=${startDate}` : "";
        const url = `https://www.eventbrite.com/d/${loc}/${keywords}/${dateParam}`;
        try {
          const scraped = await scrapeFirecrawl(url);
          if (scraped?.markdown) {
            // Use AI to extract structured events from markdown
            const parsed = await callAnthropic(
              "You extract structured event data from Eventbrite search result markdown. Return ONLY a valid JSON array.",
              `Extract competing events from this Eventbrite search page markdown. For each event found, return: name, date, location, url, severity (high if same date and nearby location, medium if same week, low otherwise). Our event: "${eventTitle}" on ${dateRange} in ${location}.\n\nMarkdown:\n${scraped.markdown.slice(0, 6000)}\n\nReturn a JSON array like: [{"name":"...","date":"...","location":"...","url":"...","severity":"high|medium|low"}]. If no events found, return [].`,
              2048
            );
            try {
              const jsonStr = parsed.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
              competing = JSON.parse(jsonStr);
            } catch { competing = []; }
          }
        } catch (e) {
          console.warn("[GTM] Firecrawl scrape failed:", e);
          firecrawlFailed = true;
        }
      }

      setConflicts({ holidays, competing, firecrawlFailed });
      if (holidays.length === 0 && competing.length === 0) {
        toast.success("No conflicts detected!");
      } else {
        toast.info(`Found ${holidays.length + competing.length} potential conflict(s)`);
      }
    } catch (e) {
      console.error("[GTM] Conflict scan error:", e);
      toast.error("Conflict scan failed");
    } finally {
      setScanning(false);
    }
  };

  /* ---- GTM Strategy ---- */
  const generateGTM = async () => {
    setGeneratingGTM(true);
    setGtmPlan(null);
    try {
      const conflictContext = conflicts
        ? `\n\nKnown scheduling conflicts:\n${
            conflicts.holidays.map((h) => `- Holiday: ${h.name} (${format(h.date, "MMM d, yyyy")}, ${h.proximity})`).join("\n")
          }${
            conflicts.competing.length > 0
              ? "\n" + conflicts.competing.map((c) => `- Competing event: ${c.name} on ${c.date} in ${c.location} (${c.severity} severity)`).join("\n")
              : ""
          }`
        : "";

      const plan = await callAnthropic(
        `You are a Go-To-Market strategist specializing in military and veteran community events. You create detailed, actionable GTM plans tuned for military/veteran audiences — referencing VSOs (Veterans Service Organizations), base MWR offices, mil-specific media outlets, military influencer networks, and DoD community channels.`,
        `Create a comprehensive Go-To-Market plan for this event:

**Event:** ${eventTitle}
**Type:** ${eventType || "General"}
**Date:** ${dateRange}
**Location:** ${venue ? `${venue}, ` : ""}${location || "TBD"}
**Capacity:** ${capacity || "TBD"}
**Description:** ${eventDescription || "N/A"}

Current status:
- ${speakerCount} speaker(s) confirmed
- ${sponsorCount} sponsor(s) secured
- ${registrationCount} registration(s) received
${conflictContext}

Structure the plan with these 10 sections:
1. **Executive Summary** — 2-3 sentence overview of the GTM approach
2. **Target Segments** — Primary and secondary audience segments with estimated reach
3. **Timeline** — Week-by-week marketing timeline leading up to the event
4. **Channels** — Specific marketing channels ranked by expected ROI (include mil-specific channels)
5. **Content Strategy** — Content calendar with specific post types, themes, and messaging
6. **Partnerships** — VSOs, base MWR offices, mil influencers, and organizations to partner with
7. **Registration Tactics** — Strategies to drive registrations (early bird, group discounts, unit referrals)
8. **Risk Mitigation** — Potential risks and contingency plans (including any detected conflicts)
9. **Budget Allocation** — Suggested budget breakdown by channel (percentages)
10. **KPIs & Success Metrics** — Measurable targets for each phase

Be specific, actionable, and realistic. Reference actual military/veteran organizations and channels where appropriate.`,
        4096
      );
      setGtmPlan(plan);
      toast.success("GTM plan generated");
    } catch (e) {
      console.error("[GTM] Strategy generation error:", e);
      toast.error("Failed to generate GTM plan");
    } finally {
      setGeneratingGTM(false);
    }
  };

  /* ---- Supervisor Summary ---- */
  const generateSummary = async () => {
    setGeneratingSummary(true);
    setSummary(null);
    try {
      const brief = await callAnthropic(
        `You write military-style executive briefings. Use clear, concise language. Structure information for rapid consumption by senior leadership. Use the standard military briefing format.`,
        `Generate a supervisor-ready executive summary for this event:

**Event:** ${eventTitle}
**Type:** ${eventType || "General"}
**Date:** ${dateRange}
**Location:** ${venue ? `${venue}, ` : ""}${location || "TBD"}
**Capacity:** ${capacity || "TBD"}
**Description:** ${eventDescription || "N/A"}

Current readiness metrics:
- Speakers confirmed: ${speakerCount}
- Sponsors secured: ${sponsorCount}
- Registrations received: ${registrationCount}
- Capacity utilization: ${capacity ? `${Math.round((registrationCount / capacity) * 100)}%` : "N/A"}

Format as a military-style executive brief with these sections:
1. **BLUF (Bottom Line Up Front)** — One sentence summary of event readiness
2. **Overview** — Event purpose, scope, and target audience (3-4 sentences)
3. **Readiness Assessment** — Current status across key areas (speakers, sponsors, registrations, logistics)
4. **Risk Assessment** — Top 3 risks with likelihood and impact ratings (High/Medium/Low)
5. **Key Decisions Needed** — Action items requiring leadership approval
6. **Resource Requirements** — Outstanding needs (budget, personnel, equipment)
7. **Recommendation** — Clear recommendation with next steps and timeline

Keep it concise — this should fit on one printed page. Use bullet points where appropriate.`,
        2048
      );
      setSummary(brief);
      toast.success("Executive summary generated");
    } catch (e) {
      console.error("[GTM] Summary generation error:", e);
      toast.error("Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const printSummary = () => {
    const el = summaryRef.current;
    if (!el) return;
    const printWin = window.open("", "_blank");
    if (!printWin) { toast.error("Popup blocked — allow popups to print"); return; }
    printWin.document.write(`<!DOCTYPE html><html><head><title>${eventTitle} — Executive Summary</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #111; font-size: 13px; line-height: 1.5; }
        h2 { font-size: 16px; margin-top: 20px; margin-bottom: 6px; }
        h3 { font-size: 14px; margin-top: 16px; margin-bottom: 4px; }
        h4 { font-size: 13px; margin-top: 12px; margin-bottom: 4px; }
        ul { margin: 4px 0; padding-left: 20px; }
        li { margin-bottom: 2px; }
        p { margin: 4px 0; }
        strong { font-weight: 600; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 18px; margin: 0; }
        .header p { font-size: 12px; color: #555; margin: 2px 0 0; }
        .classification { text-align: center; font-size: 11px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
      </style></head><body>
      <div class="classification">For Official Use Only</div>
      <div class="header"><h1>${eventTitle}</h1><p>Executive Summary — ${dateRange}</p><p>Generated ${format(new Date(), "dd MMM yyyy HHmm")}</p></div>
      ${el.innerHTML}
      </body></html>`);
    printWin.document.close();
    printWin.print();
  };

  /* ======================================== */
  return (
    <div className="space-y-6">
      {/* Section A — Conflict Scanner */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" /> Conflict Scanner
          </h3>
          <Button size="sm" onClick={runConflictScan} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
            {scanning ? "Scanning…" : "Scan for Conflicts"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Check for US holidays, military observance dates, and competing events near your event dates.
        </p>

        {conflicts && (
          <div className="space-y-3">
            {/* Holiday conflicts */}
            {conflicts.holidays.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Holiday / Observance Conflicts</p>
                {conflicts.holidays.map((h, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      h.proximity === "same-day"
                        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                        : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                    }`}
                  >
                    {h.proximity === "same-day" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    ) : (
                      <CalendarCheck className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{h.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(h.date, "MMM d, yyyy")}
                      </span>
                    </div>
                    <Badge variant={h.proximity === "same-day" ? "destructive" : "secondary"} className="text-xs shrink-0">
                      {h.proximity === "same-day" ? "Same day" : "Within 3 days"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Competing events */}
            {conflicts.competing.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Competing Events</p>
                {conflicts.competing.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      c.severity === "high"
                        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                        : c.severity === "medium"
                        ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                        : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                    }`}
                  >
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${
                      c.severity === "high" ? "text-red-500" : c.severity === "medium" ? "text-yellow-500" : "text-green-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{c.date} · {c.location}</span>
                    </div>
                    <Badge
                      variant={c.severity === "high" ? "destructive" : "secondary"}
                      className={`text-xs shrink-0 ${c.severity === "low" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
                    >
                      {c.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* No conflicts */}
            {conflicts.holidays.length === 0 && conflicts.competing.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">No scheduling conflicts detected</span>
              </div>
            )}

            {/* Firecrawl fallback note */}
            {conflicts.firecrawlFailed && (
              <p className="text-xs text-muted-foreground italic">
                Note: Competing event search was unavailable. Only holiday/observance conflicts are shown.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Section B — AI GTM Strategy */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" /> AI GTM Strategy
          </h3>
          <div className="flex gap-2">
            {gtmPlan && (
              <Button size="sm" variant="outline" onClick={() => copyText(gtmPlan, "GTM plan")}>
                <Copy className="h-4 w-4 mr-1.5" /> Copy
              </Button>
            )}
            <Button size="sm" onClick={generateGTM} disabled={generatingGTM}>
              {generatingGTM ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {generatingGTM ? "Generating…" : "Generate GTM Plan"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate an AI-powered Go-To-Market strategy tailored for military/veteran audiences.
          {conflicts ? " Detected conflicts will be factored into risk mitigation." : " Run the conflict scanner first for best results."}
        </p>

        {gtmPlan && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gray-50/50 dark:bg-gray-900/30 max-h-[600px] overflow-y-auto">
            {renderMarkdown(gtmPlan)}
          </div>
        )}
      </Card>

      {/* Section C — Supervisor Summary */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" /> Supervisor Summary
          </h3>
          <div className="flex gap-2">
            {summary && (
              <>
                <Button size="sm" variant="outline" onClick={() => copyText(summary, "Executive summary")}>
                  <Copy className="h-4 w-4 mr-1.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={printSummary}>
                  <Printer className="h-4 w-4 mr-1.5" /> Print
                </Button>
              </>
            )}
            <Button size="sm" onClick={generateSummary} disabled={generatingSummary}>
              {generatingSummary ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
              {generatingSummary ? "Generating…" : "Generate Summary"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a military-style executive brief with BLUF, readiness assessment, and risk analysis — ready to send up the chain.
        </p>

        {summary && (
          <div ref={summaryRef} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gray-50/50 dark:bg-gray-900/30">
            {renderMarkdown(summary)}
          </div>
        )}
      </Card>
    </div>
  );
}
