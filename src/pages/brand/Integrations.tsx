import { useState, useEffect, useCallback } from "react";
import {
  Link2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Check,
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
import { useDemoMode } from "@/hooks/useDemoMode";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SocialPlatform {
  id: string;
  name: string;
  logo: string; // URL for real brand logo
  bgColor: string;
  uploadPostPlatform: string;
}

interface OtherIntegration {
  id: string;
  name: string;
  description: string;
  logo?: string; // URL for real brand logo
  customLogo?: React.ReactNode; // for text-based logos
  bgColor: string;
}

/* ------------------------------------------------------------------ */
/*  Logo component with lazy loading + gray placeholder               */
/* ------------------------------------------------------------------ */

const BrandLogo = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    className="w-10 h-10 object-contain"
    style={{ background: "#f3f4f6", borderRadius: 4 }}
  />
);

/* ------------------------------------------------------------------ */
/*  Platform data                                                      */
/* ------------------------------------------------------------------ */

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "instagram",
    name: "Instagram",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png",
    bgColor: "bg-pink-50",
    uploadPostPlatform: "instagram",
  },
  {
    id: "tiktok",
    name: "TikTok",
    logo: "https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.png",
    bgColor: "bg-gray-100",
    uploadPostPlatform: "tiktok",
  },
  {
    id: "youtube",
    name: "YouTube",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
    bgColor: "bg-red-50",
    uploadPostPlatform: "youtube",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/X_icon_2.svg",
    bgColor: "bg-gray-100",
    uploadPostPlatform: "x",
  },
  {
    id: "facebook",
    name: "Facebook Pages",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png",
    bgColor: "bg-blue-50",
    uploadPostPlatform: "facebook",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png",
    bgColor: "bg-blue-50",
    uploadPostPlatform: "linkedin",
  },
];

const OTHER_INTEGRATIONS: OtherIntegration[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync your merch store and product catalog",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg",
    bgColor: "bg-green-50",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept payments and manage subscriptions",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
    bgColor: "bg-purple-50",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Automate email campaigns and newsletters",
    customLogo: (
      <span
        className="text-sm font-bold"
        style={{ color: "#241C15", background: "#FFE01B", borderRadius: 4, padding: "6px 8px" }}
      >
        MC
      </span>
    ),
    bgColor: "bg-yellow-50",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect workflows and automate tasks",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Zap_Logo_RGB_Orange.png",
    bgColor: "bg-orange-50",
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Track website traffic and user behavior",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/89/Logo_Google_Analytics.svg",
    bgColor: "bg-blue-50",
  },
  {
    id: "mux",
    name: "Mux",
    description: "Professional streaming infrastructure",
    customLogo: (
      <span className="text-lg font-extrabold" style={{ color: "#FB2491" }}>
        Mux
      </span>
    ),
    bgColor: "bg-pink-50",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Integrations() {
  const { guardAction } = useDemoMode();
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
    if (guardAction("connect_social")) return;
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
            style={{ backgroundColor: "#10B981" }}
            className="hover:opacity-90 text-white"
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
            style={{ borderColor: "#10B981", color: "#10B981" }}
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
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${platform.bgColor}`}
                  >
                    <BrandLogo src={platform.logo} alt={platform.name} />
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
                    <Badge className="border-0 flex items-center gap-1" style={{ backgroundColor: "#d1fae5", color: "#10B981" }}>
                      <Check className="w-3 h-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      style={{ backgroundColor: "#10B981" }}
                      className="hover:opacity-90 text-white"
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
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${integration.bgColor}`}
                >
                  {integration.customLogo ? (
                    integration.customLogo
                  ) : integration.logo ? (
                    <BrandLogo src={integration.logo} alt={integration.name} />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{integration.name}</p>
                    <Badge
                      className="text-[10px] font-medium text-white border-0"
                      style={{ backgroundColor: "#0D9488" }}
                    >
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
