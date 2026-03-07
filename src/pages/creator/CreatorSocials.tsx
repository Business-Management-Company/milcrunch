import { useState, useEffect, useCallback, useRef } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";
import { PlatformIcon } from "@/lib/platform-icons";
import { toast } from "sonner";

/* ── Platform definitions ── */

interface Platform {
  key: string;
  label: string;
  description: string;
  provider: string;
}

const PLATFORMS: Platform[] = [
  { key: "tiktok",          label: "TikTok",          description: "Sync your TikTok videos, analytics, and audience data",         provider: "tiktok"          },
  { key: "instagram",       label: "Instagram",       description: "Connect your Instagram to sync posts and engagement metrics",   provider: "instagram"       },
  { key: "linkedin",        label: "LinkedIn",        description: "Share professional content and track engagement",               provider: "linkedin"        },
  { key: "youtube",         label: "YouTube",         description: "Sync your YouTube channel videos, views, and subscribers",      provider: "youtube"         },
  { key: "facebook",        label: "Facebook",        description: "Connect your Facebook Page to sync insights and analytics",     provider: "facebook"        },
  { key: "x",               label: "X (Twitter)",     description: "Track tweets, engagement, and follower growth",                 provider: "twitter"         },
  { key: "threads",         label: "Threads",         description: "Connect your Threads account to post and track",               provider: "threads"         },
  { key: "pinterest",       label: "Pinterest",       description: "Share pins and track saves, clicks, and impressions",           provider: "pinterest"       },
  { key: "reddit",          label: "Reddit",          description: "Post to subreddits and track karma and engagement",             provider: "reddit"          },
  { key: "bluesky",         label: "Bluesky",         description: "Share posts on Bluesky and grow your audience",                 provider: "bluesky"         },
  { key: "google_business", label: "Google Business", description: "Manage your Google Business profile and posts",                provider: "google_business" },
];

function accountForPlatform(accounts: ConnectedAccountRow[], key: string): ConnectedAccountRow | undefined {
  const match = accounts.find((a) => a.platform === key);
  if (match) return match;
  if (key === "x") return accounts.find((a) => a.platform === "twitter");
  if (key === "twitter") return accounts.find((a) => a.platform === "x");
  return undefined;
}

