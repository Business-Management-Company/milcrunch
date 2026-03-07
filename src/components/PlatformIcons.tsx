import { cn } from "@/lib/utils";
import { PlatformIcon, PLATFORM_NAMES } from "@/lib/platform-icons";

/* ------------------------------------------------------------------ */
/* URL builders for profile links                                      */
/* ------------------------------------------------------------------ */

const PLATFORM_URLS: Record<string, (u: string) => string> = {
  instagram: (u) => `https://instagram.com/${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  twitter: (u) => `https://x.com/${u}`,
  facebook: (u) => `https://facebook.com/${u}`,
  linkedin: (u) => `https://linkedin.com/in/${u}`,
};

/* ------------------------------------------------------------------ */
/* Helper: parse Tailwind size class → pixel number                    */
/* e.g. "h-4 w-4" → 16, "h-5 w-5" → 20, "h-6 w-6" → 24             */
/* ------------------------------------------------------------------ */
function sizeClassToPx(sizeClass: string): number {
  const match = sizeClass.match(/h-(\d+)/);
  if (match) return parseInt(match[1], 10) * 4; // Tailwind unit = 4px
  return 16; // default
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

interface PlatformIconsProps {
  /** Array of platform ids, e.g. ["instagram","tiktok","youtube"] */
  platforms: string[];
  /** Username for building profile links (optional) */
  username?: string;
  /** Max icons to display before showing "+N" (default 5) */
  max?: number;
  /** Icon size class (default "h-4 w-4" = 16px) */
  size?: string;
  /** Extra className on the wrapper */
  className?: string;
}

export function PlatformIcons({
  platforms,
  username,
  max = 5,
  size = "h-4 w-4",
  className,
}: PlatformIconsProps) {
  if (!platforms || platforms.length === 0) return null;

  const unique = [...new Set(platforms.map((p) => p.toLowerCase()))];
  const visible = unique.slice(0, max);
  const overflow = unique.length - max;
  const sizeNum = sizeClassToPx(size);

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {visible.map((plat) => {
        const buildUrl = PLATFORM_URLS[plat];
        const url = username && buildUrl ? buildUrl(username) : null;

        const icon = (
          <span
            className={cn(
              "inline-flex items-center justify-center transition-opacity shrink-0",
              url ? "hover:opacity-70 cursor-pointer" : "",
            )}
            title={PLATFORM_NAMES[plat] ?? plat}
            aria-label={PLATFORM_NAMES[plat] ?? plat}
          >
            <PlatformIcon platform={plat} size={sizeNum} />
          </span>
        );

        if (url) {
          return (
            <a
              key={plat}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex"
            >
              {icon}
            </a>
          );
        }

        return <span key={plat}>{icon}</span>;
      })}
      {overflow > 0 && (
        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export default PlatformIcons;
