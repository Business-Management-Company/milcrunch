import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { generateConnectUrl } from "@/services/upload-post";
import {
  syncConnectedAccountsFromUploadPost,
  getConnectedAccounts,
  ensureUploadPostProfile,
  syncDirectoryMemberStats,
  type ConnectedAccountRow,
} from "@/lib/upload-post-sync";
import { toast } from "sonner";

export function useUploadPostConnect() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const initDone = useRef<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!userId) return;
    const list = await getConnectedAccounts(userId);
    setAccounts(list);
  }, [userId]);

  const ensureProfileAndGetUrl = useCallback(async () => {
    if (!userId) return;
    setConnectLoading(true);
    try {
      const ensured = await ensureUploadPostProfile(userId);
      if (!ensured.ok) {
        toast.error(ensured.error ?? "Could not create profile");
        return;
      }
      const res = await generateConnectUrl({ userId });
      if (res.access_url) setConnectUrl(res.access_url);
      else toast.error(res.error ?? "Could not generate connect link");
    } finally {
      setConnectLoading(false);
    }
  }, [userId]);

  const syncAccounts = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const synced = await syncConnectedAccountsFromUploadPost(userId);
      setAccounts(synced);
      // Also sync directory member stats
      await syncDirectoryMemberStats(userId).catch(() => {});
      toast.success(
        synced.length > 0
          ? `Synced ${synced.length} connected account${synced.length !== 1 ? "s" : ""}`
          : "No connected accounts yet. Connect above."
      );
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  const openConnectPopup = useCallback(() => {
    if (!connectUrl) {
      toast.error("Connect link is still loading. Please wait.");
      return;
    }
    const popup = window.open(connectUrl, "uploadpost-connect", "width=600,height=700");
    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }
    // Poll for popup close, then auto-sync
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        syncAccounts();
      }
    }, 1500);
  }, [connectUrl, syncAccounts]);

  // Init on mount — run only once per userId
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (initDone.current === userId) return;
    initDone.current = userId;
    setLoading(true);
    (async () => {
      await ensureProfileAndGetUrl();
      await loadAccounts();
    })().finally(() => setLoading(false));
  }, [userId, ensureProfileAndGetUrl, loadAccounts]);

  return {
    accounts,
    loading,
    connectLoading,
    syncing,
    connectUrl,
    openConnectPopup,
    syncAccounts,
  };
}
