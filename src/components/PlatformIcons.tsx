import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Platform SVG icons (16×16, brand-colored)                           */
/* ------------------------------------------------------------------ */

const PLATFORM_SVGS: Record<string, (size: string) => React.ReactNode> = {
  instagram: (size) => (
    <svg viewBox="0 0 24 24" className={size}>
      <defs>
        <linearGradient id="pi-ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <path
        fill="url(#pi-ig-grad)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 011.47.96c.458.457.78.92.96 1.47.163.46.349 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.055 1.17-.241 1.97-.404 2.43a4.088 4.088 0 01-.96 1.47 4.088 4.088 0 01-1.47.96c-.46.163-1.26.349-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.055-1.97-.241-2.43-.404a4.088 4.088 0 01-1.47-.96 4.088 4.088 0 01-.96-1.47c-.163-.46-.349-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.055-1.17.241-1.97.404-2.43a4.088 4.088 0 01.96-1.47 4.088 4.088 0 011.47-.96c.46-.163 1.26-.349 2.43-.404C8.416 2.175 8.796 2.163 12 2.163M12 0C8.741 0 8.333.014 7.053.072 5.775.131 4.902.333 4.14.63a6.21 6.21 0 00-2.228 1.45A6.21 6.21 0 00.462 4.308C.166 5.07-.036 5.944.005 7.222.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.059 1.278.261 2.15.558 2.913a6.21 6.21 0 001.45 2.228 6.21 6.21 0 002.228 1.45c.762.297 1.636.499 2.913.558C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.059 2.15-.261 2.913-.558a6.21 6.21 0 002.228-1.45 6.21 6.21 0 001.45-2.228c.297-.762.499-1.636.558-2.913.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.059-1.278-.261-2.15-.558-2.913a6.21 6.21 0 00-1.45-2.228A6.21 6.21 0 0019.86.462C19.098.166 18.224-.036 16.947.005 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      />
    </svg>
  ),
  tiktok: (size) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn(size, "text-black dark:text-white")}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.82a4.84 4.84 0 01-1-.13z" />
    </svg>
  ),
  youtube: (size) => (
    <svg viewBox="0 0 24 24" className={size}>
      <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
      <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  twitter: (size) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn(size, "text-black dark:text-white")}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  facebook: (size) => (
    <svg viewBox="0 0 24 24" className={size}>
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  linkedin: (size) => (
    <svg viewBox="0 0 24 24" className={size}>
      <path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
};

const PLATFORM_URLS: Record<string, (u: string) => string> = {
  instagram: (u) => `https://instagram.com/${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  twitter: (u) => `https://x.com/${u}`,
  facebook: (u) => `https://facebook.com/${u}`,
  linkedin: (u) => `https://linkedin.com/in/${u}`,
};

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

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

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {visible.map((plat) => {
        const svgFn = PLATFORM_SVGS[plat];
        const buildUrl = PLATFORM_URLS[plat];
        const url = username && buildUrl ? buildUrl(username) : null;

        const icon = (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md transition-opacity shrink-0",
              url ? "hover:opacity-70 cursor-pointer" : "",
            )}
            title={PLATFORM_NAMES[plat] ?? plat}
            aria-label={PLATFORM_NAMES[plat] ?? plat}
          >
            {svgFn ? (
              svgFn(size)
            ) : (
              <span className={cn("font-bold text-gray-400", size === "h-4 w-4" ? "text-[10px]" : "text-xs")}>
                {plat[0]?.toUpperCase() ?? "?"}
              </span>
            )}
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
