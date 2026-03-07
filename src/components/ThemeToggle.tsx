import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const { mode, setMode } = useTheme();

  const isSidebar = variant === "sidebar";

  return (
    <div className={cn(
      "flex items-center rounded-lg p-0.5",
      isSidebar ? "border border-white/10 bg-white/5" : "border border-border bg-muted/50"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-md",
          isSidebar
            ? mode === "light" ? "bg-[#C8A84B]/20 text-[#C8A84B] shadow-sm" : "text-white/50 hover:text-white/80 hover:bg-white/5"
            : mode === "light" && "bg-background text-foreground shadow-sm"
        )}
        onClick={() => setMode("light")}
        title="Light"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-md",
          isSidebar
            ? mode === "dark" ? "bg-[#C8A84B]/20 text-[#C8A84B] shadow-sm" : "text-white/50 hover:text-white/80 hover:bg-white/5"
            : mode === "dark" && "bg-background text-foreground shadow-sm"
        )}
        onClick={() => setMode("dark")}
        title="Dark"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-md",
          isSidebar
            ? mode === "auto" ? "bg-[#C8A84B]/20 text-[#C8A84B] shadow-sm" : "text-white/50 hover:text-white/80 hover:bg-white/5"
            : mode === "auto" && "bg-background text-foreground shadow-sm"
        )}
        onClick={() => setMode("auto")}
        title="System"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  );
}
