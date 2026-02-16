import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ShieldCheck,
  BadgeCheck,
  Instagram,
  Youtube,
  Twitter,
  ArrowLeft,
  Users,
  TrendingUp,
  Monitor,
  Mail,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchDirectoryMemberByHandle,
  formatFollowerCount,
  getInitials,
  type ShowcaseCreator,
} from "@/lib/featured-creators";
import { fullEnrichCreatorProfile } from "@/lib/influencers-club";

const TikTokIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

const BRANCH_STYLES: Record<string, string> = {
  Army: "bg-green-800/10 text-green-800 border-green-800/20",
  Navy: "bg-blue-900/10 text-blue-900 border-blue-900/20",
  "Air Force": "bg-sky-600/10 text-sky-700 border-sky-600/20",
  Marines: "bg-red-700/10 text-red-700 border-red-700/20",
  "Coast Guard": "bg-orange-600/10 text-orange-700 border-orange-600/20",
  "Space Force": "bg-indigo-600/10 text-indigo-700 border-indigo-600/20",
};

const PLATFORM_URLS: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  twitter: (h) => `https://x.com/${h}`,
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  tiktok: <TikTokIcon className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  twitter: <Twitter className="h-5 w-5" />,
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X / Twitter",
};

export default function CreatorPublicProfile() {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
  const [creator, setCreator] = useState<ShowcaseCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Contact enrichment state
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    fetchDirectoryMemberByHandle(handle).then((data) => {
      if (data) {
        setCreator(data);
        document.title = `${data.display_name} | Military Creator | RecurrentX`;
      } else {
        setNotFound(true);
        document.title = "Creator Not Found | RecurrentX";
      }
      setLoading(false);
    });
    return () => { document.title = "RecurrentX"; };
  }, [handle]);

  const handleContactClick = () => {
    if (!user) {
      // Could redirect to login, but for now show dialog with login prompt
      setContactDialogOpen(true);
      return;
    }
    setContactDialogOpen(true);
  };

  const handleEnrich = async () => {
    if (!creator) return;
    setEnriching(true);
    setEnrichError(null);
    try {
      const result = await fullEnrichCreatorProfile(creator.handle);
      // Try to extract email from enrichment
      const data = result as Record<string, unknown>;
      const r = data?.result as Record<string, unknown> | undefined;
      const ig = r?.instagram as Record<string, unknown> | undefined;
      const email =
        (ig?.public_email as string) ||
        (ig?.email as string) ||
        (r?.email as string) ||
        (data?.email as string) ||
        null;
      if (email) {
        setContactEmail(email);
      } else {
        setEnrichError("No public email found for this creator. Try reaching out via their social platforms.");
      }
    } catch {
      setEnrichError("Failed to enrich profile. Please try again later.");
    } finally {
      setEnriching(false);
    }
  };

  // Image fallback
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    if (creator) {
      setImgSrc(creator.avatar_url || creator.ic_avatar_url || null);
      setImgFailed(false);
    }
  }, [creator]);
  const handleImgError = () => {
    if (creator && imgSrc === creator.avatar_url && creator.ic_avatar_url && creator.ic_avatar_url !== creator.avatar_url) {
      setImgSrc(creator.ic_avatar_url);
    } else {
      setImgFailed(true);
    }
  };
  const showImage = !!imgSrc && !imgFailed;

  // Platform URLs from enrichment or constructed
  const getPlatformUrl = (platform: string): string => {
    const enrichment = creator?.enrichment_data as Record<string, unknown> | undefined;
    if (enrichment) {
      const urls = enrichment.platform_urls as Record<string, string> | undefined;
      if (urls?.[platform]) return urls[platform];
    }
    // Check platform_urls on the directory member directly
    if (creator?.platform_urls?.[platform]) return creator.platform_urls[platform];
    // Build from handle
    const builder = PLATFORM_URLS[platform];
    return builder ? builder(creator?.handle ?? "") : "#";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  if (notFound || !creator) {
    return (
      <div className="min-h-screen bg-white text-[#000741]">
        <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-gray-200 bg-white sticky top-0 z-40">
          <Link to="/">
            <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <span className="text-[#000741]">recurrent</span>
              <span className="text-[#6C5CE7] font-extrabold">X</span>
            </span>
          </Link>
        </header>
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <h1 className="text-3xl font-bold mb-4">Creator Not Found</h1>
          <p className="text-gray-500 mb-8">We couldn't find a creator with that profile.</p>
          <Link to="/creators">
            <Button className="bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white">Browse All Creators</Button>
          </Link>
        </div>
      </div>
    );
  }

  const platforms = creator.platforms ?? [];
  const branchStyle = BRANCH_STYLES[creator.branch ?? ""] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="min-h-screen bg-gray-50 text-[#000741]">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-gray-200 bg-white sticky top-0 z-40">
        <Link to="/">
          <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="text-[#000741]">recurrent</span>
            <span className="text-[#6C5CE7] font-extrabold">X</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-[#6C5CE7]">Sign In</Link>
          <Link to="/signup">
            <Button size="sm" className="rounded-lg bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white px-5 font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <Link to="/creators" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#6C5CE7] mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Creators
        </Link>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Gradient banner */}
          <div className="h-32 bg-gradient-to-r from-[#000741] via-[#6C5CE7] to-[#6C5CE7]" />

          {/* Profile section */}
          <div className="px-6 md:px-10 pb-8 -mt-16">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              {/* Avatar */}
              <div className={`w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg shrink-0 ${
                creator.paradedeck_verified ? "ring-[3px] ring-purple-500 ring-offset-2" : ""
              }`}>
                {showImage ? (
                  <img
                    src={imgSrc!}
                    alt={creator.display_name}
                    className="w-full h-full object-cover"
                    onError={handleImgError}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD1] flex items-center justify-center text-white font-bold text-3xl">
                    {getInitials(creator.display_name, creator.handle)}
                  </div>
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1 text-center md:text-left pb-2">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#000741]">{creator.display_name}</h1>
                  {creator.paradedeck_verified && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ShieldCheck className="h-6 w-6 text-purple-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>RecurrentX Verified</TooltipContent>
                    </Tooltip>
                  )}
                  {creator.influencersclub_verified && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BadgeCheck className="h-6 w-6 text-blue-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>Creator Verified</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-gray-500 text-sm mb-3">@{creator.handle}</p>
                <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                  {creator.branch && (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${branchStyle}`}>
                      {creator.branch}
                    </span>
                  )}
                  {creator.status && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {creator.status}
                    </span>
                  )}
                  {creator.category && (
                    <span className="text-xs font-medium text-[#6C5CE7] bg-[#6C5CE7]/10 px-3 py-1 rounded-full">
                      {creator.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact button */}
              <div className="shrink-0">
                <Button
                  onClick={handleContactClick}
                  className="bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white px-6 rounded-xl"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Creator
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <Users className="h-5 w-5 text-[#6C5CE7] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#000741]">{formatFollowerCount(creator.follower_count)}</p>
            <p className="text-xs text-gray-500 mt-1">Followers</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#000741]">
              {creator.engagement_rate != null ? `${creator.engagement_rate.toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Engagement Rate</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <Monitor className="h-5 w-5 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#000741]">{platforms.length}</p>
            <p className="text-xs text-gray-500 mt-1">Platforms</p>
          </div>
        </div>

        {/* Bio + Platforms */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {/* Bio */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-[#000741] mb-3">About</h2>
            {creator.bio ? (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{creator.bio}</p>
            ) : (
              <p className="text-gray-400 text-sm italic">No bio available yet.</p>
            )}
          </div>

          {/* Platform links */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-[#000741] mb-3">Platforms</h2>
            {platforms.length > 0 ? (
              <div className="space-y-3">
                {platforms.map((p) => (
                  <a
                    key={p}
                    href={getPlatformUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#6C5CE7]/30 hover:bg-[#6C5CE7]/5 transition-colors group"
                  >
                    <span className="text-gray-500 group-hover:text-[#6C5CE7] transition-colors">
                      {PLATFORM_ICON[p] ?? <Monitor className="h-5 w-5" />}
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#6C5CE7]">
                      {PLATFORM_LABEL[p] ?? p}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm italic">No platforms linked yet.</p>
            )}
          </div>
        </div>
      </main>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact {creator.display_name}</DialogTitle>
          </DialogHeader>
          {!user ? (
            <div className="py-4 text-center">
              <p className="text-gray-600 mb-4">Sign in to contact this creator. Enrichment costs 1.03 credits.</p>
              <Link to="/login">
                <Button className="bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white">Sign In</Button>
              </Link>
            </div>
          ) : contactEmail ? (
            <div className="py-4 text-center">
              <Mail className="h-8 w-8 text-[#6C5CE7] mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Public email found:</p>
              <a href={`mailto:${contactEmail}`} className="text-[#6C5CE7] font-medium text-lg hover:underline">
                {contactEmail}
              </a>
            </div>
          ) : enrichError ? (
            <div className="py-4 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600">{enrichError}</p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-4">
                Run a full enrichment to find this creator's contact email. This uses <strong>1.03 credits</strong>.
              </p>
              <Button
                onClick={handleEnrich}
                disabled={enriching}
                className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
              >
                {enriching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enriching...
                  </>
                ) : (
                  "Find Contact Info (1.03 credits)"
                )}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="px-4 md:px-8 py-8 border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">&copy; 2026 RecurrentX. All rights reserved.</p>
          <Link to="/" className="text-sm text-[#6C5CE7] hover:underline">Home</Link>
        </div>
      </footer>
    </div>
  );
}
