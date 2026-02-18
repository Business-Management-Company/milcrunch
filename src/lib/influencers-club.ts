// Use relative /api/* paths; Vercel rewrites forward to upstream. Auth must be in the request
// (Vercel does not inject headers), so we always send Authorization in every fetch.
const DISCOVERY_URL = "/api/influencers/public/v1/discovery/";
const RAW_ENRICH_URL = "/api/enrich/public/v1/creators/enrich/handle/raw/";
const FULL_ENRICH_URL = "/api/enrich/public/v1/creators/enrich/handle/full/";

/**
 * Unified creator card format for display (used by both API and mock data).
 */
export interface CreatorCard {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  followers: number;
  engagementRate: number;
  platforms: string[];
  bio: string;
  location?: string;
  gender?: string;
  language?: string;
  branch?: string;
  specialties?: string[];
  postsPerMonth?: number;
  /** Category or niche from API (e.g. "Fitness", "Lifestyle") */
  category?: string;
  nicheClass?: string;
  /** Social platforms the creator has (e.g. ["instagram", "tiktok", "youtube"]) */
  socialPlatforms?: string[];
  /** Top hashtags from API (e.g. ["marines", "fitness", "veteran"]) */
  hashtags?: string[];
  /** Links from bio / external (label for display, e.g. "Linktree", "Amazon") */
  externalLinks?: { label: string; url?: string }[];
  /** Profile is verified (show blue checkmark) */
  isVerified?: boolean;
  /** Has email / email available for outreach */
  hasEmail?: boolean;
}

/** API profile shape (nested under each account). */
interface ApiProfile {
  full_name?: string;
  username?: string;
  biography?: string;
  engagement_percent?: number;
  follower_count?: number;
  followers?: number;
  number_of_followers?: number;
  picture?: string;
  profile_picture?: string;
  profile_picture_hd?: string;
  profile_pic_url?: string;
  avatar?: string;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  gender?: string;
  language?: string;
  category?: string;
  [key: string]: unknown;
}

/** API account shape (Influencers.club discovery response.accounts[]). */
interface ApiAccount {
  user_id?: string;
  profile?: ApiProfile;
  [key: string]: unknown;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_INFLUENCERS_CLUB_API_KEY;
  return typeof key === "string" ? key.trim() : "";
}

