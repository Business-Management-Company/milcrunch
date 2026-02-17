import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Bell,
  TrendingUp,
  BarChart3,
  Globe,
  Users,
  Search,
  Plus,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  Hash,
  AtSign,
  MessageCircle,
  Heart,
  Repeat2,
  Eye,
} from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { toast } from "sonner";

/* =========== CONSTANTS =========== */

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#000000",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
  facebook: "#1877F2",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter / X",
  youtube: "YouTube",
  facebook: "Facebook",
};

const SENTIMENT_CONFIG = {
  positive: { color: "#00B894", emoji: "😊", label: "Positive", bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800" },
  neutral: { color: "#636E72", emoji: "😐", label: "Neutral", bg: "bg-gray-50 dark:bg-gray-800/50", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" },
  negative: { color: "#E17055", emoji: "😟", label: "Negative", bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
};

/* =========== MOCK DATA =========== */

const now = new Date();

function mockDate(daysAgo: number, hoursAgo = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

interface MockMention {
  id: string;
  keyword_text: string;
  platform: string;
  author_handle: string;
  author_name: string;
  author_followers: number;
  post_text: string;
  post_url: string;
  likes: number;
  comments: number;
  shares: number;
  sentiment: "positive" | "neutral" | "negative";
  posted_at: string;
}

const MOCK_MENTIONS: MockMention[] = [
  { id: "m1", keyword_text: "#MIC2026", platform: "instagram", author_handle: "johnny_marines", author_name: "Johnny Marines", author_followers: 168000, post_text: "Can't wait for #MIC2026 this September! The lineup is going to be incredible. Who else is going? 🇺🇸", post_url: "https://instagram.com/p/mock1", likes: 2340, comments: 187, shares: 45, sentiment: "positive", posted_at: mockDate(0, 2) },
  { id: "m2", keyword_text: "#MIC2026", platform: "tiktok", author_handle: "florent.groberg", author_name: "Florent Groberg", author_followers: 51900, post_text: "Behind the scenes prep for my keynote at #MIC2026. Honored to represent the veteran community. 🎤", post_url: "https://tiktok.com/@florent/mock2", likes: 8900, comments: 423, shares: 156, sentiment: "positive", posted_at: mockDate(0, 5) },
  { id: "m3", keyword_text: "#MilitaryInfluencer", platform: "twitter", author_handle: "milfluencer_pod", author_name: "MilFluencer Podcast", author_followers: 23000, post_text: "New episode dropping about the rise of #MilitaryInfluencer content and why brands are paying attention 🎙️", post_url: "https://twitter.com/milfluencer_pod/mock3", likes: 445, comments: 67, shares: 89, sentiment: "positive", posted_at: mockDate(0, 8) },
  { id: "m4", keyword_text: "#MilSpouseFest", platform: "instagram", author_handle: "milspouse_life", author_name: "MilSpouse Life", author_followers: 45000, post_text: "#MilSpouseFest San Juan is going to be AMAZING. PCS season + paradise = perfect combo 🌴", post_url: "https://instagram.com/p/mock4", likes: 1200, comments: 98, shares: 34, sentiment: "positive", posted_at: mockDate(1, 3) },
  { id: "m5", keyword_text: "#MIC2026", platform: "youtube", author_handle: "davebrayusa", author_name: "DAVE BRAY USA", author_followers: 89000, post_text: "Announcing my performance at #MIC2026! New patriotic anthem debut. Subscribe for the full video 🇺🇸🎸", post_url: "https://youtube.com/watch?v=mock5", likes: 3400, comments: 267, shares: 189, sentiment: "positive", posted_at: mockDate(1, 6) },
  { id: "m6", keyword_text: "#MIC2026", platform: "twitter", author_handle: "vetbiz_daily", author_name: "VetBiz Daily", author_followers: 31000, post_text: "Just confirmed our media pass for #MIC2026. Excited to cover the biggest military creator event of the year!", post_url: "https://twitter.com/vetbiz/mock6", likes: 312, comments: 28, shares: 67, sentiment: "positive", posted_at: mockDate(2, 1) },
  { id: "m7", keyword_text: "#MilitaryInfluencer", platform: "instagram", author_handle: "army_ranger_fit", author_name: "Ranger Fitness", author_followers: 120000, post_text: "Proud to be a #MilitaryInfluencer. Using my platform to help veterans stay fit after service 💪🇺🇸", post_url: "https://instagram.com/p/mock7", likes: 4500, comments: 312, shares: 78, sentiment: "positive", posted_at: mockDate(2, 9) },
  { id: "m8", keyword_text: "#MIC2026", platform: "tiktok", author_handle: "pcs_with_pets", author_name: "PCS With Pets", author_followers: 67000, post_text: "Guess who's speaking at #MIC2026 about building a brand during military life?! THIS GIRL 🎉", post_url: "https://tiktok.com/@pcswithpets/mock8", likes: 12300, comments: 890, shares: 445, sentiment: "positive", posted_at: mockDate(3, 2) },
  { id: "m9", keyword_text: "#MIC2026", platform: "facebook", author_handle: "milconnect", author_name: "Military Connect", author_followers: 155000, post_text: "Excited to announce our partnership with #MIC2026! Look for us at the networking lounge. See you in September!", post_url: "https://facebook.com/milconnect/mock9", likes: 890, comments: 45, shares: 123, sentiment: "positive", posted_at: mockDate(3, 8) },
  { id: "m10", keyword_text: "#MIC2026", platform: "twitter", author_handle: "skeptic_steve", author_name: "Steve R.", author_followers: 2100, post_text: "Ticket prices for #MIC2026 are steep this year. Hope the content is worth it. 😬", post_url: "https://twitter.com/skeptic_steve/mock10", likes: 34, comments: 12, shares: 5, sentiment: "negative", posted_at: mockDate(4, 4) },
  { id: "m11", keyword_text: "#MilSpouseFest", platform: "tiktok", author_handle: "navy_wife_cooks", author_name: "Navy Wife Cooks", author_followers: 89000, post_text: "Recipe demo at #MilSpouseFest was a hit! 300 people tried my military-style chili 🌶️", post_url: "https://tiktok.com/@navywifecooks/mock11", likes: 5600, comments: 234, shares: 89, sentiment: "positive", posted_at: mockDate(5, 1) },
  { id: "m12", keyword_text: "#MilitaryInfluencer", platform: "youtube", author_handle: "combatflipflops", author_name: "Combat Flip Flops", author_followers: 42000, post_text: "Our founder talks about the #MilitaryInfluencer economy and how veteran brands are changing retail", post_url: "https://youtube.com/watch?v=mock12", likes: 1890, comments: 145, shares: 67, sentiment: "positive", posted_at: mockDate(5, 7) },
  { id: "m13", keyword_text: "#MIC2026", platform: "instagram", author_handle: "tacticool_brit", author_name: "Tactical Brit", author_followers: 234000, post_text: "Flying from London to attend #MIC2026. When the biggest military creator conference calls, you answer 🎯", post_url: "https://instagram.com/p/mock13", likes: 7800, comments: 567, shares: 234, sentiment: "positive", posted_at: mockDate(6, 3) },
  { id: "m14", keyword_text: "#MIC2026", platform: "twitter", author_handle: "neutral_observer", author_name: "Media Watch", author_followers: 8900, post_text: "#MIC2026 announced its full speaker lineup today. Conference runs Sep 18-20 in San Diego.", post_url: "https://twitter.com/mediawatch/mock14", likes: 56, comments: 8, shares: 23, sentiment: "neutral", posted_at: mockDate(7, 5) },
  { id: "m15", keyword_text: "#MilSpouseFest", platform: "instagram", author_handle: "the_pcs_diaries", author_name: "PCS Diaries", author_followers: 56000, post_text: "Countdown to #MilSpouseFest! Who's packing their bags? Drop your base below 👇", post_url: "https://instagram.com/p/mock15", likes: 2100, comments: 345, shares: 56, sentiment: "positive", posted_at: mockDate(8, 2) },
  { id: "m16", keyword_text: "#MilitaryInfluencer", platform: "tiktok", author_handle: "sgtmaj_retired", author_name: "SGM (Ret) Jackson", author_followers: 178000, post_text: "When people ask if being a #MilitaryInfluencer is a real job... *shows brand deals* 😂", post_url: "https://tiktok.com/@sgtmaj/mock16", likes: 45000, comments: 2300, shares: 1200, sentiment: "positive", posted_at: mockDate(9, 6) },
  { id: "m17", keyword_text: "#MIC2026", platform: "instagram", author_handle: "veteran_mom", author_name: "Veteran Mom Life", author_followers: 34000, post_text: "Applied to volunteer at #MIC2026. So many ways to get involved even without a big following 🤝", post_url: "https://instagram.com/p/mock17", likes: 890, comments: 78, shares: 23, sentiment: "positive", posted_at: mockDate(10, 3) },
  { id: "m18", keyword_text: "#MIC2026", platform: "twitter", author_handle: "sponsor_critic", author_name: "Industry Critic", author_followers: 5400, post_text: "The sponsor list for #MIC2026 is mostly defense contractors. Would love to see more diverse brands represented.", post_url: "https://twitter.com/critic/mock18", likes: 89, comments: 34, shares: 12, sentiment: "neutral", posted_at: mockDate(12, 4) },
  { id: "m19", keyword_text: "#MilitaryInfluencer", platform: "facebook", author_handle: "mil_creator_hub", author_name: "Military Creator Hub", author_followers: 67000, post_text: "Our weekly roundup of top #MilitaryInfluencer content is live! Check out who's trending this week 📊", post_url: "https://facebook.com/milcreatorhub/mock19", likes: 456, comments: 34, shares: 89, sentiment: "positive", posted_at: mockDate(13, 7) },
  { id: "m20", keyword_text: "#MIC2026", platform: "youtube", author_handle: "mil_tech_review", author_name: "Military Tech Review", author_followers: 145000, post_text: "We'll be live-streaming panels from #MIC2026 on our channel. Subscribe and hit the bell! 🔔", post_url: "https://youtube.com/watch?v=mock20", likes: 2300, comments: 189, shares: 78, sentiment: "positive", posted_at: mockDate(14, 2) },
  { id: "m21", keyword_text: "#MilSpouseFest", platform: "twitter", author_handle: "army_spouse_net", author_name: "Army Spouse Network", author_followers: 28000, post_text: "Registration for #MilSpouseFest is officially OPEN! Early bird pricing ends March 31 🎟️", post_url: "https://twitter.com/armyspouse/mock21", likes: 567, comments: 45, shares: 123, sentiment: "positive", posted_at: mockDate(15, 5) },
  { id: "m22", keyword_text: "#MIC2026", platform: "tiktok", author_handle: "fitness_vet", author_name: "Fitness Vet", author_followers: 92000, post_text: "POV: You just got invited to speak at #MIC2026 and you've been manifesting it all year 🙏", post_url: "https://tiktok.com/@fitnessvet/mock22", likes: 15600, comments: 780, shares: 340, sentiment: "positive", posted_at: mockDate(17, 3) },
  { id: "m23", keyword_text: "#MIC2026", platform: "instagram", author_handle: "brand_collab_mgr", author_name: "Brand Collabs", author_followers: 12000, post_text: "Looking for brands to sponsor booths at #MIC2026. DM us for the media kit and ROI breakdown 📈", post_url: "https://instagram.com/p/mock23", likes: 340, comments: 56, shares: 12, sentiment: "neutral", posted_at: mockDate(20, 1) },
  { id: "m24", keyword_text: "#MilitaryInfluencer", platform: "instagram", author_handle: "airforce_fam", author_name: "Air Force Family", author_followers: 78000, post_text: "Being a #MilitaryInfluencer means showing the real side of mil life — not just the highlight reel 💙", post_url: "https://instagram.com/p/mock24", likes: 3400, comments: 234, shares: 67, sentiment: "positive", posted_at: mockDate(22, 5) },
  { id: "m25", keyword_text: "#MIC2026", platform: "twitter", author_handle: "disgruntled_vet", author_name: "Honest Vet", author_followers: 3200, post_text: "Another #MIC2026 ad in my feed. Not sure how I feel about monetizing military service but here we are 🤷", post_url: "https://twitter.com/honestvet/mock25", likes: 123, comments: 89, shares: 34, sentiment: "negative", posted_at: mockDate(25, 6) },
];

interface TrackedKeyword {
  id: string;
  text: string;
  type: "hashtag" | "mention" | "keyword" | "brand";
}

const MOCK_KEYWORDS: TrackedKeyword[] = [
  { id: "k1", text: "#MIC2026", type: "hashtag" },
  { id: "k2", text: "#MilitaryInfluencer", type: "hashtag" },
  { id: "k3", text: "#MilSpouseFest", type: "hashtag" },
  { id: "k4", text: "RecurrentX", type: "brand" },
];

interface Alert {
  id: string;
  message: string;
  type: "spike" | "influencer" | "milestone";
  is_read: boolean;
  created_at: string;
}

const MOCK_ALERTS: Alert[] = [
  { id: "a1", message: "#MIC2026 mentions up 340% this week", type: "spike", is_read: false, created_at: mockDate(0, 1) },
  { id: "a2", message: "@johnny_marines (168K followers) mentioned #MIC2026", type: "influencer", is_read: false, created_at: mockDate(0, 3) },
  { id: "a3", message: "#MilSpouseFest hit 500 total mentions", type: "milestone", is_read: true, created_at: mockDate(1, 5) },
];

/* =========== HELPERS =========== */

function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const color = PLATFORM_COLORS[platform] || "#666";
  const label = PLATFORM_LABELS[platform] || platform;
  return (
    <span
      className="inline-flex items-center justify-center rounded-md font-bold"
      style={{ color, width: size + 4, height: size + 4, fontSize: size * 0.6 }}
      title={label}
    >
      {label.charAt(0)}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const s = SENTIMENT_CONFIG[sentiment];
  return (
    <Badge className={`${s.bg} ${s.text} ${s.border} border text-xs gap-1`} variant="outline">
      {s.emoji} {s.label}
    </Badge>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

/* =========== COMPONENT =========== */

export default function SocialMonitoring() {
  const [mentions] = useState<MockMention[]>(MOCK_MENTIONS);
  const [keywords, setKeywords] = useState<TrackedKeyword[]>(MOCK_KEYWORDS);
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeywordText, setNewKeywordText] = useState("");
  const [newKeywordType, setNewKeywordType] = useState<TrackedKeyword["type"]>("hashtag");
  const [scanning, setScanning] = useState(false);
  const [mentionSort, setMentionSort] = useState("recent");
  const [mentionPlatformFilter, setMentionPlatformFilter] = useState("all");
  const [mentionSentimentFilter, setMentionSentimentFilter] = useState("all");
  const [alertDismissed, setAlertDismissed] = useState(false);

  /* --- derived stats --- */
  const totalMentions = mentions.length;
  const avgDaily = (totalMentions / 30).toFixed(1);
  const estimatedReach = mentions.reduce((sum, m) => sum + m.author_followers, 0);
  const positiveCount = mentions.filter((m) => m.sentiment === "positive").length;
  const neutralCount = mentions.filter((m) => m.sentiment === "neutral").length;
  const negativeCount = mentions.filter((m) => m.sentiment === "negative").length;
  const sentimentScore = Math.round((positiveCount / totalMentions) * 100);
  const sentimentEmoji = sentimentScore > 70 ? "😊" : sentimentScore > 40 ? "😐" : "😟";

  const unreadAlerts = alerts.filter((a) => !a.is_read);

  /* --- timeline chart data --- */
  const timelineData = useMemo(() => {
    const days: Record<string, Record<string, number>> = {};
    for (let i = 29; i >= 0; i--) {
      const key = format(subDays(now, i), "MMM d");
      days[key] = {};
      keywords.forEach((k) => { days[key][k.text] = 0; });
    }
    mentions.forEach((m) => {
      const key = format(new Date(m.posted_at), "MMM d");
      if (days[key] && days[key][m.keyword_text] !== undefined) {
        days[key][m.keyword_text]++;
      }
    });
    // Add some base random noise so the chart isn't empty on most days
    const seed = 42;
    Object.keys(days).forEach((day, i) => {
      keywords.forEach((k, ki) => {
        const val = days[day][k.text];
        if (val === 0) {
          const pseudo = ((seed * (i + 1) * (ki + 1) * 7) % 5);
          days[day][k.text] = pseudo;
        }
      });
    });
    return Object.entries(days).map(([day, vals]) => ({ day, ...vals }));
  }, [mentions, keywords]);

  /* --- platform breakdown --- */
  const platformBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    mentions.forEach((m) => { counts[m.platform] = (counts[m.platform] || 0) + 1; });
    const total = mentions.length;
    return Object.entries(counts)
      .map(([platform, count]) => ({
        platform,
        label: PLATFORM_LABELS[platform] || platform,
        count,
        pct: Math.round((count / total) * 100),
        color: PLATFORM_COLORS[platform] || "#999",
      }))
      .sort((a, b) => b.count - a.count);
  }, [mentions]);

  /* --- filtered & sorted mentions --- */
  const filteredMentions = useMemo(() => {
    let list = [...mentions];
    if (mentionPlatformFilter !== "all") list = list.filter((m) => m.platform === mentionPlatformFilter);
    if (mentionSentimentFilter !== "all") list = list.filter((m) => m.sentiment === mentionSentimentFilter);
    if (mentionSort === "recent") list.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
    else if (mentionSort === "engaged") list.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));
    else if (mentionSort === "reach") list.sort((a, b) => b.author_followers - a.author_followers);
    return list;
  }, [mentions, mentionSort, mentionPlatformFilter, mentionSentimentFilter]);

  /* --- top voices --- */
  const topVoices = useMemo(() => {
    const map: Record<string, MockMention & { mentionCount: number }> = {};
    mentions.forEach((m) => {
      if (!map[m.author_handle]) {
        map[m.author_handle] = { ...m, mentionCount: 0 };
      }
      map[m.author_handle].mentionCount++;
    });
    return Object.values(map).sort((a, b) => b.author_followers - a.author_followers).slice(0, 6);
  }, [mentions]);

  /* --- handlers --- */
  const handleScan = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setScanning(false);
    toast.success("Scan complete! 3 new mentions found");
  };

  const addKeyword = () => {
    if (!newKeywordText.trim()) return;
    const id = `k${Date.now()}`;
    const text = newKeywordType === "hashtag" && !newKeywordText.startsWith("#")
      ? `#${newKeywordText.trim()}`
      : newKeywordText.trim();
    setKeywords((prev) => [...prev, { id, text, type: newKeywordType }]);
    setNewKeywordText("");
    setShowAddKeyword(false);
    toast.success(`"${text}" is now being tracked`);
  };

  const removeKeyword = (id: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  };

  const dismissAlert = () => setAlertDismissed(true);

  const KEYWORD_TYPE_STYLES: Record<string, string> = {
    hashtag: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    mention: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    keyword: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    brand: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  const CHART_COLORS = ["#6C5CE7", "#E1306C", "#00B894", "#1DA1F2", "#FF6B6B"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">Track mentions, sentiment, and reach across social platforms.</p>
        </div>
        <Button onClick={handleScan} disabled={scanning} className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {scanning ? "Scanning..." : "Scan Now"}
        </Button>
      </div>

      {/* Alert Banner */}
      {!alertDismissed && unreadAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-[#6C5CE7] to-[#8B7CF7] text-white rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">#MIC2026 has {totalMentions} mentions in the last 30 days — 12% above average</p>
              <p className="text-xs text-white/80 mt-0.5">{unreadAlerts.length} new alert{unreadAlerts.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={dismissAlert}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2">
              <MessageCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Mentions</p>
              <p className="text-2xl font-bold">{totalMentions}</p>
              <p className="text-xs text-green-600">Last 30 days</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Daily</p>
              <p className="text-2xl font-bold">{avgDaily}</p>
              <p className="text-xs text-muted-foreground">mentions/day</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2">
              <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Reach</p>
              <p className="text-2xl font-bold">{formatCount(estimatedReach)}</p>
              <p className="text-xs text-muted-foreground">total audience</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-4">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 dark:bg-teal-900/30 rounded-lg p-2">
              <span className="text-lg">{sentimentEmoji}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sentiment</p>
              <p className="text-2xl font-bold">{sentimentScore}%</p>
              <p className="text-xs text-green-600">positive</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tracked Keywords */}
      <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white">Tracked Keywords & Hashtags</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddKeyword(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Keyword
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((k) => {
            const count = mentions.filter((m) => m.keyword_text === k.text).length;
            return (
              <div key={k.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${KEYWORD_TYPE_STYLES[k.type]}`}>
                {k.type === "hashtag" ? <Hash className="h-3 w-3" /> : k.type === "mention" ? <AtSign className="h-3 w-3" /> : null}
                {k.text}
                {count > 0 && (
                  <Badge className="bg-white/60 dark:bg-black/20 text-current text-xs ml-0.5 px-1.5 py-0">{count}</Badge>
                )}
                <button onClick={() => removeKeyword(k.id)} className="ml-0.5 opacity-50 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mentions Timeline */}
        <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5 lg:col-span-2">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Mentions Timeline</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              {keywords.map((k, i) => (
                <Area
                  key={k.id}
                  type="monotone"
                  dataKey={k.text}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={i === 0 ? 0.15 : 0.05}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Platform Breakdown */}
        <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Platform Breakdown</h2>
          <div className="space-y-3">
            {platformBreakdown.map((p) => (
              <div key={p.platform}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{p.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sentiment Analysis */}
      <div className="grid grid-cols-3 gap-4">
        {(["positive", "neutral", "negative"] as const).map((s) => {
          const conf = SENTIMENT_CONFIG[s];
          const count = s === "positive" ? positiveCount : s === "neutral" ? neutralCount : negativeCount;
          const pct = Math.round((count / totalMentions) * 100);
          return (
            <Card key={s} className={`rounded-xl border ${conf.border} ${conf.bg} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{conf.emoji}</span>
                <span className={`font-semibold text-sm ${conf.text}`}>{conf.label}</span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
              <p className={`text-xs ${conf.text}`}>{pct}% of mentions</p>
              <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: conf.color }} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Mentions Feed */}
      <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-white">Recent Mentions</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={mentionSort} onValueChange={setMentionSort}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="engaged">Most Engaged</SelectItem>
                <SelectItem value="reach">Most Reach</SelectItem>
              </SelectContent>
            </Select>
            <Select value={mentionPlatformFilter} onValueChange={setMentionPlatformFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {Object.entries(PLATFORM_LABELS).map(([val, lab]) => (
                  <SelectItem key={val} value={val}>{lab}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mentionSentimentFilter} onValueChange={setMentionSentimentFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredMentions.map((m) => (
            <div key={m.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: PLATFORM_COLORS[m.platform] || "#666" }}>
                  {PLATFORM_LABELS[m.platform]?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{m.author_name}</span>
                    <span className="text-xs text-muted-foreground">@{m.author_handle}</span>
                    <Badge variant="outline" className="text-xs">{formatCount(m.author_followers)} followers</Badge>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">{m.post_text}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Heart className="h-3 w-3" /> {formatCount(m.likes)}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="h-3 w-3" /> {formatCount(m.comments)}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Repeat2 className="h-3 w-3" /> {formatCount(m.shares)}</span>
                    <SentimentBadge sentiment={m.sentiment} />
                    <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(m.posted_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <a href={m.post_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
          {filteredMentions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No mentions match your filters.</p>
          )}
        </div>
      </Card>

      {/* Top Voices */}
      <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5">
        <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Top Voices</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {topVoices.map((v) => (
            <div key={v.author_handle} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center hover:shadow-md transition">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold" style={{ backgroundColor: PLATFORM_COLORS[v.platform] || "#666" }}>
                {v.author_name.charAt(0)}
              </div>
              <p className="font-semibold text-xs truncate">{v.author_name}</p>
              <p className="text-xs text-muted-foreground truncate">@{v.author_handle}</p>
              <Badge variant="outline" className="text-xs mt-1">{formatCount(v.author_followers)}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{v.mentionCount} mention{v.mentionCount !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Keyword Modal */}
      <Dialog open={showAddKeyword} onOpenChange={setShowAddKeyword}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Tracked Keyword</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Keyword or Hashtag</Label>
              <Input
                value={newKeywordText}
                onChange={(e) => setNewKeywordText(e.target.value)}
                placeholder="#YourHashtag"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newKeywordType} onValueChange={(v) => setNewKeywordType(v as TrackedKeyword["type"])}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hashtag">Hashtag</SelectItem>
                  <SelectItem value="mention">Mention</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addKeyword} disabled={!newKeywordText.trim()} className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD5]">
              Start Tracking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
