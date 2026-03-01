import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp, TrendingDown, AlertTriangle, UserPlus } from "lucide-react";
import type { Mention } from "@/lib/social-monitoring-types";

interface Props {
  mentions: Mention[];
  onFilterSentiment: (v: string) => void;
}

interface Alert {
  id: string;
  icon: typeof Zap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

export default function TrendAlerts({ mentions, onFilterSentiment }: Props) {
  const alerts = useMemo(() => {
    if (mentions.length < 5) return [];

    const detected: Alert[] = [];

    // Group mentions by day
    const byDay: Record<string, Mention[]> = {};
    for (const m of mentions) {
      const day = m.detected_at.substring(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(m);
    }

    const days = Object.keys(byDay).sort();
    const last7 = days.slice(-7);
    const prior7 = days.slice(-14, -7);

    // Alert 1: Mention Spike — today count > 2x daily average
    if (last7.length >= 2) {
      const avgDaily = last7.reduce((sum, d) => sum + (byDay[d]?.length || 0), 0) / last7.length;
      const today = days[days.length - 1];
      const todayCount = byDay[today]?.length || 0;
      if (avgDaily > 0 && todayCount > avgDaily * 2) {
        detected.push({
          id: "spike",
          icon: Zap,
          iconColor: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          title: "Mention Spike",
          description: `${todayCount} mentions today — ${(todayCount / avgDaily).toFixed(1)}x your daily average`,
        });
      }
    }

    // Alert 2: Sentiment Shift — compare last 7d vs prior 7d
    if (prior7.length >= 3 && last7.length >= 3) {
      const calcSentimentScore = (dayList: string[]) => {
        let total = 0;
        let count = 0;
        for (const d of dayList) {
          for (const m of byDay[d] || []) {
            count++;
            if (m.sentiment === "positive") total += 1;
            else if (m.sentiment === "negative") total -= 1;
          }
        }
        return count > 0 ? total / count : 0;
      };

      const recentScore = calcSentimentScore(last7);
      const priorScore = calcSentimentScore(prior7);
      const diff = recentScore - priorScore;

      if (Math.abs(diff) > 0.2) {
        const improving = diff > 0;
        detected.push({
          id: "sentiment-shift",
          icon: improving ? TrendingUp : TrendingDown,
          iconColor: improving
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400",
          bgColor: improving
            ? "bg-green-50 dark:bg-green-900/20"
            : "bg-red-50 dark:bg-red-900/20",
          borderColor: improving
            ? "border-green-200 dark:border-green-800"
            : "border-red-200 dark:border-red-800",
          title: improving ? "Sentiment Improving" : "Sentiment Declining",
          description: `Sentiment shifted ${improving ? "positively" : "negatively"} vs prior week`,
        });
      }
    }

    // Alert 3: Negative Surge — 3+ negative mentions in a single day
    for (const d of last7) {
      const negCount = (byDay[d] || []).filter((m) => m.sentiment === "negative").length;
      if (negCount >= 3) {
        detected.push({
          id: "negative-surge",
          icon: AlertTriangle,
          iconColor: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
          title: "Negative Surge",
          description: `${negCount} negative mentions on ${d}`,
          action: () => onFilterSentiment("negative"),
          actionLabel: "View",
        });
        break; // Only show one
      }
    }

    // Alert 4: New High-Follower Creator — 100K+ followers with only 1 mention
    const creatorCounts: Record<string, { count: number; followers: number }> = {};
    for (const m of mentions) {
      if (!creatorCounts[m.creator_handle]) {
        creatorCounts[m.creator_handle] = { count: 0, followers: m.creator_followers || 0 };
      }
      creatorCounts[m.creator_handle].count++;
    }
    const newBigCreator = Object.entries(creatorCounts).find(
      ([, data]) => data.count === 1 && data.followers >= 100000,
    );
    if (newBigCreator) {
      detected.push({
        id: "new-creator",
        icon: UserPlus,
        iconColor: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        title: "New Creator",
        description: `@${newBigCreator[0]} (${(newBigCreator[1].followers / 1000).toFixed(0)}K followers) mentioned your brand`,
      });
    }

    return detected.slice(0, 3);
  }, [mentions, onFilterSentiment]);

  if (alerts.length === 0) return null;

  return (
    <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={`flex items-center gap-3 px-4 py-3 min-w-[240px] flex-shrink-0 ${alert.bgColor} ${alert.borderColor} border`}
        >
          <alert.icon className={`h-5 w-5 flex-shrink-0 ${alert.iconColor}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{alert.description}</p>
          </div>
          {alert.action && (
            <Button
              size="sm"
              variant="ghost"
              onClick={alert.action}
              className="text-xs flex-shrink-0"
            >
              {alert.actionLabel}
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}
