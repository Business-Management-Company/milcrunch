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
