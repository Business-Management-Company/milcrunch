import { useState } from "react";
import { Share2, Loader2, Check, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function StrategyShareButton({ content }: { content: string }) {
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Only show if content contains both strategy sections
  const isStrategy =
    /##\s*Recommended Creators/i.test(content) &&
    /##\s*(Quick\s+)?GTM Strategy/i.test(content);
  if (!isStrategy) return null;

  const handleShare = async () => {
    setSaving(true);
    // Extract title from the first heading or use default
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch?.[1] ?? "Strategy Brief";

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await (supabase as any)
      .from("ai_strategy_briefs")
      .insert({
        title,
        content,
        event_description: "",
        creator_handles: [],
        created_by: userData?.user?.id ?? null,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error || !data) return;

    const url = `${window.location.origin}/strategy/${(data as { id: string }).id}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard may not be available */ }
  };

  if (shareUrl) {
    return (
      <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <LinkIcon className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline truncate flex-1"
        >
          {shareUrl}
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
          className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex-shrink-0 flex items-center gap-1"
        >
          {copied ? <><Check className="h-3 w-3" /> Copied</> : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={saving}
      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e3a5f] hover:bg-[#2d5282] text-white text-sm font-semibold transition-colors disabled:opacity-60"
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Share2 className="h-3.5 w-3.5" />
      )}
      Share Strategy
    </button>
  );
}
