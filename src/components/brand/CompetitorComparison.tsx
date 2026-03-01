import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORM_LABELS,
  formatCount,
  type Monitor,
  type Mention,
} from "@/lib/social-monitoring-types";

interface Props {
  monitors: Monitor[];
  activeMonitorId: string | null;
  compareMonitorId: string | null;
  onSelectCompare: (id: string) => void;
  onClose: () => void;
  open: boolean;
}

interface BrandStats {
  total: number;
  reach: number;
  positive: number;
  negative: number;
  neutral: number;
  mixed: number;
  sponsored: number;
  topPlatform: string;
  topPlatformPct: number;
  topCreator: { handle: string; name: string; followers: number } | null;
  creators: Set<string>;
}

function computeStats(mentions: Mention[]): BrandStats {
  const total = mentions.length;
  let reach = 0;
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  let mixed = 0;
  let sponsored = 0;
  const platformCounts: Record<string, number> = {};
  const creatorMap: Record<string, { name: string; followers: number; count: number }> = {};

  for (const m of mentions) {
    reach += m.estimated_reach || 0;
    if (m.sentiment === "positive") positive++;
    else if (m.sentiment === "negative") negative++;
    else if (m.sentiment === "mixed") mixed++;
    else neutral++;
    if (m.is_sponsored) sponsored++;
    platformCounts[m.platform] = (platformCounts[m.platform] || 0) + 1;
    if (!creatorMap[m.creator_handle]) {
      creatorMap[m.creator_handle] = {
        name: m.creator_name || m.creator_handle,
        followers: m.creator_followers || 0,
        count: 0,
      };
    }
    creatorMap[m.creator_handle].count++;
  }

  const topPlatformEntry = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
  const topCreatorEntry = Object.entries(creatorMap).sort((a, b) => b[1].count - a[1].count)[0];

  return {
    total,
    reach,
    positive,
    negative,
    neutral,
    mixed,
    sponsored,
    topPlatform: topPlatformEntry?.[0] || "—",
    topPlatformPct: total > 0 && topPlatformEntry ? Math.round((topPlatformEntry[1] / total) * 100) : 0,
    topCreator: topCreatorEntry
      ? { handle: topCreatorEntry[0], ...topCreatorEntry[1] }
      : null,
    creators: new Set(Object.keys(creatorMap)),
  };
}

