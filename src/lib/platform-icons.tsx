/**
 * Centralized official brand SVG icons for all social media platforms.
 * All icons render as circles with the brand background color and white logo.
 *
 * Usage:
 *   import { PlatformIcon } from "@/lib/platform-icons";
 *   <PlatformIcon platform="instagram" size={24} />
 */

import { Globe } from "lucide-react";

/** Normalize common platform aliases to canonical keys. */
export const PLATFORM_ALIASES: Record<string, string> = {
  ig: "instagram",
  insta: "instagram",
  fb: "facebook",
  tt: "tiktok",
  yt: "youtube",
  tw: "twitter",
  twitter: "x",
  "x (twitter)": "x",
  "x(twitter)": "x",
  li: "linkedin",
  pin: "pinterest",
  snap: "snapchat",
  sc: "snapchat",
  bsky: "bluesky",
  gbp: "google_business",
  "google business profile": "google_business",
  googlebusiness: "google_business",
  podcast: "podcasts",
};

/** Normalize a platform string to its canonical key. */
export function normalizePlatform(raw: string): string {
  const key = raw.toLowerCase().trim();
  return PLATFORM_ALIASES[key] ?? key;
}

/** Platform brand colors (used as circle background) */
export const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  tiktok: "#000000",
  youtube: "#FF0000",
  twitter: "#000000",
  x: "#000000",
  linkedin: "#0A66C2",
  snapchat: "#FFFC00",
  pinterest: "#E60023",
  reddit: "#FF4500",
  discord: "#5865F2",
  spotify: "#1DB954",
  twitch: "#9146FF",
  google: "#FFFFFF",
  "google business": "#4285F4",
  "google_business": "#4285F4",
  threads: "#000000",
  apple: "#9B59B6",
  podcasts: "#9B59B6",
  email: "#000741",
  newsletter: "#000741",
  bluesky: "#0085FF",
};

