// SQL for Andrew to run in Supabase:
// CREATE TABLE social_connections (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid,
//   platform text,
//   account_name text,
//   account_id text,
//   access_token_ref text,
//   avatar_url text,
//   is_active boolean DEFAULT true,
//   created_at timestamptz DEFAULT now()
// );

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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  uploadPostPlatform?: string; // platform id for Upload-Post SDK
}

interface SocialConnection {
  platformId: string;
  accountName: string;
  accountId: string;
  avatarUrl?: string;
  connectedAt: string;
  // Fallback RTMP fields (when Upload-Post unavailable)
  rtmpUrl?: string;
  streamKey?: string;
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
    uploadPostPlatform: "twitter",
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
/*  Upload-Post SDK helpers                                            */
/* ------------------------------------------------------------------ */

const UPLOAD_POST_API_KEY = import.meta.env.VITE_UPLOAD_POST_API_KEY;

function isUploadPostAvailable(): boolean {
  return !!(UPLOAD_POST_API_KEY && (window as any).UploadPost);
}

function loadUploadPostSDK(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).UploadPost) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="upload-post"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.upload-post.com/upload-post.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // resolve anyway — we'll fallback
    document.head.appendChild(script);
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Integrations() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Fallback manual RTMP modal
  const [manualModal, setManualModal] = useState<SocialPlatform | null>(null);
  const [manualRtmp, setManualRtmp] = useState("");
  const [manualKey, setManualKey] = useState("");

  // Load Upload-Post SDK on mount
  useEffect(() => {
    if (UPLOAD_POST_API_KEY) {
      loadUploadPostSDK().then(() => {
        setSdkReady(isUploadPostAvailable());
      });
    }
  }, []);

  /* ---- Connect via Upload-Post SDK ---- */
  const handleConnect = useCallback(
    async (platform: SocialPlatform) => {
      if (!sdkReady) {
        // Fallback: open manual modal
        setManualRtmp("");
        setManualKey("");
        setManualModal(platform);
        return;
      }

      setConnecting(platform.id);
      try {
        const up = (window as any).UploadPost;
        if (!up) throw new Error("SDK not loaded");

        const client = up.init({ apiKey: UPLOAD_POST_API_KEY });
        const result = await client.connect(platform.uploadPostPlatform);

        setConnections((prev) => [
          ...prev.filter((c) => c.platformId !== platform.id),
          {
            platformId: platform.id,
            accountName: result?.accountName || result?.username || platform.name,
            accountId: result?.accountId || result?.id || "",
            avatarUrl: result?.avatarUrl || result?.avatar || undefined,
            connectedAt: new Date().toISOString(),
          },
        ]);
        toast({
          title: "Connected",
          description: `${platform.name} has been connected successfully.`,
        });
      } catch (err: any) {
        if (err?.message?.includes("cancelled") || err?.message?.includes("closed")) {
          // user closed popup
        } else {
          toast({
            title: "Connection failed",
            description: err?.message || "Could not connect. Try again.",
            variant: "destructive",
          });
        }
      } finally {
        setConnecting(null);
      }
    },
    [sdkReady, toast]
  );

  /* ---- Manual fallback save ---- */
  const handleManualSave = () => {
    if (!manualModal) return;
    if (!manualRtmp.trim() || !manualKey.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both RTMP URL and Stream Key.",
        variant: "destructive",
      });
      return;
    }
    setConnections((prev) => [
      ...prev.filter((c) => c.platformId !== manualModal.id),
      {
        platformId: manualModal.id,
        accountName: manualModal.name,
        accountId: "",
        connectedAt: new Date().toISOString(),
        rtmpUrl: manualRtmp.trim(),
        streamKey: manualKey.trim(),
      },
    ]);
    toast({
      title: "Connected",
      description: `${manualModal.name} stream key saved.`,
    });
    setManualModal(null);
  };

  /* ---- Disconnect ---- */
  const handleDisconnect = (platformId: string) => {
    setConnections((prev) => prev.filter((c) => c.platformId !== platformId));
    const p = SOCIAL_PLATFORMS.find((p) => p.id === platformId);
    toast({
      title: "Disconnected",
      description: `${p?.name} has been removed.`,
    });
  };

  const getConnection = (id: string) => connections.find((c) => c.platformId === id);

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
            Connect accounts to post content and stream events.
            {!sdkReady && UPLOAD_POST_API_KEY && (
              <span className="ml-1 text-xs text-amber-600">(SDK loading...)</span>
            )}
            {!UPLOAD_POST_API_KEY && (
              <span className="ml-1 text-xs text-gray-400">(Manual stream key mode)</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOCIAL_PLATFORMS.map((platform) => {
            const conn = getConnection(platform.id);
            const isConnected = !!conn;
            const isLoading = connecting === platform.id;

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
                          {conn.accountName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not connected</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDisconnect(platform.id)}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleConnect(platform)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
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

      {/* ============================================================ */}
      {/*  Manual RTMP fallback modal                                   */}
      {/* ============================================================ */}
      <Dialog open={!!manualModal} onOpenChange={() => setManualModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {manualModal && (
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${manualModal.bgColor} ${manualModal.color}`}
                >
                  {manualModal.icon}
                </div>
              )}
              Connect {manualModal?.name}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500">
            Enter your stream key to connect manually. OAuth connections will be available soon.
          </p>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>RTMP URL</Label>
              <Input
                value={manualRtmp}
                onChange={(e) => setManualRtmp(e.target.value)}
                placeholder="rtmp://..."
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Stream Key</Label>
              <Input
                type="password"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="Enter your stream key"
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setManualModal(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleManualSave}
              >
                Save & Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
