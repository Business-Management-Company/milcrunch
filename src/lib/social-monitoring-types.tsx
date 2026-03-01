import { Badge } from "@/components/ui/badge";

/* =========== CONSTANTS =========== */

export const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#000000",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
  facebook: "#1877F2",
};

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter / X",
  youtube: "YouTube",
  facebook: "Facebook",
};

export const SENTIMENT_CONFIG = {
  positive: { color: "#00B894", emoji: "😊", label: "Positive", bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800" },
  neutral: { color: "#636E72", emoji: "😐", label: "Neutral", bg: "bg-gray-50 dark:bg-gray-800/50", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" },
  negative: { color: "#E17055", emoji: "😟", label: "Negative", bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
  mixed: { color: "#FDCB6E", emoji: "🤔", label: "Mixed", bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800" },
};

/* =========== TYPES =========== */

export interface Monitor {
  id: string;
  brand_name: string;
  keywords: string[];
  hashtags: string[];
  is_active: boolean;
}

export interface Mention {
  id: string;
  monitor_id: string;
  creator_handle: string;
  creator_name: string | null;
  creator_avatar: string | null;
  platform: string;
  post_url: string | null;
  post_thumbnail: string | null;
  caption_snippet: string | null;
  matched_keywords: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  sentiment_score: number | null;
  is_sponsored: boolean;
  sponsorship_signals: string[];
  themes: string[];
  brand_context: string | null;
  engagement_likes: number;
  engagement_comments: number;
  engagement_shares: number;
  engagement_views: number;
  creator_followers: number;
  estimated_reach: number;
  post_date: string | null;
  detected_at: string;
}

export interface MonitorRun {
  id: string;
  monitor_id: string;
  ran_at: string;
  posts_found: number;
  posts_analyzed: number;
  credits_used: number;
  status: string;
  duration_ms: number | null;
}

export interface TrackedKeyword {
  id: string;
  text: string;
  type: "hashtag" | "mention" | "keyword" | "brand";
}

/* =========== HELPERS =========== */

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const s = SENTIMENT_CONFIG[sentiment as keyof typeof SENTIMENT_CONFIG] || SENTIMENT_CONFIG.neutral;
  return (
    <Badge className={`${s.bg} ${s.text} ${s.border} border text-xs gap-1`} variant="outline">
      {s.emoji} {s.label}
    </Badge>
  );
}

export function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}
