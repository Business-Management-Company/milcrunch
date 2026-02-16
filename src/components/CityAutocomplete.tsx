import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { US_CITIES, type CityOption } from "@/lib/us-cities";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

interface CityAutocompleteProps {
  value: string;
  onSelect: (city: string, state: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CityAutocomplete({ value, onSelect, placeholder = "Search city...", className }: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = query.trim().length >= 1
    ? US_CITIES.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())).slice(0, 15)
    : [];

  const handleSelect = (opt: CityOption) => {
    setQuery(opt.label);
    setOpen(false);
    setHighlighted(-1);
    onSelect(opt.city, opt.state);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.children[highlighted] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => query.trim().length >= 1 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn("pl-9", className)}
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] shadow-lg"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt.label}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer",
                i === highlighted
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{opt.city}</span>
              <span className="text-muted-foreground ml-auto text-xs">{opt.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
