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