function mapAccountToCard(account: ApiAccount, index: number): CreatorCard {
  const p = account.profile;
  console.log(`[influencers-club] Raw API profile[${index}]:`, JSON.parse(JSON.stringify(account)));
  const id = (account.user_id ?? `api-${index}`) as string;
  const name = (p?.full_name ?? p?.username ?? "Unknown") as string;

  const avatarRaw = (p?.picture ?? p?.profile_picture_hd ?? p?.profile_picture ?? p?.profile_pic_url ?? p?.avatar) as string | undefined | null;
  const avatar =
    avatarRaw && String(avatarRaw).trim()
      ? avatarRaw
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name))}&background=random&size=128`;

  const followers =
    Number(p?.followers) ||
    Number(p?.follower_count) ||
    Number(p?.number_of_followers) ||
    0;

  const engagementRaw =
    typeof p?.engagement_percent === "number" ? p.engagement_percent
    : typeof p?.engagement_rate === "number" ? p.engagement_rate
    : typeof p?.er === "number" ? p.er
    : Number(p?.engagement_percent) || Number(p?.engagement_rate) || Number(p?.er) || 0;
  const engagementRate = engagementRaw ? Number(engagementRaw.toFixed(2)) : 0;

  const platforms = [(p?.platform as string) ?? "instagram"];
  const bio = (p?.biography ?? "") as string;
  const postsPerMonth = typeof p?.posts_per_month === "number" ? p.posts_per_month : undefined;
  const location =
    (p?.location && String(p.location).trim()) ||
    [p?.city, p?.state, p?.country].filter(Boolean).join(", ").trim() ||
    undefined;
  const category = (p?.category as string) ?? undefined;
  const nicheClass = (p?.niche_class as string) ?? undefined;

  const socialPlatforms: string[] = [];
  if (p?.platforms && Array.isArray(p.platforms)) {
    socialPlatforms.push(...(p.platforms as string[]).map((x) => String(x).toLowerCase()));
  }
  if (p?.social_links && Array.isArray(p.social_links)) {
    (p.social_links as { platform?: string }[]).forEach((s) => {
      const plat = String(s?.platform ?? "").toLowerCase();
      if (plat && !socialPlatforms.includes(plat)) socialPlatforms.push(plat);
    });
  }
  const hasFlags = {
    instagram: true,
    tiktok: Boolean(p?.has_tiktok),
    youtube: Boolean(p?.has_youtube),
    twitter: Boolean(p?.has_twitter),
    facebook: Boolean(p?.has_facebook),
    linkedin: Boolean(p?.has_linkedin),
    podcast: Boolean(p?.has_podcast),
    twitch: Boolean(p?.has_twitch),
  };
  ["instagram", "tiktok", "youtube", "twitter", "facebook", "linkedin", "podcast", "twitch"].forEach((plat) => {
    if (hasFlags[plat as keyof typeof hasFlags] && !socialPlatforms.includes(plat)) {
      socialPlatforms.push(plat);
    }
  });
  // Also detect platforms from URL / follower / subscriber fields
  const urlFollowerChecks: [string, string[]][] = [
    ["instagram", ["instagram_url", "instagram_followers"]],
    ["tiktok", ["tiktok_url", "tiktok_followers"]],
    ["youtube", ["youtube_url", "youtube_subscribers", "youtube_followers"]],
    ["twitter", ["twitter_url", "twitter_followers", "x_url"]],
    ["facebook", ["facebook_url", "facebook_followers"]],
    ["linkedin", ["linkedin_url", "linkedin_followers"]],
  ];
  urlFollowerChecks.forEach(([plat, fields]) => {
    if (!socialPlatforms.includes(plat)) {
      const hasValue = fields.some((f) => {
        const v = (p as Record<string, unknown>)?.[f];
        return v != null && v !== "" && v !== 0 && v !== false;
      });
      if (hasValue) socialPlatforms.push(plat);
    }
  });
  if (socialPlatforms.length === 0 && (p?.username || id)) socialPlatforms.push("instagram");

  const hashtagsRaw =
    (p?.hashtags as unknown) ??
    (p?.frequently_used_hashtags as unknown) ??
    (p?.top_hashtags as unknown) ??
    (p?.popular_hashtags as unknown) ??
    (p?.tags as unknown);
  let hashtags: string[] | undefined;
  if (Array.isArray(hashtagsRaw)) {
    hashtags = hashtagsRaw.slice(0, 20).map((t) => {
      if (typeof t === "string") return t.replace(/^#/, "");
      if (t && typeof t === "object") {
        const o = t as Record<string, unknown>;
        const val = o.name ?? o.tag ?? o.hashtag ?? o.label ?? o.value;
        if (val) return String(val).replace(/^#/, "");
      }
      return String(t);
    }).filter((t) => t && t !== "undefined" && t !== "null");
  }

  const linksRaw =
    (p?.external_links as unknown) ??
    (p?.links_in_bio as unknown) ??
    (p?.link_in_bio as unknown) ??
    (p?.bio_links as unknown) ??
    (p?.links as unknown);
  const externalLinks: { label: string; url?: string }[] = [];
  const pushLink = (rawUrl: string) => {
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const lower = url.toLowerCase();
    let label: string;
    if (lower.includes("linktr.ee") || lower.includes("linktree")) label = "Linktree";
    else if (lower.includes("amazon")) label = "Amazon";
    else if (lower.includes("shopify")) label = "Shopify";
    else if (lower.includes("bio.site")) label = "Bio.link";
    else if (lower.includes("youtube")) label = "YouTube";
    else if (lower.includes("tiktok")) label = "TikTok";
    else if (lower.includes("twitter") || lower.includes("x.com")) label = "X";
    else label = "Link";
    externalLinks.push({ label, url });
  };
  if (Array.isArray(linksRaw)) {
    linksRaw.forEach((item: unknown) => {
      if (typeof item === "string" && item.trim()) {
        pushLink(item.trim());
        return;
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const url = (o.url ?? o.href ?? o.link) as string | undefined;
        const label = (o.label ?? o.title ?? o.name) as string | undefined;
        if (typeof url === "string" && url.trim()) {
          if (label) externalLinks.push({ label: String(label), url: url.startsWith("http") ? url : `https://${url}` });
          else pushLink(url.trim());
        }
      }
    });
  } else if (typeof linksRaw === "string" && linksRaw.trim()) {
    pushLink(linksRaw.trim());
  }
  if (externalLinks.length === 0 && Boolean(p?.uses_link_in_bio)) {
    externalLinks.push({ label: "Link in bio" });
  }
  // Also count external_links_count if the links array was empty
  if (externalLinks.length === 0) {
    const elc = Number(p?.external_links_count ?? p?.links_count ?? 0);
    if (elc > 0) {
      for (let i = 0; i < elc; i++) externalLinks.push({ label: "Link" });
    }
  }

  const isVerified = Boolean(p?.is_verified);
  const hasEmail = Boolean(p?.has_email ?? p?.email_available);

  return {
    id: String(id),
    name: String(name),
    username: p?.username as string | undefined,
    avatar,
    followers,
    engagementRate,
    platforms,
    bio,
    location: location || undefined,
    postsPerMonth,
    category,
    nicheClass,
    socialPlatforms: socialPlatforms.length > 0 ? socialPlatforms : undefined,
    hashtags: hashtags && hashtags.length > 0 ? hashtags : undefined,
    externalLinks: externalLinks.length > 0 ? externalLinks : undefined,
    isVerified: isVerified || undefined,
    hasEmail: hasEmail || undefined,
  };
}

