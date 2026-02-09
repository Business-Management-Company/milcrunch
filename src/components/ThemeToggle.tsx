import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-md",
          mode === "light" && "bg-background text-foreground shadow-sm"
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
          mode === "dark" && "bg-background text-foreground shadow-sm"
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
          mode === "auto" && "bg-background text-foreground shadow-sm"
        )}
        onClick={() => setMode("auto")}
        title="System"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  );
}
