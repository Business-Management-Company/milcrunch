import { useState, useEffect, useCallback } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { generateConnectUrl } from "@/services/upload-post";
import {
  syncConnectedAccountsFromUploadPost,
  getConnectedAccounts,
  ensureUploadPostProfile,
  type ConnectedAccountRow,
} from "@/lib/upload-post-sync";
import { Loader2, Link2, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X (Twitter)",
  threads: "Threads",
  pinterest: "Pinterest",
  reddit: "Reddit",
  bluesky: "Bluesky",
};

function formatFollowers(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const CreatorSocials = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!userId) return;
    const list = await getConnectedAccounts(userId);
    setAccounts(list);
  }, [userId]);

  const ensureProfileAndConnectUrl = useCallback(async () => {
    if (!userId) return;
    setConnectLoading(true);
    try {
      const ensured = await ensureUploadPostProfile(userId);
      if (!ensured.ok) {
        toast.error(ensured.error ?? "Could not create profile");
        setConnectLoading(false);
        return;
      }
      const res = await generateConnectUrl(userId);
      if (res.access_url) setConnectUrl(res.access_url);
      else toast.error(res.error ?? "Could not generate connect link");
    } finally {
      setConnectLoading(false);
    }
  }, [userId]);

  const syncFromUploadPost = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const synced = await syncConnectedAccountsFromUploadPost(userId);
      setAccounts(synced);
      toast.success(
        synced.length > 0
          ? `Synced ${synced.length} connected account${synced.length !== 1 ? "s" : ""}`
          : "No connected accounts yet. Connect above."
      );
    } catch (e) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      await ensureProfileAndConnectUrl();
      await loadAccounts();
    })().finally(() => setLoading(false));
  }, [userId, ensureProfileAndConnectUrl, loadAccounts]);

  const openConnect = () => {
    if (connectUrl) window.open(connectUrl, "uploadpost-connect", "width=600,height=700");
    else toast.error("Connect link not ready");
  };

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
          Connected Socials
        </h1>
        <p className="text-muted-foreground">
          Connect once, use everywhere. Your linked accounts power your bio page, content scheduling, and brand discovery.
        </p>
      </div>

      {/* Connect Your Socials */}
      <Card className="bg-gradient-card border-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Connect Your Socials
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Link your Instagram, TikTok, and other platforms via Upload-Post. One connection is used across ParadeDeck.
        </p>
        {loading && !connectUrl ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing connect link…</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={openConnect}
              disabled={connectLoading}
              className="rounded-lg"
            >
              {connectLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Open Connect Page
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                ensureProfileAndConnectUrl();
                openConnect();
              }}
              disabled={connectLoading}
              className="rounded-lg"
            >
              Refresh link
            </Button>
            <Button
              variant="outline"
              onClick={syncFromUploadPost}
              disabled={syncing}
              className="rounded-lg"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync accounts
            </Button>
          </div>
        )}
      </Card>

      {/* Connected accounts */}
      <Card className="bg-gradient-card border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Connected accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-muted-foreground">
            No accounts connected yet. Click &quot;Open Connect Page&quot; above to link your socials.
          </p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((acc) => (
              <li
                key={`${acc.platform}-${acc.platform_username ?? acc.id}`}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
              >
                {acc.profile_image_url ? (
                  <img
                    src={acc.profile_image_url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {(acc.platform ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {PLATFORM_LABELS[acc.platform] ?? acc.platform}
                  </p>
                  {acc.platform_username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{acc.platform_username}
                    </p>
                  )}
                </div>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatFollowers(acc.followers_count)} followers
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </CreatorLayout>
  );
};

export default CreatorSocials;
