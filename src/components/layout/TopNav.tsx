import { Link } from "react-router-dom";
import { Bell, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { useAuth } from "@/contexts/AuthContext";
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
}

export default function TopNav({ onOpenCommandPalette }: TopNavProps) {
  const { togglePanel: toggleAIPanel } = useAIAssistant();
  const { user, isSuperAdmin, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "User";
  const initials = getInitials(user?.user_metadata?.full_name as string, user?.email ?? "");

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 gap-4",
        "bg-white dark:bg-[#0F1117] border-b border-gray-200 dark:border-gray-800 shadow-sm"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="RecurrentX home">
          <img src="/favicon-32x32.png" alt="" className="h-8 w-auto" />
          <span className="font-display font-bold text-lg text-foreground tracking-wide hidden sm:inline">recurrent<span className="text-[#10B981] font-extrabold">X</span></span>
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
        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-[#0064B1] hover:bg-[#053877] text-white rounded-full px-4 py-2"
          onClick={toggleAIPanel}
          title="AI Assistant (⌘J)"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">✨ AI Assistant</span>
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Notifications">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
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
