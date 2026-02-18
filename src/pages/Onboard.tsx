import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  RefreshCw,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateConnectUrl } from "@/services/upload-post";
import {
  ensureUploadPostProfile,
  syncConnectedAccountsFromUploadPost,
  getConnectedAccounts,
  type ConnectedAccountRow,
} from "@/lib/upload-post-sync";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const CREATOR_TYPES = [
  "Content Creator",
  "Social Media Influencer",
  "Podcaster",
  "Keynote Speaker",
  "Author",
  "Military Blogger",
  "Veteran Advocate",
  "Brand Ambassador",
  "Photographer/Videographer",
  "Other",
];

const FREQ_OPTIONS = [
  "Daily",
  "3-5x per week",
  "1-2x per week",
  "A few times a month",
  "Rarely",
];

const INTEREST_OPTIONS = [
  "Brand Deals",
  "Attending Events",
  "Speaking at Events",
  "Sponsorships",
  "Podcast Collaborations",
  "Growing My Audience",
  "Networking with Other Creators",
];

const NICHE_OPTIONS = [
  "Military Life",
  "Fitness",
  "Gear & Tactics",
  "Family & MilSpouse",
  "Veteran Business",
  "Comedy",
  "Faith",
  "Politics",
  "Other",
];

const CATEGORY_OPTIONS = [
  "Military Life",
  "Fitness",
  "Veterans",
  "Lifestyle",
  "Podcasts",
  "Business",
  "Gaming",
  "Education",
  "News & Politics",
  "Music",
  "Faith",
  "Comedy",
];

