import { useState, useEffect, useCallback } from "react";
import {
  Link2,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  ShoppingCart,
  CreditCard,
  Mail,
  Zap,
  BarChart3,
  Video,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { generateConnectUrl } from "@/services/upload-post";
import {
  syncConnectedAccountsFromUploadPost,
  getConnectedAccounts,
  ensureUploadPostProfile,
  type ConnectedAccountRow,
} from "@/lib/upload-post-sync";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  uploadPostPlatform: string; // platform id for Upload-Post matching
}

interface OtherIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

/* ------------------------------------------------------------------ */
/*  TikTok SVG icon                                                    */
/* ------------------------------------------------------------------ */

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Platform data                                                      */
/* ------------------------------------------------------------------ */

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: <Instagram className="w-7 h-7" />,
    color: "text-pink-500",
    bgColor: "bg-pink-50",
    uploadPostPlatform: "instagram",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <TikTokIcon className="w-7 h-7" />,
    color: "text-gray-900",
    bgColor: "bg-gray-100",
    uploadPostPlatform: "tiktok",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: <Youtube className="w-7 h-7" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
    uploadPostPlatform: "youtube",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    icon: <Twitter className="w-7 h-7" />,
    color: "text-gray-900",
    bgColor: "bg-gray-100",
    uploadPostPlatform: "x",
  },
  {
    id: "facebook",
    name: "Facebook Pages",
    icon: <Facebook className="w-7 h-7" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    uploadPostPlatform: "facebook",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <Linkedin className="w-7 h-7" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    uploadPostPlatform: "linkedin",
  },
];

const OTHER_INTEGRATIONS: OtherIntegration[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync your merch store and product catalog",
    icon: <ShoppingCart className="w-7 h-7" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept payments and manage subscriptions",
    icon: <CreditCard className="w-7 h-7" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Automate email campaigns and newsletters",
    icon: <Mail className="w-7 h-7" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect workflows and automate tasks",
    icon: <Zap className="w-7 h-7" />,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Track website traffic and user behavior",
    icon: <BarChart3 className="w-7 h-7" />,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    id: "mux",
    name: "Mux",
    description: "Professional streaming infrastructure",
    icon: <Video className="w-7 h-7" />,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Integrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  /* ---- Load connected accounts from Supabase ---- */
  const loadAccounts = useCallback(async () => {
    if (!userId) return;
    const list = await getConnectedAccounts(userId);
    setAccounts(list);
  }, [userId]);

  /* ---- Ensure Upload-Post profile & get connect URL ---- */
  const ensureProfileAndGetUrl = useCallback(async () => {
    if (!userId) return;
    setConnectLoading(true);
    try {
      const ensured = await ensureUploadPostProfile(userId);
      if (!ensured.ok) {
        toast({
          title: "Profile error",
          description: ensured.error ?? "Could not create Upload-Post profile.",
          variant: "destructive",
        });
        return;
      }
      const res = await generateConnectUrl(userId);
      if (res.access_url) {
        setConnectUrl(res.access_url);
      } else {
        toast({
          title: "Connect URL error",
          description: res.error ?? "Could not generate connect link.",
          variant: "destructive",
        });
      }
    } finally {
      setConnectLoading(false);
    }
  }, [userId, toast]);

  /* ---- Sync from Upload-Post → Supabase ---- */
  const syncAccounts = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const synced = await syncConnectedAccountsFromUploadPost(userId);
      setAccounts(synced);
      toast({
        title: "Synced",
        description:
          synced.length > 0
            ? `${synced.length} account${synced.length !== 1 ? "s" : ""} synced from Upload-Post.`
            : "No connected accounts yet. Connect platforms above.",
      });
    } catch {
      toast({
        title: "Sync failed",
        description: "Could not sync accounts. Try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }, [userId, toast]);

  /* ---- Init on mount ---- */
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      await ensureProfileAndGetUrl();
      await loadAccounts();
    })().finally(() => setLoading(false));
  }, [userId, ensureProfileAndGetUrl, loadAccounts]);

  /* ---- Open Upload-Post connect popup ---- */
  const openConnectPopup = () => {
    if (connectUrl) {
      window.open(connectUrl, "uploadpost-connect", "width=600,height=700");
    } else {
      toast({
        title: "Not ready",
        description: "Connect link is still loading. Please wait.",
        variant: "destructive",
      });
    }
  };

  /* ---- Check if platform is connected ---- */
  const getConnectionForPlatform = (platform: SocialPlatform): ConnectedAccountRow | undefined =>
    accounts.find(
      (acc) =>
        acc.platform === platform.uploadPostPlatform ||
        acc.platform === platform.id
    );

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="w-7 h-7 text-purple-600" />
          Integrations
        </h1>
        <p className="text-gray-500 mt-1">
          Connect your social media accounts and third-party services.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  Section 1 — Social Media Accounts                           */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Social Media Accounts</h2>
          <p className="text-sm text-gray-500">
            Connect accounts via Upload-Post to post content and stream events.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={openConnectPopup}
            disabled={connectLoading || !connectUrl}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {connectLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            Connect Accounts
          </Button>
          <Button
            variant="outline"
            onClick={syncAccounts}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync Accounts
          </Button>
        </div>

        {/* Platform cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOCIAL_PLATFORMS.map((platform) => {
            const conn = getConnectionForPlatform(platform);
            const isConnected = !!conn;

            return (
              <Card key={platform.id} className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${platform.bgColor} ${platform.color}`}
                  >
                    {platform.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{platform.name}</p>
                    {isConnected ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-xs text-green-600 font-medium truncate">
                          {conn.platform_username
                            ? `@${conn.platform_username}`
                            : "Connected"}
                        </span>
                        {conn.followers_count != null && conn.followers_count > 0 && (
                          <span className="text-xs text-gray-400">
                            {conn.followers_count >= 1_000_000
                              ? `${(conn.followers_count / 1_000_000).toFixed(1)}M`
                              : conn.followers_count >= 1_000
                                ? `${(conn.followers_count / 1_000).toFixed(1)}K`
                                : conn.followers_count}{" "}
                            followers
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not connected</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {isConnected ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={openConnectPopup}
                      disabled={connectLoading || !connectUrl}
                    >
                      {connectLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : null}
                      Connect
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading connections...
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Section 2 — Other Integrations                              */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Other Integrations</h2>
          <p className="text-sm text-gray-500">
            Third-party services to extend your RecurrentX experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OTHER_INTEGRATIONS.map((integration) => (
            <Card key={integration.id} className="p-5 opacity-75">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${integration.bgColor} ${integration.color}`}
                >
                  {integration.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{integration.name}</p>
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      Coming Soon
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{integration.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
