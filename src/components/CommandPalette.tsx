import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  List,
  Calendar,
  LayoutDashboard,
  Megaphone,
  Sun,
  Moon,
  Users,
  Mail,
  ClipboardList,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ─────────────────────────────────────────────────────────── */

type Category = "creators" | "campaigns" | "lists" | "events";

interface SearchResult {
  id: string;
  category: Category;
  title: string;
  subtitle?: string;
  href: string;
}

interface FlatItem {
  kind: "shortcut" | "result";
  id: string;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  run: () => void;
  /** Category header to render above this item (first of its group) */
  categoryHeader?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon }> = {
  creators: { label: "Creators", icon: Users },
  campaigns: { label: "Campaigns", icon: Mail },
  lists: { label: "Lists", icon: ClipboardList },
  events: { label: "Events", icon: Calendar },
};

const CATEGORY_ORDER: Category[] = ["creators", "campaigns", "lists", "events"];

/* ── Component ─────────────────────────────────────────────────────── */

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { setMode } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const listRef = useRef<HTMLUListElement>(null);

  /* ── Helpers ── */

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const go = useCallback(
    (href: string) => {
      navigate(href);
      close();
    },
    [navigate, close],
  );

  /* ── Static shortcuts (shown when query is empty) ── */

  const shortcuts = useMemo(
    () => [
      { id: "nav-discover", label: "Search Creators", keywords: ["discover", "creator", "search"], icon: Search, run: () => go("/brand/discover") },
      { id: "nav-lists", label: "View Lists", keywords: ["lists", "list"], icon: List, run: () => go("/brand/lists") },
      { id: "nav-events", label: "Manage Events", keywords: ["events", "calendar"], icon: Calendar, run: () => go("/brand/events") },
      { id: "nav-dashboard", label: "Go to Dashboard", keywords: ["dashboard", "home"], icon: LayoutDashboard, run: () => go("/brand/dashboard") },
      { id: "nav-campaigns", label: "Go to Campaigns", keywords: ["campaigns", "campaign"], icon: Megaphone, run: () => go("/brand/email/campaigns") },
      { id: "theme-dark", label: "Switch to Dark Mode", keywords: ["dark", "theme"], icon: Moon, run: () => { setMode("dark"); close(); } },
      { id: "theme-light", label: "Switch to Light Mode", keywords: ["light", "theme"], icon: Sun, run: () => { setMode("light"); close(); } },
    ],
    [go, setMode, close],
  );

  /* ── Build flat item list for rendering + keyboard nav ── */

  const items: FlatItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    // No query → show shortcuts
    if (!q) {
      return shortcuts.map((s) => ({
        kind: "shortcut" as const,
        id: s.id,
        label: s.label,
        icon: s.icon,
        run: s.run,
      }));
    }

    // Has query → show search results grouped by category
    const grouped = new Map<Category, SearchResult[]>();
    for (const r of results) {
      const arr = grouped.get(r.category) ?? [];
      arr.push(r);
      grouped.set(r.category, arr);
    }

    const flat: FlatItem[] = [];
    for (const cat of CATEGORY_ORDER) {
      const group = grouped.get(cat);
      if (!group || group.length === 0) continue;
      const meta = CATEGORY_META[cat];
      for (let i = 0; i < group.length; i++) {
        const r = group[i];
        flat.push({
          kind: "result",
          id: r.id,
          label: r.title,
          subtitle: r.subtitle,
          icon: meta.icon,
          run: () => go(r.href),
          categoryHeader: i === 0 ? meta.label : undefined,
        });
      }
    }

    // If no DB results yet, also filter shortcuts that match the query
    if (flat.length === 0 && loading) {
      return shortcuts
        .filter(
          (s) =>
            s.label.toLowerCase().includes(q) ||
            s.keywords.some((k) => k.includes(q)),
        )
        .map((s) => ({
          kind: "shortcut" as const,
          id: s.id,
          label: s.label,
          icon: s.icon,
          run: s.run,
        }));
    }

    return flat;
  }, [query, results, shortcuts, loading, go]);

  /* ── Supabase search ── */

  const performSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const pattern = `%${term}%`;

    try {
      const [creatorsRes, campaignsRes, listsRes, eventsRes] = await Promise.all([
        supabase
          .from("directory_members")
          .select("id, creator_name, creator_handle, avatar_url")
          .or(`creator_name.ilike.${pattern},creator_handle.ilike.${pattern}`)
          .limit(3),
        supabase
          .from("email_campaigns")
          .select("id, name, subject, status")
          .or(`name.ilike.${pattern},subject.ilike.${pattern}`)
          .limit(3),
        supabase
          .from("influencer_lists")
          .select("id, name, description")
          .or(`name.ilike.${pattern},description.ilike.${pattern}`)
          .limit(3),
        supabase
          .from("events")
          .select("id, title, city, state, venue, start_date")
          .or(`title.ilike.${pattern},city.ilike.${pattern},venue.ilike.${pattern}`)
          .limit(3),
      ]);

      const all: SearchResult[] = [];

      for (const c of (creatorsRes.data as any[]) ?? []) {
        all.push({
          id: `creator-${c.id}`,
          category: "creators",
          title: c.creator_name || c.creator_handle || "Unknown",
          subtitle: c.creator_handle ? `@${c.creator_handle}` : undefined,
          href: "/brand/directories",
        });
      }

      for (const c of (campaignsRes.data as any[]) ?? []) {
        all.push({
          id: `campaign-${c.id}`,
          category: "campaigns",
          title: c.name || "Untitled",
          subtitle: c.subject || c.status || undefined,
          href: "/brand/email/campaigns",
        });
      }

      for (const l of (listsRes.data as any[]) ?? []) {
        all.push({
          id: `list-${l.id}`,
          category: "lists",
          title: l.name || "Untitled",
          subtitle: l.description ? l.description.slice(0, 60) : undefined,
          href: `/brand/lists/${l.id}`,
        });
      }

      for (const e of (eventsRes.data as any[]) ?? []) {
        const loc = [e.venue, e.city, e.state].filter(Boolean).join(", ");
        all.push({
          id: `event-${e.id}`,
          category: "events",
          title: e.title || "Untitled",
          subtitle: loc || (e.start_date ? new Date(e.start_date).toLocaleDateString() : undefined),
          href: `/brand/events/${e.id}`,
        });
      }

      setResults(all.slice(0, 10));
    } catch (err) {
      console.error("[CommandPalette] search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Debounced query effect ── */

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, performSearch]);

  /* ── Reset on open/close ── */

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    setResults([]);
    setLoading(false);
  }, [open]);

  /* ── Keep selectedIndex in bounds ── */

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  /* ── Select current item ── */

  const select = useCallback(() => {
    const item = items[selectedIndex];
    if (item) item.run();
  }, [items, selectedIndex]);

  /* ── Keyboard navigation ── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(1, items.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + items.length) % Math.max(1, items.length));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, items.length, select, close]);

  /* ── Auto-scroll selected item into view ── */

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  /* ── Render ── */

  const isSearchMode = query.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-0 gap-0 overflow-hidden"
        onPointerDownOutside={() => onOpenChange(false)}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] px-3 pt-12">
          {loading ? (
            <Loader2 className="h-4 w-4 text-pd-blue shrink-0 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-pd-blue shrink-0" />
          )}
          <input
            type="text"
            placeholder="Search creators, campaigns, events..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 py-3 px-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            autoFocus
            aria-label="Global search"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-border bg-muted/50 px-2 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        {/* Results / shortcuts list */}
        <div className="max-h-[min(60vh,400px)] overflow-y-auto py-2">
          {items.length === 0 && !loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {isSearchMode ? "No results found." : "No commands found."}
            </p>
          ) : items.length === 0 && loading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : (
            <ul ref={listRef} role="listbox" aria-label="Search results" className="space-y-0.5">
              {items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} data-index={i}>
                    {/* Category header */}
                    {item.categoryHeader && (
                      <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {item.categoryHeader}
                      </div>
                    )}
                    <div
                      role="option"
                      aria-selected={i === selectedIndex}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm rounded-lg mx-2",
                        i === selectedIndex
                          ? "bg-[#1e3a5f]/15 dark:bg-[#1e3a5f]/15 text-[#1e3a5f]"
                          : "text-foreground hover:bg-muted/80 dark:hover:bg-gray-800",
                      )}
                      onMouseEnter={() => setSelectedIndex(i)}
                      onClick={() => item.run()}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{item.label}</span>
                        {item.subtitle && (
                          <span className="truncate block text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Footer hint */}
          {isSearchMode && !loading && items.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                <kbd className="font-mono">↑↓</kbd> navigate &middot;{" "}
                <kbd className="font-mono">↵</kbd> open &middot;{" "}
                <kbd className="font-mono">esc</kbd> close
              </span>
              <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
