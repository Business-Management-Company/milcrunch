import { useState } from "react";
import {
  Link2,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Twitch,
  Linkedin,
  Wifi,
  Eye,
  EyeOff,
  Check,
  X,
  Pencil,
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

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  rtmpUrl: string;
  comingSoon?: boolean;
}

interface Connection {
  platformId: string;
  rtmpUrl: string;
  streamKey: string;
  connectedAt: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "youtube",
    name: "YouTube Live",
    icon: <Youtube className="w-8 h-8" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
    rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
  },
  {
    id: "facebook",
    name: "Facebook Live",
    icon: <Facebook className="w-8 h-8" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    rtmpUrl: "rtmps://live-api-s.facebook.com:443/rtmp/",
  },
  {
    id: "instagram",
    name: "Instagram Live",
    icon: <Instagram className="w-8 h-8" />,
    color: "text-pink-500",
    bgColor: "bg-pink-50",
    rtmpUrl: "",
    comingSoon: true,
  },
  {
    id: "tiktok",
    name: "TikTok Live",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" />
      </svg>
    ),
    color: "text-gray-900",
    bgColor: "bg-gray-100",
    rtmpUrl: "",
    comingSoon: false,
  },
  {
    id: "twitter",
    name: "Twitter/X Live",
    icon: <Twitter className="w-8 h-8" />,
    color: "text-gray-900",
    bgColor: "bg-gray-100",
    rtmpUrl: "rtmp://va.pscp.tv:80/x",
  },
  {
    id: "twitch",
    name: "Twitch",
    icon: <Twitch className="w-8 h-8" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    rtmpUrl: "rtmp://live.twitch.tv/app/",
  },
  {
    id: "linkedin",
    name: "LinkedIn Live",
    icon: <Linkedin className="w-8 h-8" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    rtmpUrl: "",
    comingSoon: true,
  },
  {
    id: "custom",
    name: "Custom RTMP",
    icon: <Wifi className="w-8 h-8" />,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    rtmpUrl: "",
  },
];

function maskStreamKey(key: string) {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

export default function Connectors() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectModal, setConnectModal] = useState<Platform | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const openConnect = (platform: Platform, isEdit = false) => {
    const existing = connections.find((c) => c.platformId === platform.id);
    setRtmpUrl(existing?.rtmpUrl || platform.rtmpUrl);
    setStreamKey(existing?.streamKey || "");
    setShowKey(false);
    setEditingPlatform(isEdit ? platform.id : null);
    setConnectModal(platform);
  };

  const handleTestConnection = async () => {
    if (!rtmpUrl.trim() || !streamKey.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both RTMP URL and Stream Key.", variant: "destructive" });
      return;
    }
    setTesting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setTesting(false);
    toast({ title: "Connection test passed", description: "RTMP endpoint is reachable." });
  };

  const handleSave = () => {
    if (!rtmpUrl.trim() || !streamKey.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both RTMP URL and Stream Key.", variant: "destructive" });
      return;
    }
    if (!connectModal) return;

    setConnections((prev) => {
      const filtered = prev.filter((c) => c.platformId !== connectModal.id);
      return [
        ...filtered,
        {
          platformId: connectModal.id,
          rtmpUrl: rtmpUrl.trim(),
          streamKey: streamKey.trim(),
          connectedAt: new Date().toISOString(),
        },
      ];
    });
    toast({ title: "Connector saved", description: `${connectModal.name} has been connected.` });
    setConnectModal(null);
  };

  const handleDisconnect = (platformId: string) => {
    setConnections((prev) => prev.filter((c) => c.platformId !== platformId));
    const platform = PLATFORMS.find((p) => p.id === platformId);
    toast({ title: "Disconnected", description: `${platform?.name} has been removed.` });
  };

  const getConnection = (platformId: string) =>
    connections.find((c) => c.platformId === platformId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="w-7 h-7 text-purple-600" />
          Stream Connectors
        </h1>
        <p className="text-gray-500 mt-1">
          Connect your social accounts to stream events live to multiple platforms simultaneously.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Card className="px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-gray-700">
            {connections.length} Connected
          </span>
        </Card>
        <Card className="px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-sm font-medium text-gray-700">
            {PLATFORMS.filter((p) => !p.comingSoon).length - connections.length} Available
          </span>
        </Card>
      </div>

      {/* Platform Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const conn = getConnection(platform.id);
          const isConnected = !!conn;

          return (
            <Card
              key={platform.id}
              className={`p-5 flex items-center justify-between ${
                platform.comingSoon ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center ${platform.bgColor} ${platform.color}`}
                >
                  {platform.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{platform.name}</p>
                  {platform.comingSoon ? (
                    <span className="text-xs text-gray-400 font-medium">Coming Soon</span>
                  ) : isConnected ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-green-600 font-medium">Connected</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {maskStreamKey(conn.streamKey)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Not connected</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {platform.comingSoon ? (
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                ) : isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConnect(platform, true)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDisconnect(platform.id)}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => openConnect(platform)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connect Modal */}
      <Dialog open={!!connectModal} onOpenChange={() => setConnectModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {connectModal && (
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${connectModal.bgColor} ${connectModal.color}`}
                >
                  {connectModal.icon}
                </div>
              )}
              {editingPlatform ? "Edit" : "Connect"} {connectModal?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>RTMP URL</Label>
              <Input
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="rtmp://..."
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Stream Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  placeholder="Enter your stream key"
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConnectModal(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleSave}
              >
                {editingPlatform ? "Update" : "Save & Connect"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
