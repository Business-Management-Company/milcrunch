/**
 * CreatorPixel — first-party tracking for creator bio pages.
 * Captures visitor fingerprint, page view, link clicks, time on page, scroll depth.
 * Privacy: full tracking only when cookie consent given; otherwise anonymous counts.
 */

import { supabase } from "@/integrations/supabase/client";

const COOKIE_CONSENT_KEY = "creator_pixel_consent";
const VISITOR_COOKIE_KEY = "cpx_v";
const VISITOR_COOKIE_DAYS = 365;

export type ConsentStatus = "granted" | "denied" | "unknown";

export function getConsent(): ConsentStatus {
  if (typeof document === "undefined") return "unknown";
  const v = document.cookie
    .split("; ")
    .find((r) => r.startsWith(COOKIE_CONSENT_KEY + "="));
  const value = v?.split("=")[1];
  if (value === "1" || value === "true") return "granted";
  if (value === "0" || value === "false") return "denied";
  return "unknown";
}

export function setConsent(granted: boolean): void {
  if (typeof document === "undefined") return;
  const value = granted ? "1" : "0";
  document.cookie = `${COOKIE_CONSENT_KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/** Simple hash for fingerprint string. */
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return Math.abs(h).toString(36);
}

/** Canvas fingerprint (lightweight). */
function canvasFingerprint(): string {
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    c.width = 120;
    c.height = 40;
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 60, 40);
    ctx.fillStyle = "#069";
    ctx.fillText("CreatorPixel", 2, 15);
    return c.toDataURL?.()?.slice(-50) ?? "";
  } catch {
    return "";
  }
}

/** Build a stable fingerprint from available signals (no localStorage). */
export function getFingerprint(): string {
  const parts: string[] = [];
  parts.push(canvasFingerprint());
  parts.push(String(screen?.width ?? 0));
  parts.push(String(screen?.height ?? 0));
  parts.push(String(screen?.colorDepth ?? 0));
  parts.push(String(new Date().getTimezoneOffset()));
  parts.push(navigator?.language ?? "");
  parts.push(navigator?.userAgent ?? "");
  parts.push(navigator?.platform ?? "");
  parts.push(String(navigator?.hardwareConcurrency ?? 0));
  const str = parts.join("|");
  return "fp_" + hash(str);
}

/** Get or set first-party cookie for return-visit matching (only when consent given). */
export function getVisitorCookie(): string | null {
  if (typeof document === "undefined" || getConsent() !== "granted") return null;
  const v = document.cookie
    .split("; ")
    .find((r) => r.startsWith(VISITOR_COOKIE_KEY + "="));
  return v ? decodeURIComponent(v.split("=")[1] ?? "") : null;
}

export function setVisitorCookie(visitorId: string): void {
  if (typeof document === "undefined" || getConsent() !== "granted") return;
  const maxAge = 60 * 60 * 24 * VISITOR_COOKIE_DAYS;
  document.cookie = `${VISITOR_COOKIE_KEY}=${encodeURIComponent(visitorId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getVisitorId(): string {
  const consent = getConsent();
  const cookieId = getVisitorCookie();
  if (cookieId) return cookieId;
  if (consent === "granted") {
    const fp = getFingerprint();
    setVisitorCookie(fp);
    return fp;
  }
  if (consent === "denied") return "anon_" + hash(String(Math.random() + Date.now()));
  return getFingerprint();
}

export interface DeviceInfo {
  device_type: string;
  browser: string;
  os: string;
  screen_resolution: string;
  language: string;
}

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator?.userAgent ?? "";
  let device_type = "desktop";
  if (/Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device_type = /iPad|Tablet/i.test(ua) ? "tablet" : "mobile";
  }
  let browser = "Other";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  let os = "Other";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  const w = typeof screen !== "undefined" ? screen.width : 0;
  const h = typeof screen !== "undefined" ? screen.height : 0;
  return {
    device_type,
    browser,
    os,
    screen_resolution: `${w}x${h}`,
    language: navigator?.language ?? "",
  };
}

const UTM_SOURCE_MAP: Record<string, string> = {
  ig: "instagram",
  tt: "tiktok",
  yt: "youtube",
  fb: "facebook",
  tw: "twitter",
  li: "linkedin",
};

export function getUtmSource(search: string): string {
  const params = new URLSearchParams(search);
  const src = params.get("src")?.toLowerCase();
  return (src && UTM_SOURCE_MAP[src]) || src || "";
}

export function getCampaignId(search: string): string | null {
  return new URLSearchParams(search).get("campaign");
}

export interface PageViewPayload {
  visitor_id: string;
  creator_handle: string;
  referral_source: string;
  utm_source: string;
  campaign_id?: string | null;
  event_slug?: string | null;
  device_type: string;
  browser: string;
  os: string;
  screen_resolution: string;
  language: string;
}

export async function trackPageView(payload: PageViewPayload): Promise<void> {
  try {
    await supabase.from("pixel_events").insert({
      visitor_id: payload.visitor_id,
      creator_handle: payload.creator_handle,
      event_type: "page_view",
      referral_source: payload.referral_source || null,
      utm_source: payload.utm_source || null,
      campaign_id: payload.campaign_id ?? null,
      event_slug: payload.event_slug ?? null,
      device_type: payload.device_type,
      browser: payload.browser,
      os: payload.os,
      screen_resolution: payload.screen_resolution,
    });
  } catch (e) {
    console.warn("[CreatorPixel] trackPageView failed:", e);
  }
}

export async function trackLinkClick(data: {
  visitor_id: string;
  creator_handle: string;
  link_url: string;
  link_label: string;
}): Promise<void> {
  try {
    await supabase.from("pixel_events").insert({
      visitor_id: data.visitor_id,
      creator_handle: data.creator_handle,
      event_type: "link_click",
      link_url: data.link_url,
      link_label: data.link_label,
    });
  } catch (e) {
    console.warn("[CreatorPixel] trackLinkClick failed:", e);
  }
}

export async function trackPageExit(data: {
  visitor_id: string;
  creator_handle: string;
  time_on_page_seconds: number;
  scroll_depth_percent: number;
  links_clicked_count: number;
}): Promise<void> {
  try {
    await supabase.from("pixel_events").insert({
      visitor_id: data.visitor_id,
      creator_handle: data.creator_handle,
      event_type: "page_exit",
      time_on_page_seconds: data.time_on_page_seconds,
      scroll_depth_percent: data.scroll_depth_percent,
      links_clicked_count: data.links_clicked_count,
    });
  } catch (e) {
    console.warn("[CreatorPixel] trackPageExit failed:", e);
  }
}

export async function identifyVisitor(data: {
  visitor_id: string;
  email: string;
  name?: string;
}): Promise<void> {
  try {
    await supabase.from("pixel_visitors").upsert(
      {
        visitor_id: data.visitor_id,
        email: data.email,
        name: data.name ?? null,
        is_identified: true,
        identified_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "visitor_id" }
    );
  } catch (e) {
    console.warn("[CreatorPixel] identifyVisitor failed:", e);
  }
}

let _behavioralLinksClicked = 0;

/** Run on bio page: start time/scroll tracking and send page_exit on beforeunload. */
export function initBehavioralTracking(creatorHandle: string): () => void {
  const start = Date.now();
  let maxScroll = 0;
  _behavioralLinksClicked = 0;
  const visitorId = getVisitorId();

  const onScroll = () => {
    const pct = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1)) * 100
    );
    if (pct > maxScroll) maxScroll = pct;
  };

  const sendExit = () => {
    const timeOnPage = Math.round((Date.now() - start) / 1000);
    trackPageExit({
      visitor_id: visitorId,
      creator_handle: creatorHandle,
      time_on_page_seconds: timeOnPage,
      scroll_depth_percent: Math.min(100, maxScroll),
      links_clicked_count: _behavioralLinksClicked,
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("beforeunload", sendExit);
  window.addEventListener("pagehide", sendExit);

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("beforeunload", sendExit);
    window.removeEventListener("pagehide", sendExit);
  };
}

/** Call when a bio link is clicked (sends link_click and increments count for page_exit). */
export function trackBioLinkClick(creatorHandle: string, linkUrl: string, linkLabel: string): void {
  _behavioralLinksClicked += 1;
  trackLinkClick({
    visitor_id: getVisitorId(),
    creator_handle: creatorHandle,
    link_url: linkUrl,
    link_label: linkLabel,
  });
}
