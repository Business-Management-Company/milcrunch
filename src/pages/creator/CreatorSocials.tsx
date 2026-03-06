import { useState, useEffect, useCallback, useRef } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateConnectUrl } from "@/services/upload-post";
import {
  syncConnectedAccountsFromUploadPost,
  getConnectedAccounts,
  ensureUploadPostProfile,
  syncDirectoryMemberStats,
  type ConnectedAccountRow,
} from "@/lib/upload-post-sync";
import { Loader2, RefreshCw, Instagram, Youtube, Facebook, Linkedin, Twitter } from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  SVG icons for platforms without Lucide equivalents                  */
/* ------------------------------------------------------------------ */

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" />
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007C5.965 24 2.615 20.272 2.615 14.71v-.586C2.615 8.478 6.236 4.635 12.051 4.635c5.587 0 8.964 3.525 8.964 8.527v.31c0 3.63-1.96 5.895-5.058 5.895-1.576 0-2.769-.658-3.308-1.85-.596 1.14-1.683 1.75-3.133 1.75-2.35 0-3.886-1.81-3.886-4.576 0-2.893 1.624-4.784 4.136-4.784 1.22 0 2.17.518 2.724 1.38l.07-.008V9.68h2.39v5.98c0 1.41.58 2.23 1.652 2.23 1.384 0 2.163-1.29 2.163-3.59v-.31c0-3.78-2.4-6.367-6.614-6.367-4.504 0-7.186 2.883-7.186 7.504v.586c0 4.38 2.387 7.127 6.688 7.127h.007c1.476 0 2.81-.302 3.963-.899l.867 1.877C14.923 23.65 13.595 24 12.186 24zM12.217 12c-1.427 0-2.256 1.066-2.256 2.689 0 1.62.76 2.614 2.073 2.614 1.336 0 2.132-1.048 2.132-2.674 0-1.585-.787-2.63-1.949-2.63z" />
  </svg>
);

const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.39c.042.266.064.537.064.814 0 2.893-3.283 5.242-7.33 5.242-4.046 0-7.328-2.349-7.328-5.242 0-.277.022-.548.064-.814a1.606 1.606 0 01-.634-1.282 1.62 1.62 0 012.786-1.126c1.268-.868 2.98-1.42 4.895-1.47l.975-4.588a.36.36 0 01.432-.278l3.256.694a1.15 1.15 0 012.147.547 1.15 1.15 0 01-2.146.547l-2.836-.605-.868 4.082c1.876.065 3.548.618 4.79 1.472a1.615 1.615 0 012.783 1.126c0 .51-.236.965-.604 1.262zm-9.068 1.186a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3zm5.282 2.044c-1.16 1.16-3.386 1.25-4.28 1.25s-3.12-.1-4.28-1.25a.386.386 0 01.546-.546c.73.73 2.29.99 3.734.99 1.444 0 3.004-.26 3.734-.99a.386.386 0 01.546.546zM14.85 14.576a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3z" />
  </svg>
);

const BlueskyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.418 5.097 5.115 8.475 4.24 11.414c-.947 3.183.28 5.23 2.478 5.583-1.174.458-2.555 1.252-2.345 3.156.255 2.308 2.228 2.078 5.11 1.488.96-.196 1.632-.388 2.517-.388.885 0 1.557.192 2.517.388 2.882.59 4.855.82 5.11-1.488.21-1.904-1.171-2.698-2.345-3.156 2.198-.352 3.425-2.4 2.478-5.583C18.885 8.475 15.582 5.097 12 2z" />
  </svg>
);

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Platform definitions                                               */
/* ------------------------------------------------------------------ */

interface Platform {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}

const PLATFORMS: Platform[] = [
  { key: "instagram",        label: "Instagram",        icon: Instagram,     color: "text-pink-500",    bg: "bg-pink-50"   },
  { key: "tiktok",           label: "TikTok",           icon: TikTokIcon,    color: "text-gray-900",    bg: "bg-gray-100"  },
  { key: "youtube",          label: "YouTube",          icon: Youtube,       color: "text-red-600",     bg: "bg-red-50"    },
  { key: "facebook",         label: "Facebook",         icon: Facebook,      color: "text-blue-600",    bg: "bg-blue-50"   },
  { key: "x",                label: "X (Twitter)",      icon: Twitter,       color: "text-gray-900",    bg: "bg-gray-100"  },
  { key: "linkedin",         label: "LinkedIn",         icon: Linkedin,      color: "text-blue-700",    bg: "bg-blue-50"   },
  { key: "threads",          label: "Threads",          icon: ThreadsIcon,   color: "text-gray-900",    bg: "bg-gray-100"  },
  { key: "pinterest",        label: "Pinterest",        icon: PinterestIcon, color: "text-red-600",     bg: "bg-red-50"    },
  { key: "reddit",           label: "Reddit",           icon: RedditIcon,    color: "text-orange-500",  bg: "bg-orange-50" },
  { key: "bluesky",          label: "Bluesky",          icon: BlueskyIcon,   color: "text-blue-500",    bg: "bg-blue-50"   },
  { key: "google_business",  label: "Google Business",  icon: GoogleIcon,    color: "",                 bg: "bg-gray-50"   },
];

