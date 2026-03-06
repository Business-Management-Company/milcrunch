import { useState, useEffect, useCallback } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, X, Unlink } from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Platform definitions                                               */
/* ------------------------------------------------------------------ */

interface Platform {
  key: string;
  label: string;
  color: string;        // brand color for the icon circle
  placeholder: string;  // input placeholder
}

const PLATFORMS: Platform[] = [
  { key: "instagram",        label: "Instagram",        color: "#E1306C", placeholder: "@username" },
  { key: "tiktok",           label: "TikTok",           color: "#000000", placeholder: "@username" },
  { key: "youtube",          label: "YouTube",          color: "#FF0000", placeholder: "@channel or URL" },
  { key: "facebook",         label: "Facebook",         color: "#1877F2", placeholder: "Page or profile name" },
  { key: "x",                label: "X (Twitter)",      color: "#000000", placeholder: "@handle" },
  { key: "linkedin",         label: "LinkedIn",         color: "#0A66C2", placeholder: "Profile URL or name" },
  { key: "threads",          label: "Threads",          color: "#000000", placeholder: "@username" },
  { key: "pinterest",        label: "Pinterest",        color: "#E60023", placeholder: "@username" },
  { key: "reddit",           label: "Reddit",           color: "#FF4500", placeholder: "u/username" },
  { key: "bluesky",          label: "Bluesky",          color: "#0085FF", placeholder: "@handle.bsky.social" },
  { key: "google_business",  label: "Google Business",  color: "#4285F4", placeholder: "Business name" },
];

/* Simple SVG-style icon — first letter(s) in a brand-colored circle */
function PlatformIcon({ platform }: { platform: Platform }) {
  const abbr =
    platform.key === "google_business"
      ? "G"
      : platform.key === "x"
        ? "X"
        : platform.label.charAt(0);

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
      style={{ backgroundColor: platform.color }}
    >
      {abbr}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConnectedAccount {
  id: string;
  platform: string;
  platform_username: string | null;
  created_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const CreatorSocials = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Track which platform card is in "editing" mode and the draft username
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---- Load connected accounts ---- */
  const loadAccounts = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await (supabase as any)
      .from("connected_accounts")
      .select("id, platform, platform_username, created_at")
      .eq("user_id", userId);
    if (error) {
      console.error("Failed to load connected accounts", error);
    } else {
      setAccounts(data ?? []);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    loadAccounts().finally(() => setLoading(false));
  }, [loadAccounts]);

  /* ---- Helpers ---- */
  const accountFor = (platformKey: string) =>
    accounts.find((a) => a.platform === platformKey);

  /* ---- Connect (upsert) ---- */
  const handleSave = async (platformKey: string) => {
    if (!userId || !draft.trim()) return;
    setSaving(true);
    const existing = accountFor(platformKey);
    if (existing) {
      // Update
      const { error } = await (supabase as any)
        .from("connected_accounts")
        .update({ platform_username: draft.trim(), updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) {
        toast.error("Failed to update account");
        console.error(error);
      } else {
        toast.success("Account updated");
      }
    } else {
      // Insert
      const { error } = await (supabase as any)
        .from("connected_accounts")
        .insert({
          user_id: userId,
          platform: platformKey,
          platform_username: draft.trim(),
        });
      if (error) {
        toast.error("Failed to connect account");
        console.error(error);
      } else {
        toast.success("Account connected");
      }
    }
    setSaving(false);
    setEditing(null);
    setDraft("");
    await loadAccounts();
  };

  /* ---- Disconnect ---- */
  const handleDisconnect = async (platformKey: string) => {
    const existing = accountFor(platformKey);
    if (!existing) return;
    const { error } = await (supabase as any)
      .from("connected_accounts")
      .delete()
      .eq("id", existing.id);
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
          My Socials
        </h1>
        <p className="text-muted-foreground">
          Connect your social accounts to power your bio page, content scheduling, and brand discovery.
        </p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading accounts…
        </div>
      ) : (
        /* Platform grid — 2 columns on md+ */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATFORMS.map((p) => {
            const connected = accountFor(p.key);
            const isEditing = editing === p.key;

            return (
              <Card
                key={p.key}
                className="bg-[#000741]/60 border-white/10 p-5 flex flex-col gap-3"
              >
                {/* Top row: icon + name + status */}
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={p} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{p.label}</p>
                    {connected && !isEditing && (
                      <p className="text-sm text-muted-foreground truncate">
                        {connected.platform_username}
                      </p>
                    )}
                  </div>

                  {/* Right side: status badge or action */}
                  {connected && !isEditing ? (
                    <span className="flex items-center gap-1 text-sm text-emerald-400 font-medium">
                      <Check className="h-4 w-4" />
                      Connected
                    </span>
                  ) : null}
                </div>

                {/* Editing row */}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={p.placeholder}
                      className="bg-white/10 border-white/20 text-foreground placeholder:text-white/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(p.key);
                        if (e.key === "Escape") {
                          setEditing(null);
                          setDraft("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSave(p.key)}
                      disabled={saving || !draft.trim()}
                      className="shrink-0"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditing(null); setDraft(""); }}
                      className="shrink-0 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Action buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-foreground hover:bg-white/10"
                          onClick={() => {
                            setEditing(p.key);
                            setDraft(connected.platform_username ?? "");
                          }}
                        >
                          Edit
                        </Button>
                        <button
                          onClick={() => handleDisconnect(p.key)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
                        >
                          <Unlink className="h-3 w-3" />
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditing(p.key);
                          setDraft("");
                        }}
                        className="bg-white/10 hover:bg-white/20 text-foreground border border-white/20"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </CreatorLayout>
  );
};

export default CreatorSocials;
