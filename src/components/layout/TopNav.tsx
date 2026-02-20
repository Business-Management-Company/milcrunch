import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Bell, ChevronDown, TrendingUp, Star, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { usePresentationMode } from "@/hooks/usePresentationMode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function getInitials(name: string | undefined, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0];
  return local.slice(0, 2).toUpperCase();
}

interface TopNavProps {
  onOpenCommandPalette: () => void;
  demoOffset?: number;
}

const ALERT_ICONS: Record<string, React.ReactNode> = {
  spike: <TrendingUp className="h-3.5 w-3.5 text-purple-500" />,
  influencer: <Star className="h-3.5 w-3.5 text-amber-500" />,
  milestone: <Target className="h-3.5 w-3.5 text-green-500" />,
};

const MOCK_ALERTS = [
  { id: "a1", message: "#MIC2026 mentions up 340% this week", type: "spike", is_read: false },
  { id: "a2", message: "@johnny_marines (168K) mentioned #MIC2026", type: "influencer", is_read: false },
  { id: "a3", message: "#MilSpouseFest hit 500 total mentions", type: "milestone", is_read: true },
];

export default function TopNav({ onOpenCommandPalette, demoOffset = 0 }: TopNavProps) {
  const { user, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const pres = usePresentationMode();
  const displayName = pres.displayName;
  const initials = pres.initials ?? getInitials(user?.user_metadata?.full_name as string, user?.email ?? "");
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const markAllRead = () => setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <header
      className={cn(
        "fixed left-0 right-0 z-40 h-14 flex items-center justify-between px-4 gap-4",
        "bg-white dark:bg-[#0F1117] border-b border-gray-200 dark:border-gray-800 shadow-sm"
      )}
      style={{ top: demoOffset }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/brand/dashboard" className="flex items-center shrink-0" aria-label="MilCrunch home">
          <span className="font-bold text-lg text-foreground tracking-tight hidden sm:inline">MilCrunch<span className="text-[#6C5CE7] font-extrabold">X</span></span>
        </Link>
      </div>

      <button
        type="button"
        onClick={onOpenCommandPalette}
        className={cn(
          "flex-1 max-w-xl mx-4 flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700",
          "bg-pd-page-light/80 dark:bg-[#1A1D27] px-4 py-2.5 text-sm text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800",
          "transition-colors"
        )}
      >
        <span className="truncate">Search or type a command...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative" aria-label="Notifications">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#6C5CE7] hover:underline">Mark all read</button>
              )}
            </div>
            <DropdownMenuSeparator />
            {alerts.map((a) => (
              <DropdownMenuItem
                key={a.id}
                className={cn("flex items-start gap-2 px-3 py-2.5 cursor-pointer", !a.is_read && "bg-purple-50/50 dark:bg-purple-900/10")}
                onClick={() => {
                  setAlerts((prev) => prev.map((x) => x.id === a.id ? { ...x, is_read: true } : x));
                  navigate("/social-monitoring");
                }}
              >
                <span className="mt-0.5 shrink-0">{ALERT_ICONS[a.type] || ALERT_ICONS.spike}</span>
                <span className={cn("text-xs", a.is_read ? "text-muted-foreground" : "text-foreground font-medium")}>{a.message}</span>
                {!a.is_read && <span className="ml-auto w-2 h-2 rounded-full bg-[#6C5CE7] shrink-0 mt-1" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center text-xs text-[#6C5CE7] cursor-pointer" onClick={() => navigate("/social-monitoring")}>
              View all in Social Monitoring
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1.5">
              <div className="h-8 w-8 rounded-full bg-pd-blue/20 flex items-center justify-center">
                <span className="text-sm font-medium text-pd-blue">{initials || "?"}</span>
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline truncate max-w-[120px]">{displayName}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isSuperAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/admin">⚡ View as Admin</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/creator/dashboard">View as Creator</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to="/brand/dashboard">Dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/brand/discover">Discover</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/brand/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground cursor-pointer" onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