function formatFollowers(count: number | null | undefined): string {
  if (!count) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

const REDIRECT_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/creator/socials?connected=true`
    : "";

/* ── Component ── */

const CreatorSocials = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnectAccount, setDisconnectAccount] = useState<ConnectedAccountRow | null>(null);
  const initDone = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Helper: fetch rows from creator_social_connections and set state */
  const refreshAccountsFromDB = useCallback(async () => {
    if (!userId) return;
    console.log("[CreatorSocials] refreshAccountsFromDB for", userId);
    const { data, error } = await supabase
      .from("creator_social_connections")
      .select("*")
      .eq("user_id", userId)
      .order("platform");
    console.log("[CreatorSocials] DB rows:", data?.length ?? 0, "error:", error?.message ?? "none");
    if (data && data.length > 0) {
      const mapped = data.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        platform: r.platform,
        platform_user_id: r.upload_post_account_id ?? null,
        platform_username: r.account_name ?? null,
        profile_image_url: r.account_avatar ?? null,
        followers_count: null,
        raw_data: null,
        created_at: r.connected_at,
        updated_at: r.connected_at,
      }));
      console.log("[CreatorSocials] Setting accounts state:", mapped.length, "accounts");
      setAccounts(mapped);
    }
  }, [userId]);

  /** Sync from UploadPost API → upsert to Supabase → refresh state */
  const syncAccounts = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      console.log("[CreatorSocials] syncAccounts starting...");
      // This calls the proxy, parses social_accounts, upserts to Supabase
      const synced = await syncConnectedAccountsFromUploadPost(userId);
      console.log("[CreatorSocials] syncConnectedAccountsFromUploadPost returned:", synced.length, "accounts");

      // If sync returned accounts, use those directly (already from Supabase re-fetch)
      if (synced.length > 0) {
        console.log("[CreatorSocials] Setting state from sync result:", JSON.stringify(synced.map(a => a.platform)));
        setAccounts(synced);
        toast.success(`Synced ${synced.length} account${synced.length !== 1 ? "s" : ""}`);
      } else {
        // Sync returned nothing — try reading Supabase directly
        console.log("[CreatorSocials] Sync returned 0 — refreshing from DB...");
        await refreshAccountsFromDB();
      }

      // Background: sync directory stats
      syncDirectoryMemberStats(userId).catch(() => {});
    } catch (err) {
      console.error("[CreatorSocials] syncAccounts error:", err);
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [userId, refreshAccountsFromDB]);

  /** On mount: sync immediately and automatically */
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    if (initDone.current) return;
    initDone.current = true;

    console.log("[CreatorSocials] Mount — starting auto-sync for", userId);
    setLoading(true);

    // Ensure profile exists (fire-and-forget, don't block sync)
    ensureUploadPostProfile(userId).catch(() => {});

    // Sync immediately
    syncAccounts().finally(() => setLoading(false));
  }, [userId, syncAccounts]);

  /** Auto-sync on ?connected=true return from OAuth */
  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      syncAccounts();
    }
  }, [userId, syncAccounts]);

  /* ── Open popup for a specific platform ── */
  const handleConnect = useCallback((provider: string) => {
    if (!userId) {
      toast.error("Please sign in first.");
      return;
    }
    const popup = window.open(
      "about:blank",
      "connect_social",
      "width=600,height=700,left=200,top=100"
    );
    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }
    setConnecting(true);
    generateConnectUrl({
      userId,
      redirectUrl: REDIRECT_URL,
      provider,
    }).then((res) => {
      setConnecting(false);
      if (!res.access_url) {
        popup.close();
        toast.error(res.error ?? "Could not generate connect link");
        return;
      }
      popup.location.href = res.access_url;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            syncAccounts();
            return;
          }
          if (popup.location.href.includes("/creator/socials?connected=true")) {
            popup.close();
            clearInterval(pollRef.current!);
            pollRef.current = null;
            syncAccounts();
          }
        } catch { /* cross-origin — expected */ }
      }, 500);
    }).catch(() => {
      setConnecting(false);
      popup.close();
      toast.error("Could not generate connect link");
    });
  }, [userId, syncAccounts]);

  /* ── Disconnect with confirmation ── */
  const confirmDisconnect = async () => {
    if (!disconnectAccount || !userId) return;
    await (supabase as any)
      .from("connected_accounts")
      .delete()
      .eq("id", disconnectAccount.id);
    await supabase
      .from("creator_social_connections")
      .delete()
      .eq("user_id", userId)
      .eq("platform", disconnectAccount.platform);
    toast.success("Account disconnected");
    await loadAccounts();
    setDisconnectDialogOpen(false);
    setDisconnectAccount(null);
  };

  /* Cleanup polling on unmount */
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (!userId) {
    return (
      <CreatorLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Sign in to connect your social accounts.</p>
        </div>
      </CreatorLayout>
    );
  }

  return (
    <CreatorLayout>
      {/* ── Header — Seeksy-style ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <LinkIcon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Social Media</h1>
        </div>
        <p className="text-muted-foreground">
          Connect your social media accounts to sync data, track performance, and publish content
        </p>
      </div>

      {/* ── Sync All button ── */}
      <div className="flex justify-end mb-6">
        <Button variant="outline" size="sm" onClick={syncAccounts} disabled={syncing}>
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Sync All
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLATFORMS.map((p) => {
            const connected = accountForPlatform(accounts, p.key);
            const isConnected = !!connected;

            return (
              <Card
                key={p.key}
                className={`border-2 transition-all ${
                  isConnected
                    ? "border-green-200 dark:border-green-900"
                    : "hover:shadow-lg"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <PlatformIcon platform={p.key} size={24} />
                    {isConnected ? (
                      <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Available</Badge>
                    )}
                  </div>
                  <CardTitle>{p.label}</CardTitle>
                  <CardDescription className="min-h-[40px]">
                    {isConnected
                      ? `Your ${p.label} account is connected and ready to post`
                      : p.description}
                  </CardDescription>

                  {/* Connected profile preview — Seeksy-style */}
                  {isConnected && connected && (
                    <div className="flex items-center gap-3 mt-3 p-3 bg-muted/50 rounded-lg">
                      {connected.profile_image_url ? (
                        <img
                          src={connected.profile_image_url}
                          alt={connected.platform_username ?? ""}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <PlatformIcon platform={p.key} size={28} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {connected.platform_username ? `@${connected.platform_username}` : p.label}
                        </p>
                        {connected.followers_count != null && connected.followers_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatFollowers(connected.followers_count)} followers
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {isConnected ? (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={syncAccounts}
                        disabled={syncing}
                      >
                        {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                        Sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground hover:text-destructive gap-1.5"
                        onClick={() => {
                          setDisconnectAccount(connected);
                          setDisconnectDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleConnect(p.provider)}
                      disabled={connecting}
                    >
                      {connecting ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Disconnect confirmation dialog ── */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to your{" "}
              {PLATFORMS.find((p) => p.key === disconnectAccount?.platform || p.provider === disconnectAccount?.platform)?.label ?? disconnectAccount?.platform}{" "}
              account. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CreatorLayout>
  );
};

export default CreatorSocials;
