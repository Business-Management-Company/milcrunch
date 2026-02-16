import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  List,
  Calendar,
  LayoutDashboard,
  Megaphone,
  Sun,
  Moon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export interface CommandAction {
  id: string;
  label: string;
  keywords?: string[];
  icon?: React.ComponentType<{ className?: string }>;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { setMode } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions: CommandAction[] = useMemo(() => [
    { id: "search-creators", label: "Search Creators", keywords: ["discover", "creator", "search"], icon: Search, run: () => { navigate("/brand/discover"); onOpenChange(false); } },
    { id: "view-lists", label: "View Lists", keywords: ["lists", "list"], icon: List, run: () => { navigate("/brand/lists"); onOpenChange(false); } },
    { id: "manage-events", label: "Manage Events", keywords: ["events", "calendar"], icon: Calendar, run: () => { navigate("/admin/events"); onOpenChange(false); } },
    { id: "dark-mode", label: "Switch to Dark Mode", keywords: ["dark", "theme"], icon: Moon, run: () => { setMode("dark"); onOpenChange(false); } },
    { id: "light-mode", label: "Switch to Light Mode", keywords: ["light", "theme"], icon: Sun, run: () => { setMode("light"); onOpenChange(false); } },
    { id: "dashboard", label: "Go to Dashboard", keywords: ["dashboard", "home"], icon: LayoutDashboard, run: () => { navigate("/dashboard"); onOpenChange(false); } },
    { id: "campaigns", label: "Go to Campaigns", keywords: ["campaigns", "campaign"], icon: Megaphone, run: () => { navigate("/brand/campaigns"); onOpenChange(false); } },
  ], [navigate, onOpenChange, setMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.keywords && a.keywords.some((k) => k.includes(q)))
    );
  }, [query, actions]);

  const select = useCallback(() => {
    const item = filtered[selectedIndex];
    if (item) item.run();
  }, [filtered, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filtered.length]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(1, filtered.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered.length, select, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-0 gap-0 overflow-hidden"
        onPointerDownOutside={() => onOpenChange(false)}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] px-3 pt-12">
          <Search className="h-4 w-4 text-pd-blue shrink-0" />
          <input
            type="text"
            placeholder="Search or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 py-3 px-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            autoFocus
            aria-label="Command search"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-border bg-muted/50 px-2 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
        <div className="max-h-[min(60vh,400px)] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No commands found.</p>
          ) : (
            <ul role="listbox" aria-label="Commands" className="space-y-0.5">
              {filtered.map((action, i) => {
                const Icon = action.icon;
                return (
                  <li
                    key={action.id}
                    role="option"
                    aria-selected={i === selectedIndex}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm rounded-lg mx-2",
                      i === selectedIndex
                        ? "bg-[#6C5CE7]/15 dark:bg-[#6C5CE7]/15 text-[#6C5CE7]"
                        : "text-foreground hover:bg-muted/80 dark:hover:bg-gray-800"
                    )}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={select}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span>{action.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
