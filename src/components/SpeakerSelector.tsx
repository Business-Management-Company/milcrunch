import { useState, useEffect, useRef, useCallback } from "react";
import { getCreatorAvatar } from "@/lib/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, X, Plus, Loader2, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ---------- types ---------- */
export interface SpeakerOption {
  id: string;
  name: string;
  topic: string | null;
  bio: string | null;
  avatar_url: string | null;
  branch: string | null;
}

interface SpeakerSelectorProps {
  /** Current value — single name string */
  value: string;
  /** Called with the speaker name when selected or typed */
  onChange: (name: string) => void;
  /** Called with the full speaker option when one is picked from the dropdown */
  onSelect?: (speaker: SpeakerOption) => void;
  placeholder?: string;
  className?: string;
  /** Compact mode for inline table cells */
  compact?: boolean;
}

/* ---------- helpers ---------- */
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarFallback(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6C5CE7&color=fff&size=128`;
}

/* ---------- component ---------- */
export default function SpeakerSelector({
  value,
  onChange,
  onSelect,
  placeholder = "Search speakers...",
  className,
  compact = false,
}: SpeakerSelectorProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SpeakerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Search speakers from both tables
  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      // Search the global speakers directory
      let speakersQ = supabase
        .from("speakers")
        .select("id, name, bio, photo_url, branch")
        .order("name")
        .limit(15);
      if (q.trim()) {
        speakersQ = speakersQ.ilike("name", `%${q.trim()}%`);
      }
      const { data: speakersData } = await speakersQ;

      // Also search confirmed event_speakers (deduplicate by name)
      let eventSpkQ = supabase
        .from("event_speakers")
        .select("id, creator_name, topic, bio, avatar_url")
        .eq("confirmed", true)
        .order("creator_name")
        .limit(15);
      if (q.trim()) {
        eventSpkQ = eventSpkQ.ilike("creator_name", `%${q.trim()}%`);
      }
      const { data: eventSpkData } = await eventSpkQ;

      // Merge results — global speakers first, then confirmed event speakers
      const seen = new Set<string>();
      const merged: SpeakerOption[] = [];

      for (const s of speakersData || []) {
        const key = (s.name || "").toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push({
          id: s.id,
          name: s.name,
          topic: null,
          bio: s.bio,
          avatar_url: s.photo_url,
          branch: s.branch,
        });
      }

      for (const s of eventSpkData || []) {
        const key = (s.creator_name || "").toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push({
          id: s.id,
          name: s.creator_name || "",
          topic: s.topic,
          bio: s.bio,
          avatar_url: s.avatar_url,
          branch: null,
        });
      }

      setResults(merged);
    } catch (err) {
      console.error("SpeakerSelector search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val);
    if (!open) setOpen(true);
  };

  const handleSelect = (speaker: SpeakerOption) => {
    setQuery(speaker.name);
    onChange(speaker.name);
    onSelect?.(speaker);
    setOpen(false);
  };

  const handleFocus = () => {
    setOpen(true);
    search(query);
  };

  return (
    <>
      <div ref={wrapRef} className={cn("relative", className)}>
        <div className="relative">
          {!compact && (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={cn(compact ? "h-7 text-xs" : "pl-9")}
          />
        </div>

        {/* Dropdown */}
        {open && (
          <div
            className={cn(
              "absolute z-50 w-full mt-1 rounded-lg border bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-700 shadow-lg max-h-[280px] overflow-y-auto",
              compact && "min-w-[260px]"
            )}
          >
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 px-3">
                {query.trim()
                  ? "No speakers found"
                  : "No verified speakers yet \u2014 invite one below"}
              </p>
            )}

            {!loading &&
              results.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {getCreatorAvatar(s) ? (
                      <img
                        src={getCreatorAvatar(s)!}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = avatarFallback(s.name);
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-[#1e3a5f]">
                        {initials(s.name)}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {s.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.topic || s.branch || s.bio || "Speaker"}
                    </p>
                  </div>
                </button>
              ))}

            {/* Invite new speaker */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setInviteOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-700 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Invite New Speaker
            </button>
          </div>
        )}
      </div>

      {/* Quick-add modal */}
      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onAdded={(speaker) => {
          handleSelect(speaker);
          setInviteOpen(false);
        }}
      />
    </>
  );
}

/* ---------- Multi-select variant ---------- */

interface SpeakerMultiSelectorProps {
  /** Comma-separated speaker names */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SpeakerMultiSelector({
  value,
  onChange,
  placeholder = "Search speakers...",
  className,
}: SpeakerMultiSelectorProps) {
  const names = value
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  const removeName = (name: string) => {
    onChange(names.filter((n) => n !== name).join(", "));
  };

  const addName = (name: string) => {
    if (names.includes(name)) return;
    onChange([...names, name].join(", "));
  };

  return (
    <div className={className}>
      {/* Pills */}
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {names.map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-medium"
            >
              {n}
              <button
                type="button"
                onClick={() => removeName(n)}
                className="hover:text-[#4a3bc2] ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <SpeakerSelector
        value=""
        onChange={() => {}}
        onSelect={(s) => addName(s.name)}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ---------- Invite Modal ---------- */

function InviteModal({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (speaker: SpeakerOption) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("speakers")
      .insert({ name: name.trim(), bio: topic.trim() || null })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Failed to add speaker");
      console.error(error);
      return;
    }
    toast.success(`${name.trim()} added to speaker directory`);
    onAdded({
      id: data.id,
      name: name.trim(),
      topic: topic.trim() || null,
      bio: topic.trim() || null,
      avatar_url: null,
      branch: null,
    });
    setName("");
    setEmail("");
    setTopic("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Speaker</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Speaker name"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="speaker@example.com"
            />
          </div>
          <div>
            <Label>Topic</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Talk topic or panel name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Mic className="h-4 w-4 mr-1" />
            )}
            Add Speaker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