const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  { id: "tiktok", name: "TikTok", icon: null, color: "text-gray-900 bg-gray-100 border-gray-200" },
  { id: "youtube", name: "YouTube", icon: Youtube, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  { id: "x", name: "Twitter/X", icon: Twitter, color: "text-gray-700 bg-gray-100 border-gray-200" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
];

const TikTokIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Helper: pill button                                                 */
/* ------------------------------------------------------------------ */

function Pill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium border transition-all",
        selected
          ? "bg-[#6C5CE7] text-white border-[#6C5CE7]"
          : "bg-white text-gray-700 border-gray-200 hover:border-[#6C5CE7]/40 hover:text-[#6C5CE7]"
      )}
    >
      {selected && <Check className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1: Who You Are                                                 */
/* ------------------------------------------------------------------ */

function Step1({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  zip,
  setZip,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  zip: string;
  setZip: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Who you are</h2>
        <p className="text-sm text-gray-500">
          Tell us a little about yourself to get started.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marcus Thompson"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-gray-400 font-normal">— Optional</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zip Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="22314"
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all"
          />
          <p className="text-xs text-gray-400 mt-1">
            We use this to surface events near you.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: How You Show Up                                             */
/* ------------------------------------------------------------------ */

function Step2({
  types,
  setTypes,
  category,
  setCategory,
}: {
  types: string[];
  setTypes: (v: string[]) => void;
  category: string;
  setCategory: (v: string) => void;
}) {
  const toggle = (t: string) =>
    setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">How you show up</h2>
        <p className="text-sm text-gray-500">
          What best describes you? Select all that apply.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CREATOR_TYPES.map((t) => (
          <Pill
            key={t}
            label={t}
            selected={types.includes(t)}
            onClick={() => toggle(t)}
          />
        ))}
      </div>

      {types.length > 0 && (
        <p className="text-xs text-gray-400">
          {types.length} selected
        </p>
      )}

      {/* Primary Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Category <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-3">
          Choose the category that best represents your content.
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <Pill
              key={c}
              label={c}
              selected={category === c}
              onClick={() => setCategory(category === c ? "" : c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3: Content & Goals (AI-Adaptive)                               */
/* ------------------------------------------------------------------ */

function Step3({
  types,
  frequency,
  setFrequency,
  interests,
  setInterests,
  extraAnswer,
  setExtraAnswer,
  niche,
  setNiche,
}: {
  types: string[];
  frequency: string;
  setFrequency: (v: string) => void;
  interests: string[];
  setInterests: (v: string[]) => void;
  extraAnswer: string;
  setExtraAnswer: (v: string) => void;
  niche: string[];
  setNiche: (v: string[]) => void;
}) {
  const toggleInterest = (i: string) =>
    setInterests(
      interests.includes(i)
        ? interests.filter((x) => x !== i)
        : [...interests, i]
    );
  const toggleNiche = (n: string) =>
    setNiche(niche.includes(n) ? niche.filter((x) => x !== n) : [...niche, n]);

  // Determine adaptive question
  const hasPodcaster = types.includes("Podcaster");
  const hasSpeaker = types.includes("Keynote Speaker");
  const hasAuthor = types.includes("Author");
  const hasCreatorOrInfluencer =
    types.includes("Content Creator") ||
    types.includes("Social Media Influencer");

  let adaptiveType: "text" | "niche" | null = null;
  let adaptiveLabel = "";

  if (hasPodcaster) {
    adaptiveType = "text";
    adaptiveLabel = "What is your podcast about?";
  } else if (hasSpeaker) {
    adaptiveType = "text";
    adaptiveLabel = "What topics do you speak on?";
  } else if (hasAuthor) {
    adaptiveType = "text";
    adaptiveLabel = "What have you written about?";
  } else if (hasCreatorOrInfluencer) {
    adaptiveType = "niche";
    adaptiveLabel = "What is your primary niche?";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Your content & goals
        </h2>
        <p className="text-sm text-gray-500">
          Help us personalize your experience.
        </p>
      </div>

      {/* Post frequency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How often do you post on social media?
        </label>
        <div className="flex flex-wrap gap-2">
          {FREQ_OPTIONS.map((f) => (
            <Pill
              key={f}
              label={f}
              selected={frequency === f}
              onClick={() => setFrequency(f)}
            />
          ))}
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What are you interested in? <span className="text-gray-400 font-normal">Select all that apply</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((i) => (
            <Pill
              key={i}
              label={i}
              selected={interests.includes(i)}
              onClick={() => toggleInterest(i)}
            />
          ))}
        </div>
      </div>

      {/* Adaptive question */}
      {adaptiveType === "text" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {adaptiveLabel}
          </label>
          <input
            type="text"
            value={extraAnswer}
            onChange={(e) => setExtraAnswer(e.target.value)}
            placeholder="Share a brief answer..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all"
          />
        </div>
      )}

      {adaptiveType === "niche" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {adaptiveLabel}
          </label>
          <div className="flex flex-wrap gap-2">
            {NICHE_OPTIONS.map((n) => (
              <Pill
                key={n}
                label={n}
                selected={niche.includes(n)}
                onClick={() => toggleNiche(n)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4: Connect Socials                                             */
/* ------------------------------------------------------------------ */

function Step4({
  accounts,
  connectLoading,
  syncing,
  onConnect,
  onSync,
}: {
  accounts: ConnectedAccountRow[];
  connectLoading: boolean;
  syncing: boolean;
  onConnect: () => void;
  onSync: () => void;
}) {
  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Connect your socials
        </h2>
        <p className="text-sm text-gray-500">
          Connect at least one social account to complete your profile.
        </p>
      </div>

      <div className="space-y-3">
        {SOCIAL_PLATFORMS.map((p) => {
          const connected = connectedPlatforms.has(p.id);
          const Icon = p.id === "tiktok" ? TikTokIcon : p.icon;

          return (
            <button
              key={p.id}
              type="button"
              onClick={connected ? undefined : onConnect}
              disabled={connectLoading}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left",
                connected
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200 hover:border-[#6C5CE7]/40 cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border",
                  connected
                    ? "bg-green-100 border-green-300 text-green-600"
                    : p.color
                )}
              >
                {connected ? (
                  <Check className="h-5 w-5" />
                ) : Icon ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <TikTokIcon className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <p className={cn("text-sm font-medium", connected ? "text-green-700" : "text-gray-900")}>
                  {p.name}
                </p>
                {connected && (
                  <p className="text-xs text-green-600">Connected</p>
                )}
              </div>
              {connected ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <ArrowRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
          );
        })}
      </div>

      {accounts.length > 0 && (
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="flex items-center gap-2 text-sm text-[#6C5CE7] hover:underline mx-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Refresh connected accounts"}
        </button>
      )}

      {accounts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700">
            Click any platform above to open a connection window. After connecting, return here and your accounts will sync automatically.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Success Screen                                                      */
/* ------------------------------------------------------------------ */

function SuccessScreen({
  name,
  memberId,
}: {
  name: string;
  memberId: string;
}) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <Shield className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        You're in the network!
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Welcome, <span className="font-semibold text-gray-900">{name}</span>.
        Your creator profile is live.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to={`/creators/${memberId}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white font-semibold text-sm transition-colors"
        >
          View My Profile <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/creators"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
        >
          Browse Creator Network
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress Bar                                                        */
/* ------------------------------------------------------------------ */

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex-1 flex items-center gap-2">
          <div className="flex-1 relative">
            <div className="h-1.5 rounded-full bg-gray-200" />
            <div
              className="absolute top-0 left-0 h-1.5 rounded-full bg-[#6C5CE7] transition-all duration-500"
              style={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
            />
          </div>
          {i < total - 1 && <div className="w-0" />}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function Onboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [memberId, setMemberId] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");

  // Step 2
  const [types, setTypes] = useState<string[]>([]);
  const [category, setCategory] = useState("");

  // Step 3
  const [frequency, setFrequency] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [extraAnswer, setExtraAnswer] = useState("");
  const [niche, setNiche] = useState<string[]>([]);

  // Step 4 — social connections
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Pre-fill email from auth
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  // Init Upload-Post when entering step 4
  useEffect(() => {
    if (step !== 3 || !userId) return;
    let mounted = true;
    (async () => {
      setConnectLoading(true);
      try {
        const ensured = await ensureUploadPostProfile(userId);
        if (!ensured.ok) return;
        const res = await generateConnectUrl(userId);
        if (mounted && res.access_url) setConnectUrl(res.access_url);
        const list = await getConnectedAccounts(userId);
        if (mounted) setAccounts(list);
      } finally {
        if (mounted) setConnectLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [step, userId]);

  const syncAccounts = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const synced = await syncConnectedAccountsFromUploadPost(userId);
      setAccounts(synced);
      toast.success(
        synced.length > 0
          ? `Synced ${synced.length} account${synced.length !== 1 ? "s" : ""}`
          : "No connected accounts yet."
      );
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  const openConnectPopup = () => {
    if (!connectUrl) {
      toast.error("Connect link is still loading. Please wait.");
      return;
    }
    const popup = window.open(connectUrl, "uploadpost-connect", "width=600,height=700");
    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        syncAccounts();
      }
    }, 1500);
  };

  // Validation
  const canNext = () => {
    switch (step) {
      case 0:
        return name.trim().length > 0 && email.trim().length > 0 && zip.trim().length > 0;
      case 1:
        return types.length > 0 && category.length > 0;
      case 2:
        return frequency.length > 0;
      case 3:
        return accounts.length > 0;
      default:
        return false;
    }
  };

  // Build adaptive extra answers
  const buildExtraAnswers = () => {
    const result: Record<string, unknown> = {};
    if (extraAnswer.trim()) {
      // Determine which question was shown
      if (types.includes("Podcaster")) result.podcast_topic = extraAnswer.trim();
      else if (types.includes("Keynote Speaker")) result.speaking_topics = extraAnswer.trim();
      else if (types.includes("Author")) result.writing_topics = extraAnswer.trim();
    }
    if (niche.length > 0) result.niche = niche;
    return Object.keys(result).length > 0 ? result : null;
  };

  // Save to Supabase
  const handleComplete = async () => {
    setSaving(true);
    try {
      // Find or create the Military Creator Network directory
      const { data: dirs } = await supabase
        .from("directories")
        .select("id")
        .eq("name", "Military Creator Network")
        .limit(1);
      let directoryId = (dirs as { id: string }[] | null)?.[0]?.id;

      if (!directoryId) {
        // Fallback: get any directory
        const { data: anyDir } = await supabase
          .from("directories")
          .select("id")
          .limit(1);
        directoryId = (anyDir as { id: string }[] | null)?.[0]?.id;
      }

      if (!directoryId) {
        toast.error("Could not find directory. Contact support.");
        return;
      }

      // Build handle from name
      const handle = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const slug = `${handle}-${Date.now()}`;

      // Build connected platforms info
      const connectedPlatforms = accounts.map((a) => a.platform);
      const platformUrls: Record<string, string> = {};
      for (const a of accounts) {
        if (a.platform_username) {
          platformUrls[a.platform] = a.platform_username;
        }
      }

      // Get best avatar from connected accounts
      const avatarUrl = accounts.find((a) => a.profile_image_url)?.profile_image_url || null;
      const totalFollowers = accounts.reduce((s, a) => s + (a.followers_count ?? 0), 0);

      const { data: inserted, error } = await supabase
        .from("directory_members")
        .insert({
          directory_id: directoryId,
          creator_handle: handle,
          creator_name: name.trim(),
          category: category || null,
          platform: connectedPlatforms[0] || "instagram",
          avatar_url: avatarUrl,
          follower_count: totalFollowers || null,
          platforms: connectedPlatforms,
          platform_urls: platformUrls,
          profile_slug: slug,
          approved: true,
          sort_order: 0,
          added_at: new Date().toISOString(),
          enrichment_data: {
            email: email.trim(),
            phone: phone.trim() || null,
            zip_code: zip.trim(),
            creator_types: types,
            post_frequency: frequency,
            interests,
            extra_answers: buildExtraAnswers(),
            social_connections: accounts.map((a) => ({
              platform: a.platform,
              username: a.platform_username,
              followers: a.followers_count,
            })),
            onboarded_at: new Date().toISOString(),
            source: "self_onboard",
          },
        } as Record<string, unknown>)
        .select("id, profile_slug")
        .single();

      if (error) throw error;

      setMemberId(inserted.profile_slug || inserted.id);
      setComplete(true);
      toast.success("Profile created!");
    } catch (err: unknown) {
      console.error("Onboard save error:", err);
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleComplete();
  };

  if (complete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <main className="pt-24 pb-16 px-4">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <SuccessScreen name={name} memberId={memberId} />
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Join the Creator Network
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Step {step + 1} of 4
            </p>
          </div>

          {/* Progress */}
          <ProgressBar step={step} total={4} />

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            {step === 0 && (
              <Step1
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                zip={zip}
                setZip={setZip}
              />
            )}
            {step === 1 && <Step2 types={types} setTypes={setTypes} category={category} setCategory={setCategory} />}
            {step === 2 && (
              <Step3
                types={types}
                frequency={frequency}
                setFrequency={setFrequency}
                interests={interests}
                setInterests={setInterests}
                extraAnswer={extraAnswer}
                setExtraAnswer={setExtraAnswer}
                niche={niche}
                setNiche={setNiche}
              />
            )}
            {step === 3 && (
              <Step4
                accounts={accounts}
                connectLoading={connectLoading}
                syncing={syncing}
                onConnect={openConnectPopup}
                onSync={syncAccounts}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <Link
                  to="/"
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Home
                </Link>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext() || saving}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  canNext() && !saving
                    ? "bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : step === 3 ? (
                  <>
                    Complete Profile <Check className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sign-in link */}
          {!userId && step === 3 && (
            <p className="text-center text-xs text-gray-400 mt-4">
              Social connections require a MilCrunch account.{" "}
              <Link to="/login" className="text-[#6C5CE7] hover:underline">
                Sign in
              </Link>{" "}
              or{" "}
              <Link to="/signup" className="text-[#6C5CE7] hover:underline">
                create one
              </Link>{" "}
              to connect your socials.
            </p>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
