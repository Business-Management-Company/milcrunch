import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface DemoIframeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
}

/** Ensure demo=true & embed=true are in the URL query string. */
function ensureDemoParams(raw: string): string {
  try {
    // Handle root-relative URLs
    const base = window.location.origin;
    const u = new URL(raw, base);
    if (!u.searchParams.has("demo")) u.searchParams.set("demo", "true");
    if (!u.searchParams.has("embed")) u.searchParams.set("embed", "true");
    // Return pathname + search (relative) so iframe stays same-origin
    return u.pathname + u.search;
  } catch {
    return raw;
  }
}

export default function DemoIframeModal({
  open,
  onOpenChange,
  url,
  title = "MilCrunch Demo",
}: DemoIframeModalProps) {
  const [loading, setLoading] = useState(true);

  const iframeSrc = ensureDemoParams(url);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setLoading(true); onOpenChange(v); }}>
      <DialogContent
        className="w-[95vw] h-[90vh] max-w-none p-0 overflow-hidden rounded-xl border-0 bg-black [&>button]:text-white [&>button]:hover:text-gray-300 [&>button]:opacity-100 [&>button]:bg-black/60 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-3 [&>button]:right-3"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>{title}</DialogTitle>
        </VisuallyHidden>

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
              <span className="text-white/60 text-sm">Loading demo…</span>
            </div>
          </div>
        )}

        <iframe
          src={iframeSrc}
          title={title}
          className="w-full h-full border-0 rounded-xl"
          onLoad={() => setLoading(false)}
          allow="clipboard-write"
        />
      </DialogContent>
    </Dialog>
  );
}