/** Options for discovery search. Matches API request shape. */
export interface SearchCreatorsOptions {
  platform?: string;
  number_of_followers?: { min: number | null; max: number | null };
  engagement_percent?: { min: number | null; max: number | null };
  keywords_in_bio?: string[];
  sort_by?: "relevancy" | "followers" | "engagement";
  page?: number;
  location?: string;
  gender?: string;
  language?: string;
}

/** Result of a discovery search: mapped cards, total count, raw response. */
export interface SearchCreatorsResult {
  creators: CreatorCard[];
  total: number;
  rawResponse: unknown;
}

/**
 * Search creators via the Influencers.club Discovery API.
 * POST with ai_search and optional filters. Returns creators, total, and raw response.
 */
export async function searchCreators(
  query: string,
  options: SearchCreatorsOptions = {}
): Promise<SearchCreatorsResult> {
  console.log("[Discovery] API key present:", !!import.meta.env.VITE_INFLUENCERS_CLUB_API_KEY);
  const trimmed = query.trim();
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("VITE_INFLUENCERS_CLUB_API_KEY is not set");
  }

  // "all" is a UI-only value — the API needs a real platform name; default to "instagram"
  const rawPlatform = (options.platform ?? "instagram").toLowerCase();
  const platformValue = rawPlatform === "all" ? "instagram" : rawPlatform;
  const number_of_followers = options.number_of_followers ?? { min: null, max: null };
  const engagement_percent = options.engagement_percent ?? { min: null, max: null };
  const keywords_in_bio = options.keywords_in_bio != null && options.keywords_in_bio.length > 0
    ? options.keywords_in_bio.filter((s) => s.trim() !== "")
    : [""];
  if (keywords_in_bio.length === 0) keywords_in_bio.push("");

  const body = {
    platform: platformValue,
    paging: { limit: 25, page: options.page ?? 1 },
    sort: { sort_by: options.sort_by ?? "relevancy", sort_order: "desc" as const },
    filters: {
      ai_search: trimmed,
      number_of_followers: { min: number_of_followers.min, max: number_of_followers.max },
      engagement_percent: { min: engagement_percent.min, max: engagement_percent.max },
      keywords_in_bio,
      exclude_role_based_emails: false,
      ...(options.location ? { location: options.location } : {}),
      ...(options.gender ? { gender: options.gender } : {}),
      ...(options.language ? { language: { code: options.language } } : {}),
    },
  };

  console.log("[Influencers.club] POST", DISCOVERY_URL);
  console.log("[Influencers.club] Request body:", JSON.stringify(body, null, 2));

  const res = await fetch(DISCOVERY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const rawResponse = await res.json();
  console.log("[Influencers.club] Full API response:", rawResponse);

  if (!res.ok) {
    throw new Error(
      `Influencers.club API ${res.status}: ${res.statusText}`,
      { cause: rawResponse }
    );
  }

  const accounts = (rawResponse as { accounts?: ApiAccount[] }).accounts ?? [];
  const list = Array.isArray(accounts) ? accounts : [];
  const total = Number((rawResponse as { total?: number }).total ?? list.length);
  if (list[0]) {
    console.log("[Discovery] Full account data:", JSON.stringify(list[0], null, 2));
  }
  const creators: CreatorCard[] = list.map((acc, i) => mapAccountToCard(acc, i));

  return { creators, total, rawResponse };
}

/** Enriched creator profile from the handle/full API. */
export type EnrichedProfile = Record<string, unknown>;