/* Match synced platform name to our key (handles "twitter"/"x" mismatch) */
function accountForPlatform(accounts: ConnectedAccountRow[], key: string): ConnectedAccountRow | undefined {
  const match = accounts.find((a) => a.platform === key);
  if (match) return match;
  // UploadPost may return "twitter" while we use "x" or vice-versa
  if (key === "x") return accounts.find((a) => a.platform === "twitter");
  if (key === "twitter") return accounts.find((a) => a.platform === "x");
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const CreatorSocials = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const initDone = useRef<string | null>(null);

  /* ---- Load accounts from Supabase ---- */
  const loadAccounts = useCallback(async () => {
    if (!userId) return;
    const list = await getConnectedAccounts(userId);
    setAccounts(list);
  }, [userId]);

  /* ---- Ensure UploadPost profile exists ---- */
  const ensureProfile = useCallback(async () => {
    if (!userId) return;
    const ensured = await ensureUploadPostProfile(userId);
    if (!ensured.ok) {
      toast.error(ensured.error ?? "Could not create UploadPost profile");
      return;
    }
    setProfileReady(true);
  }, [userId]);

  /* ---- Sync from UploadPost API → Supabase ---- */
  const syncAccounts = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const synced = await syncConnectedAccountsFromUploadPost(userId);
      setAccounts(synced);
      await syncDirectoryMemberStats(userId).catch(() => {});
      toast.success(
        synced.length > 0
          ? `Synced ${synced.length} account${synced.length !== 1 ? "s" : ""}`
          : "No connected accounts found. Try connecting above."
      );
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  /* ---- Init on mount: ensure profile, load accounts ---- */
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    if (initDone.current === userId) return;
    initDone.current = userId;
    setLoading(true);
    (async () => {
      await ensureProfile();
      await loadAccounts();
    })().finally(() => setLoading(false));
  }, [userId, ensureProfile, loadAccounts]);

  /* ---- Open UploadPost OAuth popup, sync on close ---- */
  const handleConnect = useCallback(async () => {
    if (!userId || !profileReady) {
      toast.error("Profile is still loading. Please wait.");
      return;
    }
    setConnecting(true);
    try {
      // Generate a fresh connect URL each time (JWT URLs expire)
      const res = await generateConnectUrl(userId);
      if (!res.access_url) {
        toast.error(res.error ?? "Could not generate connect link");
        return;
      }
      const popup = window.open(
        res.access_url,
        "connect_social",
        "width=600,height=700,scrollbars=yes"
      );
      if (!popup) {
        toast.error("Popup blocked. Please allow popups for this site.");
        return;
      }
      // Poll for popup close, then sync
      const timer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(timer);
          await syncAccounts();
        }
      }, 500);
    } finally {
      setConnecting(false);
    }
  }, [userId, profileReady, syncAccounts]);

  /* ---- Disconnect: remove from Supabase ---- */
  const handleDisconnect = async (account: ConnectedAccountRow) => {
    const { error } = await (supabase as any)
      .from("connected_accounts")
      .delete()
      .eq("id", account.id);
    if (error) {
      toast.error("Failed to disconnect");
      console.error(error);
    } else {
      toast.success("Account disconnected");
      await loadAccounts();
    }
  };

  /* ---- Not signed in ---- */
  if (!userId) {
    return (
      <CreatorLayout>
        <Card className="p-8">
          <p className="text-muted-foreground">Sign in to connect your social accounts.</p>
        </Card>
      </CreatorLayout>
    );
  }

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
          My Socials
        </h1>
        <p className="text-muted-foreground">
          Connect your social accounts to power your bio page, content scheduling, and brand discovery.
        </p>
      </div>

      {loading ? (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : (
        <Card className="bg-gradient-card border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Connected Accounts</h2>
              <p className="text-sm text-muted-foreground">
                Link your social media accounts to auto-sync content and analytics.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={syncAccounts}
              disabled={syncing}
              className="shrink-0"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Sync
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const connected = accountForPlatform(accounts, p.key);

              return (
                <div
                  key={p.key}
                  className="flex items-center justify-between border border-border rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${p.bg} ${p.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">{p.label}</span>
                      {connected?.platform_username && (
                        <p className="text-xs text-muted-foreground truncate">
                          @{connected.platform_username}
                        </p>
                      )}
                    </div>
                  </div>

                  {connected ? (
                    <button
                      onClick={() => handleDisconnect(connected)}
                      className="text-xs text-red-500 hover:text-red-400 transition-colors ml-2 shrink-0"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 shrink-0"
                      disabled={connecting}
                      onClick={handleConnect}
                    >
                      {connecting ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      ) : null}
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </CreatorLayout>
  );
};

export default CreatorSocials;