/** SVG path data for each platform logo (white, centered in a 24x24 viewBox) */
function PlatformSvgContent({ platform }: { platform: string }) {
  switch (platform) {
    case "instagram":
      return (
        <>
          <rect x="5" y="5" width="14" height="14" rx="4" stroke="white" strokeWidth="1.8" fill="none" />
          <circle cx="12" cy="12" r="3.2" stroke="white" strokeWidth="1.8" fill="none" />
          <circle cx="17" cy="7" r="1.1" fill="white" />
        </>
      );
    case "facebook":
      return (
        <path
          d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.05.28-1.73 1.76-1.73z"
          fill="white"
        />
      );
    case "tiktok":
      return (
        <path
          d="M16.6 5.82A3.48 3.48 0 0 1 14.9 3.5V3h-2.58v10.5a2.16 2.16 0 0 1-2.15 1.87 2.16 2.16 0 0 1-2.17-2.16 2.16 2.16 0 0 1 2.17-2.16c.21 0 .41.03.6.08V8.64a4.83 4.83 0 0 0-.6-.04 4.74 4.74 0 0 0-4.74 4.74A4.74 4.74 0 0 0 10.17 18a4.74 4.74 0 0 0 4.73-4.74V8.31a6.14 6.14 0 0 0 3.6 1.14V7A3.5 3.5 0 0 1 16.6 5.82z"
          fill="white"
        />
      );
    case "youtube":
      return (
        <path
          d="M19.62 7.1a2.25 2.25 0 0 0-1.59-1.6C16.58 5 12 5 12 5s-4.58 0-6.03.5A2.25 2.25 0 0 0 4.38 7.1 23.7 23.7 0 0 0 4 12a23.7 23.7 0 0 0 .38 4.9 2.25 2.25 0 0 0 1.59 1.6c1.45.5 6.03.5 6.03.5s4.58 0 6.03-.5a2.25 2.25 0 0 0 1.59-1.6A23.7 23.7 0 0 0 20 12a23.7 23.7 0 0 0-.38-4.9zM10 15.17V8.83L15.2 12 10 15.17z"
          fill="white"
        />
      );
    case "twitter":
    case "x":
      return (
        <path
          d="M14.69 6L18.5 18h-2.2l-1.54-4.87L11.26 18H9.06l5-6.5L12.12 6h2.2l1.22 3.86L18.71 6h2.2l-4.46 5.8L14.69 6zM3.09 6h2.2l1.76 5.57L10.52 6h2.2L7.7 12.5 9.94 18h-2.2L5.3 12.95l-3.5 5.05H-.4l4.65-6.08L3.09 6z"
          fill="white"
          transform="translate(1.1,0) scale(0.9)"
        />
      );
    case "linkedin":
      return (
        <>
          <path d="M6.94 8.5H9.5v8.62H6.94V8.5zM8.22 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill="white" />
          <path d="M11.15 8.5h2.45v1.17h.03a2.68 2.68 0 0 1 2.42-1.33c2.59 0 3.07 1.7 3.07 3.92v4.86h-2.56v-4.31c0-1.03-.02-2.35-1.43-2.35-1.43 0-1.65 1.12-1.65 2.28v4.38h-2.56V8.5z" fill="white" />
        </>
      );
    case "snapchat":
      return (
        <path
          d="M12 4c1.72 0 2.96.88 3.47 2.46.15.47.19.92.19 1.35 0 .55-.07 1.07-.14 1.52.35.16.72.25 1.03.25.23 0 .4-.04.53-.12.28-.18.54-.08.68.1.15.2.17.52-.12.74-.64.48-1.52.6-1.8.65-.05.2-.15.4-.3.56.8 1.33 1.85 2.1 3.03 2.35.28.06.43.24.39.47-.06.3-.47.52-1.16.62-.14.02-.25.12-.27.23-.04.17-.1.4-.6.4-.32 0-.74-.08-1.32-.24-.36-.1-.68-.14-.98-.14-.2 0-.38.02-.55.07-1.04.32-1.87 1.28-3.08 1.28s-2.04-.96-3.08-1.28a2.54 2.54 0 0 0-.55-.07c-.3 0-.62.05-.98.14-.58.16-1 .24-1.32.24-.5 0-.56-.23-.6-.4a.29.29 0 0 0-.27-.23c-.69-.1-1.1-.32-1.16-.62-.04-.23.11-.41.39-.47 1.18-.25 2.23-1.02 3.03-2.35a1.07 1.07 0 0 0-.3-.56c-.28-.05-1.16-.17-1.8-.65-.29-.22-.27-.54-.12-.74.14-.18.4-.28.68-.1.13.08.3.12.53.12.31 0 .68-.09 1.03-.25-.07-.45-.14-.97-.14-1.52 0-.43.04-.88.19-1.35C9.04 4.88 10.28 4 12 4z"
          fill="white"
        />
      );
    case "pinterest":
      return (
        <path
          d="M12 4a8 8 0 0 0-2.92 15.44c-.02-.66 0-1.45.16-2.17l1.2-5.08s-.3-.6-.3-1.49c0-1.4.81-2.44 1.82-2.44.86 0 1.27.64 1.27 1.41 0 .86-.55 2.15-.83 3.34-.24 1 .5 1.81 1.48 1.81 1.78 0 2.97-2.28 2.97-4.98 0-2.06-1.39-3.6-3.91-3.6a4.46 4.46 0 0 0-4.65 4.51c0 .82.24 1.4.62 1.85.17.21.2.29.13.52l-.17.68c-.07.29-.29.39-.54.28C7.08 13.1 6.4 11.4 6.4 9.93c0-2.95 2.49-6.49 7.43-6.49 3.97 0 6.57 2.87 6.57 5.95 0 4.07-2.26 7.13-5.59 7.13-1.12 0-2.17-.6-2.53-1.29l-.72 2.84c-.22.78-.64 1.56-1.02 2.17A8 8 0 0 0 12 4z"
          fill="white"
        />
      );
    case "reddit":
      return (
        <>
          <circle cx="8.5" cy="13" r="1.3" fill="white" />
          <circle cx="15.5" cy="13" r="1.3" fill="white" />
          <path d="M9.5 16.5s.8 1.2 2.5 1.2 2.5-1.2 2.5-1.2" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M20 12a2 2 0 0 0-3.37-1.46A9.6 9.6 0 0 0 12 9.5a9.6 9.6 0 0 0-4.63 1.04A2 2 0 0 0 4 12a2 2 0 0 0 1.1 1.79c-.03.21-.05.42-.05.64 0 2.76 3.09 5 6.95 5s6.95-2.24 6.95-5c0-.22-.02-.43-.05-.64A2 2 0 0 0 20 12z" fill="white" />
          <path d="M16.5 3.5L14.5 9.5" stroke="white" strokeWidth="1.2" fill="none" />
          <circle cx="18" cy="4.5" r="1.5" fill="white" />
        </>
      );
    case "discord":
      return (
        <path
          d="M16.94 5.64A14.28 14.28 0 0 0 13.46 4.5c-.15.27-.33.63-.45.92a13.22 13.22 0 0 0-3.98 0 10.15 10.15 0 0 0-.46-.92 14.22 14.22 0 0 0-3.48 1.14C2.1 9.95 1.56 14.15 1.84 18.3a14.49 14.49 0 0 0 4.44 2.25 10.8 10.8 0 0 0 .95-1.55 9.32 9.32 0 0 1-1.5-.72l.36-.29a10.22 10.22 0 0 0 8.82 0l.37.29c-.48.28-.97.52-1.5.72.28.54.59 1.06.95 1.55a14.45 14.45 0 0 0 4.44-2.25c.33-4.96-.59-9.12-2.23-12.66zM8.68 15.77c-1.09 0-1.99-1-1.99-2.23s.87-2.24 2-2.24 2 1.01 1.98 2.24c0 1.23-.88 2.23-1.99 2.23zm5.64 0c-1.1 0-2-1-2-2.23s.88-2.24 2-2.24 2 1.01 1.99 2.24c0 1.23-.87 2.23-1.99 2.23z"
          fill="white"
          transform="translate(1.6,-.5) scale(0.85)"
        />
      );
    case "spotify":
      return (
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.28 14.63a.64.64 0 0 1-.87.21c-2.4-1.47-5.4-1.8-8.95-1a.64.64 0 0 1-.28-1.24c3.89-.88 7.22-.5 9.9 1.15.3.18.39.58.2.88zm1.15-2.75a.78.78 0 0 1-1.08.26c-2.74-1.69-6.93-2.18-10.17-1.19a.78.78 0 0 1-.45-1.5c3.7-1.12 8.3-.58 11.44 1.36a.78.78 0 0 1 .26 1.07zm.1-2.87c-3.3-1.96-8.73-2.14-11.88-1.18a.94.94 0 0 1-.55-1.79c3.62-1.1 9.64-.89 13.44 1.37a.94.94 0 0 1-.49 1.74.93.93 0 0 1-.52-.14z"
          fill="white"
        />
      );
    case "twitch":
      return (
        <path
          d="M5.27 3L3.6 6.67v12h4v2.66h2.67l2.66-2.66h4L21.6 14V3H5.27zm14.66 10.33l-3.33 3.34h-4L10.27 19v-2.33H6.27V4.67h13.66v8.66zM16.27 7.33v5.34h-1.67V7.33h1.67zm-4.67 0v5.34H9.93V7.33h1.67z"
          fill="white"
          transform="translate(-.3,0) scale(0.98)"
        />
      );
    case "google":
    case "google business":
    case "google_business":
      return (
        <>
          <path d="M21.35 11.1H12.18v2.93h5.27c-.23 1.2-.91 2.21-1.93 2.89v2.4h3.12c1.83-1.69 2.88-4.17 2.88-7.12 0-.49-.04-.97-.12-1.43l-.05.33z" fill="#4285F4" />
          <path d="M12.18 21.5c2.62 0 4.81-.87 6.41-2.35l-3.12-2.4c-.87.58-1.97.92-3.29.92-2.53 0-4.67-1.71-5.44-4.01H3.52v2.48A9.64 9.64 0 0 0 12.18 21.5z" fill="#34A853" />
          <path d="M6.74 13.66a5.8 5.8 0 0 1 0-3.69V7.49H3.52a9.64 9.64 0 0 0 0 8.65l3.22-2.48z" fill="#FBBC05" />
          <path d="M12.18 5.96c1.43 0 2.71.49 3.72 1.45l2.79-2.79a9.6 9.6 0 0 0-6.51-2.53A9.64 9.64 0 0 0 3.52 7.49l3.22 2.48c.77-2.3 2.91-4.01 5.44-4.01z" fill="#EA4335" />
        </>
      );
    case "threads":
      return (
        <path
          d="M16.05 11.77a5.3 5.3 0 0 0-.23-.1 5.55 5.55 0 0 0-2.26-5.14 5.1 5.1 0 0 0-3.34-.9 4.78 4.78 0 0 0-3.53 1.56l1.32 1.2a3.15 3.15 0 0 1 2.27-.95 3.31 3.31 0 0 1 2.15.58 3.39 3.39 0 0 1 1.2 2.54 5.46 5.46 0 0 0-1.65-.23c-2.59 0-4.24 1.38-4.24 3.45 0 2.04 1.57 3.35 3.67 3.35a3.47 3.47 0 0 0 2.56-1.06 3.73 3.73 0 0 0 .84-1.76c.25.6.35 1.29.29 2.04-.17 2.1-1.77 3.56-4.08 3.72-2.56.18-4.5-.76-5.5-2.6a8.8 8.8 0 0 1-.93-4.45c.05-1.73.39-3.18.93-4.46 1-1.83 2.94-2.77 5.5-2.59 2.6.18 4.14 1.35 4.6 3.47l1.79-.47c-.61-2.8-2.76-4.5-5.97-4.73-3.36-.24-5.9 1.07-7.2 3.48A11.26 11.26 0 0 0 4.13 12c.06 1.93.44 3.6 1.1 5.04 1.3 2.4 3.84 3.72 7.2 3.48 3.1-.22 5.14-2.08 5.4-4.98.15-1.6-.15-2.93-.87-3.88a3.78 3.78 0 0 0-.91.11zm-2.42 3.37c-.18 1.3-1.16 2.1-2.37 2.1-.91 0-1.83-.46-1.83-1.53 0-1.28 1.22-1.7 2.42-1.7.46 0 .92.07 1.32.18a2.88 2.88 0 0 1 .46.95z"
          fill="white"
        />
      );
    case "bluesky":
      return (
        <path
          d="M12 5.4c1.76 1.52 3.65 4.6 4.32 6.25.87-2.44.5-4.23.24-4.79A4.83 4.83 0 0 0 12 4C9.86 4 8.03 5.2 7.44 6.86c-.26.56-.63 2.35.24 4.79C8.35 10 10.24 6.92 12 5.4zm5.12 7.76c-.3.62-1.14 1.94-3.14 2.14-1.16.12-2.28-.5-2.28-.5s.34 1.64.34 2.32c0 1.12-.88 2.14-1.8 2.62a2.8 2.8 0 0 1-1.48 0c-.92-.48-1.8-1.5-1.8-2.62 0-.68.34-2.32.34-2.32s-1.12.62-2.28.5c-2-.2-2.84-1.52-3.14-2.14a.32.32 0 0 1 .08-.38c.32-.26 1.68-.9 3.28-.06 1.28.68 2.08 1.82 2.08 1.82s.44-1.7.94-2.56A12.8 12.8 0 0 1 12 11.2c.98 1.14 1.72 2.52 2.32 3.52.5.86.94 2.56.94 2.56s.8-1.14 2.08-1.82c1.6-.84 2.96-.2 3.28.06.14.1.18.26.08.38l-.58-.74z"
          fill="white"
          transform="translate(0,-.5)"
        />
      );
    case "apple":
    case "podcasts":
      return (
        <>
          <path d="M12 4a7 7 0 0 0-3 13.35V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.65A7 7 0 0 0 12 4zm0 2a5 5 0 0 1 2.24 9.48.5.5 0 0 0-.24.42V19h-4v-3.1a.5.5 0 0 0-.24-.42A5 5 0 0 1 12 6z" fill="white" />
          <circle cx="12" cy="10" r="2" fill="white" />
        </>
      );
    case "email":
    case "newsletter":
      return (
        <path
          d="M4 6h16v12H4V6zm0 0l8 5.5L20 6"
          stroke="white"
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}

/** Instagram uses a special gradient background */
const IG_GRADIENT_ID = "ig-bg-grad";

export function PlatformIcon({
  platform,
  size = 24,
  className,
}: {
  platform: string;
  size?: number;
  className?: string;
}) {
  const key = normalizePlatform(platform);
  const bgColor = PLATFORM_COLORS[key];
  const isInstagram = key === "instagram";
  const isGoogle = key === "google" || key === "google business" || key === "google_business";
  const hasContent = PlatformSvgContent({ platform: key }) !== null;

  if (!bgColor || !hasContent) {
    // Unknown platform — render gray globe
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: "#9CA3AF",
          flexShrink: 0,
        }}
      >
        <Globe size={size * 0.55} color="white" strokeWidth={2} />
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isInstagram && (
          <defs>
            <linearGradient id={IG_GRADIENT_ID} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FEDA75" />
              <stop offset="25%" stopColor="#FA7E1E" />
              <stop offset="50%" stopColor="#D62976" />
              <stop offset="75%" stopColor="#962FBF" />
              <stop offset="100%" stopColor="#4F5BD5" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx="12"
          cy="12"
          r="12"
          fill={
            isInstagram
              ? `url(#${IG_GRADIENT_ID})`
              : isGoogle
                ? "#F1F1F1"
                : bgColor
          }
        />
        {isGoogle && <circle cx="12" cy="12" r="11.5" stroke="#DADCE0" strokeWidth="0.5" fill="none" />}
        <PlatformSvgContent platform={key} />
      </svg>
    </span>
  );
}

/** Re-export for convenience: get platform display name */
export const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X",
  x: "X",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
  reddit: "Reddit",
  discord: "Discord",
  spotify: "Spotify",
  twitch: "Twitch",
  google: "Google",
  "google business": "Google Business",
  "google_business": "Google Business",
  threads: "Threads",
  apple: "Apple Podcasts",
  podcasts: "Podcasts",
  email: "Email",
  newsletter: "Newsletter",
  bluesky: "Bluesky",
};