/** Response has two levels: result (top-level: email, gender, creator_has, tiktok, youtube, lookalikes) and result.instagram (platform-specific). */
export interface EnrichedProfileResponse {
  result: Record<string, unknown>;
  instagram: Record<string, unknown>;
}

/**
 * Enrich a creator profile by handle (username) using the RAW endpoint (0.03 credits).
 * Returns profile data (photo, followers, engagement, bio, platforms) but NOT contact info.
 * Use fullEnrichCreatorProfile() for email/contact info (1.03 credits).
 */
export async function enrichCreatorProfile(
  username: string,
  signal?: AbortSignal
): Promise<EnrichedProfileResponse | null> {
  const handle = username.replace(/^@/, "").trim();

  const url = RAW_ENRICH_URL;
  const body = {
    handle,
    platform: "instagram",
    include_lookalikes: false,
    email_required: "preferred",
  };
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("VITE_INFLUENCERS_CLUB_API_KEY is not set");
  }


  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      console.log("[Enrich] Request aborted (expected on cleanup/timeout)");
    } else {
      console.error("[Enrich] Step ERROR (fetch threw):", (err as Error)?.name, (err as Error)?.message, err);
    }
    throw err;
  }


  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    console.error("[Enrich] Step 3b: response.text() failed:", err);
    throw err;
  }


  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseErr) {
    console.error("[Enrich] Step 4: JSON parse failed. Raw text (first 1000 chars):", text?.substring(0, 1000));
    throw new Error("Enrich API returned invalid JSON", { cause: parseErr });
  }

  const dataRecord = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  if (!res.ok) {
    console.error("[Enrich] API error:", res.status, res.statusText, dataRecord.error ?? dataRecord.message ?? "");
    throw new Error(`Enrich API ${res.status}: ${res.statusText}`, { cause: data });
  }

  const result = (dataRecord).result as Record<string, unknown> | undefined;
  const ig = result && typeof result === "object" ? (result.instagram as Record<string, unknown> | undefined) : undefined;

  console.log("[Enrich] OK for", handle, "— ig:", !!ig, "platforms:", result?.creator_has);

  if (!ig || typeof ig !== "object") {
    console.warn("[Enrich] No instagram data in result for", handle);
    return null;
  }

  return { result: result ?? {}, instagram: ig };
}

/**
 * Full enrichment by handle (1.03 credits) — returns email and contact details.
 * Only call after user confirmation via "Get Contact Info" button.
 */
