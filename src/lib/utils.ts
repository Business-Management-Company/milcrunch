import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Force an image URL to HTTPS to prevent mixed-content errors that cause flashing. */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  return url.replace(/^http:\/\//i, "https://");
}

/** Resolve the best creator avatar URL from multiple sources.
 *  Standard priority: ic_avatar_url → avatar_url → profile_image_url.
 *  Returns the first non-empty URL, forced to HTTPS, or null. */
export function creatorAvatarUrl(
  ...sources: (string | null | undefined)[]
): string | null {
  for (const src of sources) {
    const safe = safeImageUrl(src);
    if (safe) return safe;
  }
  return null;
}

/** Build a de-duped array of fallback avatar URLs (all forced to HTTPS).
 *  Pass all potential sources; null/empty/ui-avatars URLs are excluded.
 *  Use with onError to walk through the chain before falling back to initials. */
export function buildAvatarFallbacks(
  ...sources: (string | null | undefined)[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const src of sources) {
    const safe = safeImageUrl(src);
    if (safe && !safe.includes("ui-avatars.com") && !seen.has(safe)) {
      seen.add(safe);
      result.push(safe);
    }
  }
  return result;
}

/** Create an onError handler that walks through a fallback chain.
 *  Attach the returned handler to an <img> tag. When each URL 404s,
 *  it tries the next in the chain. After all fail, hides the img
 *  so the underlying initials div shows through. */
export function avatarOnError(fallbacks: string[]) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const retryCount = Number(el.dataset.avatarRetry || "0");
    const currentSrc = el.src;

    // Find next fallback that isn't the current (failed) src
    const remaining = fallbacks.filter((u) => u !== currentSrc);
    const nextIdx = Math.min(retryCount, remaining.length - 1);

    if (retryCount < remaining.length && remaining[nextIdx]) {
      el.dataset.avatarRetry = String(retryCount + 1);
      el.src = remaining[nextIdx];
    } else {
      // All fallbacks exhausted — hide img to show initials beneath
      el.style.display = "none";
    }
  };
}

/** Shared module-level cache: last successfully loaded avatar URL per creator username.
 *  Used by DiscoverAvatar (grid cards) and CreatorProfileModal (slideout)
 *  so the modal can reuse the URL that already loaded in the browser cache. */
export const goodAvatarCache = new Map<string, string>();

/**
 * Escape HTML to prevent XSS, then convert basic markdown (**bold**, *italic*) to HTML.
 * Safe to use with dangerouslySetInnerHTML for AI/user message content.
 */
export function simpleMarkdownToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .replace(/\*\*([^*]*)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]*)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}
