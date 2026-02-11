// Use relative /api/* paths; Vercel rewrites forward to upstream. Auth must be in the request
// (Vercel does not inject headers), so we always send Authorization in every fetch.
const DISCOVERY_URL = "/api/influencers/public/v1/discovery/";
const ENRICH_URL = "/api/enrich/public/v1/creators/enrich/handle/full/";

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
    typeof p?.engagement_percent === "number"
      ? p.engagement_percent
      : Number(p?.engagement_percent) || 0;
  const engagementRate = Number(engagementRaw.toFixed(1));

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
  if (socialPlatforms.length === 0 && (p?.username || id)) socialPlatforms.push("instagram");

  const hashtagsRaw =
    (p?.hashtags as string[] | undefined) ??
    (p?.frequently_used_hashtags as string[] | undefined) ??
    (p?.tags as string[] | undefined);
  const hashtags = Array.isArray(hashtagsRaw)
    ? hashtagsRaw.slice(0, 10).map((t) => (typeof t === "string" ? t.replace(/^#/, "") : String(t)))
    : undefined;

  const linksRaw =
    (p?.links_in_bio as unknown) ??
    (p?.external_links as unknown) ??
    (p?.link_in_bio as unknown);
  const externalLinks: { label: string; url?: string }[] = [];
  if (Array.isArray(linksRaw)) {
    linksRaw.forEach((item: unknown) => {
      const o = item as Record<string, unknown>;
      const url = (o.url ?? o.href ?? o.link ?? o) as string | undefined;
      if (typeof url !== "string" || !url.startsWith("http")) return;
      const lower = url.toLowerCase();
      let label = (o.label ?? o.title) as string | undefined;
      if (!label) {
        if (lower.includes("linktr.ee") || lower.includes("linktree")) label = "Linktree";
        else if (lower.includes("amazon")) label = "Amazon";
        else if (lower.includes("shopify")) label = "Shopify";
        else if (lower.includes("bio.site")) label = "Bio.link";
        else label = "Link";
      }
      externalLinks.push({ label: String(label), url });
    });
  } else if (typeof linksRaw === "string" && linksRaw.startsWith("http")) {
    const lower = linksRaw.toLowerCase();
    const label = lower.includes("linktr") ? "Linktree" : lower.includes("amazon") ? "Amazon" : "Link";
    externalLinks.push({ label, url: linksRaw });
  }
  if (externalLinks.length === 0 && Boolean(p?.uses_link_in_bio)) {
    externalLinks.push({ label: "Link in bio" });
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

  const platformValue = (options.platform ?? "instagram").toLowerCase();
  const number_of_followers = options.number_of_followers ?? { min: null, max: null };
  const engagement_percent = options.engagement_percent ?? { min: null, max: null };
  const keywords_in_bio = options.keywords_in_bio != null && options.keywords_in_bio.length > 0
    ? options.keywords_in_bio.filter((s) => s.trim() !== "")
    : [""];
  if (keywords_in_bio.length === 0) keywords_in_bio.push("");

  const body = {
    platform: platformValue,
    paging: { limit: 50, page: options.page ?? 1 },
    sort: { sort_by: options.sort_by ?? "relevancy", sort_order: "desc" as const },
    filters: {
      ai_search: trimmed,
      number_of_followers: { min: number_of_followers.min, max: number_of_followers.max },
      engagement_percent: { min: engagement_percent.min, max: engagement_percent.max },
      keywords_in_bio,
      exclude_role_based_emails: false,
      ...(options.location ? { location: options.location } : {}),
    },
  };

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
 * Enrich a creator profile by handle (username).
 * POST to the enrich handle/full endpoint. Returns result + result.instagram, or null if no instagram data.
 * Optional signal supports timeout/abort.
 * Endpoint (via proxy): /api/enrich -> https://api-dashboard.influencers.club/public/v1/creators/enrich/handle/full/
 */
export async function enrichCreatorProfile(
  username: string,
  signal?: AbortSignal
): Promise<EnrichedProfileResponse | null> {
  const handle = username.replace(/^@/, "").trim();

  const url = ENRICH_URL;
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

  // === VERY VISIBLE: full response for debugging mapping / "Data not available" ===
  const dataRecord = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  console.log(JSON.stringify(data, null, 2));
  if (dataRecord.data) {
  }
  if (dataRecord.result) {
    console.log("data.result KEYS:", Object.keys(dataRecord.result as object));
  }
  if (dataRecord.report) {
    console.log("data.report KEYS:", Object.keys(dataRecord.report as object));
  }
  if (dataRecord.error || dataRecord.message || dataRecord.status) {
    console.log("ERROR/MESSAGE/STATUS:", dataRecord.error, dataRecord.message, dataRecord.status);
  }
  // === END full response log ===

  const dataObj = dataRecord;
  console.log("[Enrich] TOP-LEVEL KEYS:", Object.keys(dataObj));
  console.log("[Enrich] FULL DATA:", JSON.stringify(data, null, 2));
  if (dataObj && dataObj.profile && typeof dataObj.profile === "object") {
    console.log("[Enrich] profile keys:", Object.keys(dataObj.profile as object));
  }
  if (dataObj.statistics && typeof dataObj.statistics === "object") {
    console.log("[Enrich] statistics keys:", Object.keys(dataObj.statistics as object));
  }
  if (dataObj.user_profile && typeof dataObj.user_profile === "object") {
    console.log("[Enrich] user_profile keys:", Object.keys(dataObj.user_profile as object));
  }
  if (dataObj.result && typeof dataObj.result === "object") {
    console.log("[Enrich] result keys:", Object.keys(dataObj.result as object));
  }
  if (dataObj.data != null && typeof dataObj.data === "object") {
    console.log("[Enrich] data keys:", Object.keys(dataObj.data as object));
  }

  if (!res.ok) {
    console.error("[Enrich] Step 5: API error (non-2xx):", res.status, res.statusText, data);
    throw new Error(`Enrich API ${res.status}: ${res.statusText}`, { cause: data });
  }

  const result = (data as Record<string, unknown>)?.result as Record<string, unknown> | undefined;
  const ig = result && typeof result === "object" ? (result.instagram as Record<string, unknown> | undefined) : undefined;

  console.log("[Enrich] Response received, platforms:", result ? Object.keys(result) : []);
  console.log("[Enrich] Instagram data:", ig ? "YES" : "NO");
  console.log("[Enrich] Bio:", ig?.biography != null ? String(ig.biography).substring(0, 50) : undefined);
  console.log("[Enrich] Followers:", ig?.follower_count);
  console.log("[Enrich] Cross-platform:", result?.creator_has);
  console.log("[Enrich] Email:", result?.email);
  console.log("[Enrich] Lookalikes:", Array.isArray(result?.lookalikes) ? result.lookalikes.length : 0);

  if (!ig || typeof ig !== "object") {
    console.log("[Enrich] No instagram data in result");
    return null;
  }

  return { result: result ?? {}, instagram: ig };
}