export default function CompetitorComparison({
  monitors,
  activeMonitorId,
  compareMonitorId,
  onSelectCompare,
  onClose,
  open,
}: Props) {
  const [mentionsA, setMentionsA] = useState<Mention[]>([]);
  const [mentionsB, setMentionsB] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(false);

  const monitorA = monitors.find((m) => m.id === activeMonitorId);
  const monitorB = monitors.find((m) => m.id === compareMonitorId);
  const otherMonitors = monitors.filter((m) => m.id !== activeMonitorId);

  // Fetch mentions when dialog opens or monitor changes
  useEffect(() => {
    if (!open) return;

    async function fetchMentions() {
      setLoading(true);
      const promises: Promise<any>[] = [];

      if (activeMonitorId) {
        promises.push(
          supabase
            .from("social_mentions")
            .select("*")
            .eq("monitor_id", activeMonitorId)
            .order("detected_at", { ascending: false })
            .limit(100),
        );
      }

      if (compareMonitorId) {
        promises.push(
          supabase
            .from("social_mentions")
            .select("*")
            .eq("monitor_id", compareMonitorId)
            .order("detected_at", { ascending: false })
            .limit(100),
        );
      }

      const results = await Promise.all(promises);
      if (activeMonitorId && results[0]?.data) {
        setMentionsA(results[0].data as unknown as Mention[]);
      }
      if (compareMonitorId && results.length > 1 && results[1]?.data) {
        setMentionsB(results[1].data as unknown as Mention[]);
      }
      setLoading(false);
    }

    fetchMentions();
  }, [open, activeMonitorId, compareMonitorId]);

  const statsA = useMemo(() => computeStats(mentionsA), [mentionsA]);
  const statsB = useMemo(() => computeStats(mentionsB), [mentionsB]);

  // Overlap creators
  const overlapCreators = useMemo(() => {
    if (!compareMonitorId) return [];
    const overlap: string[] = [];
    for (const handle of statsA.creators) {
      if (statsB.creators.has(handle)) overlap.push(handle);
    }
    return overlap;
  }, [statsA, statsB, compareMonitorId]);

  function WinnerCell({ a, b, format: fmt }: { a: number; b: number; format?: (n: number) => string }) {
    const fmtFn = fmt || String;
    const aWins = a > b;
    const bWins = b > a;
    return (
      <>
        <td className={`px-4 py-2 text-right ${aWins ? "text-green-600 dark:text-green-400 font-semibold" : ""}`}>
          {fmtFn(a)}
        </td>
        <td className={`px-4 py-2 text-right ${bWins ? "text-green-600 dark:text-green-400 font-semibold" : ""}`}>
          {compareMonitorId ? fmtFn(b) : "—"}
        </td>
      </>
    );
  }

  // For sentiment, lower negative is better (use inverse for winner)
  function SentimentBar({ positive, negative, neutral, mixed, total }: { positive: number; negative: number; neutral: number; mixed: number; total: number }) {
    if (total === 0) return <span className="text-gray-400">—</span>;
    const pPct = Math.round((positive / total) * 100);
    const nPct = Math.round((negative / total) * 100);
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-green-600">{pPct}%</span>
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
          <div className="bg-green-500 h-full" style={{ width: `${pPct}%` }} />
          <div className="bg-yellow-400 h-full" style={{ width: `${Math.round(((mixed + neutral) / total) * 100)}%` }} />
          <div className="bg-red-500 h-full" style={{ width: `${nPct}%` }} />
        </div>
        <span className="text-red-600">{nPct}%</span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Brand Comparison</DialogTitle>
        </DialogHeader>

        {/* Monitor selector */}
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="secondary" className="text-sm font-medium">
            {monitorA?.brand_name || "—"}
          </Badge>
          <span className="text-gray-400 text-sm">vs</span>
          <Select value={compareMonitorId || ""} onValueChange={onSelectCompare}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select brand..." />
            </SelectTrigger>
            <SelectContent>
              {otherMonitors.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.brand_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Metric</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium">{monitorA?.brand_name || "—"}</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium">{monitorB?.brand_name || "Select..."}</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                <tr>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Total Mentions</td>
                  <WinnerCell a={statsA.total} b={statsB.total} />
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Est. Reach</td>
                  <WinnerCell a={statsA.reach} b={statsB.reach} format={formatCount} />
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Sentiment</td>
                  <td className="px-4 py-2">
                    <SentimentBar {...statsA} total={statsA.total} />
                  </td>
                  <td className="px-4 py-2">
                    {compareMonitorId ? (
                      <SentimentBar {...statsB} total={statsB.total} />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Positive / Negative</td>
                  <td className="px-4 py-2 text-right text-sm">
                    <span className="text-green-600">{statsA.positive}</span> / <span className="text-red-600">{statsA.negative}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-sm">
                    {compareMonitorId ? (
                      <>
                        <span className="text-green-600">{statsB.positive}</span> / <span className="text-red-600">{statsB.negative}</span>
                      </>
                    ) : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Top Platform</td>
                  <td className="px-4 py-2 text-right">
                    {PLATFORM_LABELS[statsA.topPlatform] || statsA.topPlatform} ({statsA.topPlatformPct}%)
                  </td>
                  <td className="px-4 py-2 text-right">
                    {compareMonitorId
                      ? `${PLATFORM_LABELS[statsB.topPlatform] || statsB.topPlatform} (${statsB.topPlatformPct}%)`
                      : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Top Creator</td>
                  <td className="px-4 py-2 text-right">
                    {statsA.topCreator ? `@${statsA.topCreator.handle}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {compareMonitorId && statsB.topCreator ? `@${statsB.topCreator.handle}` : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Sponsored</td>
                  <td className="px-4 py-2 text-right">{statsA.sponsored}/{statsA.total}</td>
                  <td className="px-4 py-2 text-right">
                    {compareMonitorId ? `${statsB.sponsored}/${statsB.total}` : "—"}
                  </td>
                </tr>
                {overlapCreators.length > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">Shared Creators</td>
                    <td className="px-4 py-2 text-right" colSpan={2}>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {overlapCreators.map((h) => (
                          <Badge key={h} variant="outline" className="text-xs">
                            @{h}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {otherMonitors.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Create another brand monitor to compare against.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