export async function fullEnrichCreatorProfile(
  username: string,
  signal?: AbortSignal
): Promise<EnrichedProfileResponse | null> {
  const handle = username.replace(/^@/, "").trim();
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("VITE_INFLUENCERS_CLUB_API_KEY is not set");

  const body = {
    handle,
    platform: "instagram",
    include_lookalikes: false,
    email_required: "preferred",
  };

  const res = await fetch(FULL_ENRICH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Enrich API ${res.status}: ${res.statusText}`, { cause: data });

  const result = (data as Record<string, unknown>)?.result as Record<string, unknown> | undefined;
  const ig = result?.instagram as Record<string, unknown> | undefined;
  if (!ig) return null;
  return { result: result ?? {}, instagram: ig };
}

/** Credit balance response from the API */
export interface CreditBalance {
  credits_remaining?: number;
  credits_used?: number;
  credits_total?: number;
  [key: string]: unknown;
}

/** Fetch API credit balance */
export async function fetchCredits(): Promise<CreditBalance | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[Credits] No API key, skipping fetch");
    return null;
  }
  try {
    const res = await fetch("/api/credits", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    console.log("[Credits] Response status:", res.status, "data:", JSON.stringify(data));
    if (!res.ok) {
      console.warn("[Credits] Non-OK response:", res.status, data);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[Credits] Fetch error:", err);
    return null;
  }
}

/**
 * Helper: merge cross-platform flags from enrichment result into a profile object
 * so that mapAccountToCard can pick them up.
 */
function mergeEnrichFlags(
  profile: Record<string, unknown>,
  result: Record<string, unknown>
): void {
  const creatorHas = result.creator_has as Record<string, boolean> | undefined;
  if (creatorHas && typeof creatorHas === "object") {
    if (creatorHas.tiktok) profile.has_tiktok = true;
    if (creatorHas.youtube) profile.has_youtube = true;
    if (creatorHas.twitter) profile.has_twitter = true;
    if (creatorHas.facebook) profile.has_facebook = true;
    if (creatorHas.linkedin) profile.has_linkedin = true;
    if (creatorHas.twitch) profile.has_twitch = true;
    if (creatorHas.podcast) profile.has_podcast = true;
  }
  if (result.email) profile.has_email = true;
}

/**
 * Search by exact username via the enrichment API.
 * Uses the raw enrich endpoint (0.03 credits) to look up the exact profile by handle.
 */
export async function searchByUsername(
  username: string,
  platform: string = "instagram"
): Promise<SearchCreatorsResult> {
  const handle = username.replace(/^@/, "").trim().toLowerCase();
  if (!handle) throw new Error("Username is required");

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("VITE_INFLUENCERS_CLUB_API_KEY is not set");

  const body = {
    handle,
    platform: platform.toLowerCase(),
    include_lookalikes: false,
    email_required: "preferred",
  };

  console.log("[usernameSearch] POST", RAW_ENRICH_URL);
  console.log("[usernameSearch] Body:", JSON.stringify(body, null, 2));

  const res = await fetch(RAW_ENRICH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const rawResponse = await res.json();
  console.log("[usernameSearch] Response status:", res.status, "keys:", Object.keys(rawResponse as object));

  if (!res.ok) {
    throw new Error(`Username search ${res.status}: ${res.statusText}`, { cause: rawResponse });
  }

  const result = (rawResponse as Record<string, unknown>)?.result as Record<string, unknown> | undefined;
  const ig = result?.instagram as Record<string, unknown> | undefined;

  if (!ig || typeof ig !== "object") {
    console.log("[usernameSearch] No instagram data found for handle:", handle);
    return { creators: [], total: 0, rawResponse };
  }

  // Map enrichment response to a CreatorCard via the same mapper used for discovery
  const profile = { ...ig } as Record<string, unknown>;
  if (result) mergeEnrichFlags(profile, result);
  const card = mapAccountToCard(
    { user_id: (ig.username as string) ?? handle, profile: profile as unknown as ApiProfile },
    0
  );

  return { creators: [card], total: 1, rawResponse };
}

/**
 * Find lookalike creators via the enrichment API with include_lookalikes: true.
 */
export async function searchLookalike(
  username: string,
  platform: string = "instagram"
): Promise<SearchCreatorsResult> {
  const handle = username.replace(/^@/, "").trim().toLowerCase();
  if (!handle) throw new Error("Username is required");

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("VITE_INFLUENCERS_CLUB_API_KEY is not set");

  const body = {
    handle,
    platform: platform.toLowerCase(),
    include_lookalikes: true,
    email_required: "preferred",
  };

  console.log("[lookalikeSearch] POST", RAW_ENRICH_URL);
  console.log("[lookalikeSearch] Body:", JSON.stringify(body, null, 2));

  const res = await fetch(RAW_ENRICH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const rawResponse = await res.json();
  console.log("[lookalikeSearch] Response status:", res.status);

  if (!res.ok) {
    throw new Error(`Lookalike search ${res.status}: ${res.statusText}`, { cause: rawResponse });
  }

  const result = (rawResponse as Record<string, unknown>)?.result as Record<string, unknown> | undefined;
  const lookalikes = result?.lookalikes as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(lookalikes) || lookalikes.length === 0) {
    console.log("[lookalikeSearch] No lookalikes found for handle:", handle);
    return { creators: [], total: 0, rawResponse };
  }

  // Map each lookalike to a CreatorCard
  const creators: CreatorCard[] = lookalikes.map((la, i) => {
    const profile = (la.profile ?? la) as unknown as ApiProfile;
    const userId = (la.user_id ?? la.username ?? profile.username ?? `lookalike-${i}`) as string;
    return mapAccountToCard({ user_id: userId, profile }, i);
  });

  return { creators, total: creators.length, rawResponse };
}

/** Log credit usage to Supabase (fire-and-forget, non-blocking) */
export function logCreditUsage(
  userId: string,
  action: "discovery_search" | "raw_enrichment" | "full_enrichment" | "export",
  creditsUsed: number,
  metadata?: Record<string, unknown>
): void {
  // Dynamic import to avoid circular deps — use the existing supabase singleton
  import("@/integrations/supabase/client").then(({ supabase }) => {
    supabase.from("api_credit_log").insert({
      user_id: userId,
      action,
      credits_used: creditsUsed,
      metadata: metadata ?? null,
    } as Record<string, unknown>).then(({ error }) => {
      if (error) console.warn("[CreditLog] Failed to log:", error.message);
    });
  }).catch((err) => {
    console.warn("[CreditLog] Failed to import supabase:", err);
  });
}
