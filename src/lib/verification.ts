import type { EvidenceSource, RedFlag } from "@/types/verification";

const MILITARY_EMPLOYERS = [
  "United States Army", "US Army", "Army", "U.S. Army",
  "US Navy", "U.S. Navy", "Navy",
  "USMC", "Marine Corps", "U.S. Marine", "Marines",
  "US Air Force", "U.S. Air Force", "Air Force",
  "US Coast Guard", "Coast Guard",
  "Space Force", "Department of Defense", "DoD", "DOD",
  "VA ", "Veterans Affairs", "Veterans Administration",
];
const MILITARY_TITLES = [
  "Sergeant", "Lieutenant", "Captain", "Major", "Colonel", "General",
  "Private", "Corporal", "Specialist", "Petty Officer", "Seaman", "Airman",
  "Commander", "Admiral", "Chief", "Warrant Officer", "Gunnery Sergeant",
  "First Lieutenant", "Second Lieutenant", "Staff Sergeant", "Lance Corporal",
];
const MILITARY_ACADEMIES = ["West Point", "Annapolis", "Air Force Academy", "USMA", "USNA", "USAFA", "VMI", "The Citadel", "Norwich"];

function safeString(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val.toLowerCase();
  if (typeof val === "object" && "name" in val) return String((val as { name?: unknown }).name).toLowerCase();
  return String(val).toLowerCase();
}

// --- People Data Labs ---
export interface PDLEnrichParams {
  name?: string;
  profile?: string[];
  location?: string;
}
export interface PDLJob {
  title?: { name: string };
  organization?: string;
  location?: { name: string };
  start_date?: string;
  end_date?: string;
}
export interface PDLResponse {
  job_title?: string;
  employment?: { title?: string; organization?: string }[];
  education?: { school?: string; degree?: string }[];
  profiles?: { url: string; network: string }[];
  location?: Array<{ name: string }>;
  [key: string]: unknown;
}

export async function enrichPersonPDL(params: PDLEnrichParams): Promise<PDLResponse | null> {
  const searchParams = new URLSearchParams();
  if (params.name) searchParams.set("name", params.name);
  if (params.profile?.length) {
    for (const p of params.profile) searchParams.append("profile", p);
  }
  if (params.location) searchParams.set("location", params.location);
  searchParams.set("min_likelihood", "2");
  try {
    const url = `/api/pdl/v5/person/enrich?${searchParams.toString()}`;
    console.log("[Verification] PDL request:", url);
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    const text = await res.text();
    console.log("[Verification] PDL response status:", res.status, "body length:", text.length, "preview:", text.slice(0, 300));
    if (!res.ok) {
      console.warn("[Verification] PDL FAILED:", res.status, text.slice(0, 500));
      throw new Error(`PDL ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = JSON.parse(text);
    const result = (json.data ?? json) as PDLResponse;
    console.log("[Verification] PDL SUCCESS — keys:", Object.keys(result), "employment:", (result.employment ?? []).length, "profiles:", (result.profiles ?? []).length);
    return result;
  } catch (e) {
    console.error("[Verification] PDL error:", e);
    return null;
  }
}

export function scorePDL(data: PDLResponse | null): number {
  let employer = 0;
  let title = 0;
  let education = 0;
  if (!data) return 0;
  const employment = (data.employment ?? (data as { employment?: unknown[] }).employment ?? []) as Record<string, unknown>[];
  const educationList = (data.education ?? (data as { education?: unknown[] }).education ?? []) as Record<string, unknown>[];
  for (const job of employment) {
    const org = safeString(job?.company) || safeString(job?.organization);
    const jobTitle = safeString(job?.title);
    if (employer === 0 && MILITARY_EMPLOYERS.some((e) => org.includes(e.toLowerCase()))) employer = 20;
    if (title === 0 && MILITARY_TITLES.some((t) => jobTitle.includes(t.toLowerCase()))) title = 10;
  }
  for (const edu of educationList) {
    const school = safeString(edu?.school);
    const degree = safeString(edu?.degree);
    if (education === 0 && MILITARY_ACADEMIES.some((a) => school.includes(a.toLowerCase()))) education = 10;
  }
  return Math.min(40, employer + title + education);
}

// --- SerpAPI ---
export interface SerpResult {
  title?: string;
  link?: string;
  snippet?: string;
}
export interface SerpResponse {
  organic_results?: SerpResult[];
}

export async function searchSerp(query: string): Promise<SerpResult[]> {
  try {
    const res = await fetch(`/api/serp?engine=google&q=${encodeURIComponent(query)}&num=10`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
    const data: SerpResponse = await res.json();
    return data.organic_results ?? [];
  } catch (e) {
    console.error("[Verification] SerpAPI error:", e);
    return [];
  }
}

const MILITARY_KEYWORDS = /military|veteran|army|navy|marine|air force|coast guard|served|deployment|dd-214|rank|sergeant|lieutenant|captain|medal|decorated|combat|reserve|guard|usmc|dod|veterans affairs/i;
const NEGATIVE_KEYWORDS = /criminal|fraud|stolen valor|convicted|arrested|indicted|scam|fake/i;

export function categorizeAndScoreSnippet(snippet: string, title: string): { category: EvidenceSource["category"]; relevance: number; isRedFlag: boolean } {
  const text = `${title} ${snippet}`.toLowerCase();
  const isNegative = NEGATIVE_KEYWORDS.test(text);
  const hasMilitary = MILITARY_KEYWORDS.test(text);
  let category: EvidenceSource["category"] = "Other";
  if (text.includes("linkedin")) category = "Professional";
  else if (text.includes("twitter") || text.includes("instagram") || text.includes("facebook")) category = "Social Media";
  else if (text.includes("news") || text.includes("times") || text.includes("post") || text.includes("tribune")) category = "News";
  else if (hasMilitary) category = "Military Service";
  else if (isNegative) category = "Criminal Record";
  let relevance = 0;
  if (hasMilitary) relevance += 50;
  if (snippet.length > 80) relevance += 20;
  if (category === "Military Service") relevance = Math.min(100, relevance + 30);
  if (isNegative) relevance = Math.min(100, relevance);
  return { category, relevance: Math.min(100, relevance), isRedFlag: isNegative };
}

// --- FireCrawl ---
export async function scrapeFirecrawl(url: string): Promise<{ markdown?: string } | null> {
  try {
    const res = await fetch("/api/firecrawl/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (!res.ok) throw new Error(`FireCrawl ${res.status}`);
    const data = await res.json();
    return data.data ?? data;
  } catch (e) {
    console.error("[Verification] FireCrawl error:", e);
    return null;
  }
}

// --- Scoring ---
// CONFIDENCE SCORE = identity verification + background check ONLY.
// "Is this person who they say they are, and is there anything concerning?"
// Generous scoring: absence of evidence is NOT evidence of fraud.
// Speaker Readiness is a SEPARATE checklist and does NOT affect this score.

const NON_SERVICE_TYPES = new Set(["military_spouse", "military_family", "gold_star"]);

export function computeVerificationScore(
  pdlScore: number,
  evidenceSources: EvidenceSource[],
  contentSignals: { hasUnitOrMOS: boolean; hasDates: boolean; hasAwards: boolean },
  extra?: { claimedBranch?: string; claimedType?: string; linkedinUrl?: string; pdlData?: unknown }
): number {
  let score = 0;
  const claimedType = (extra?.claimedType ?? "").toLowerCase();
  const isNonService = NON_SERVICE_TYPES.has(claimedType);

  // --- Identity baseline (+20) ---
  // Non-service categories (spouse, family, gold star) get this automatically — they
  // aren't claiming military service so we don't require branch/service verification.
  // Service members get it when a branch is confirmed.
  if (isNonService) {
    score += 20;
  } else {
    const claimedBranch = extra?.claimedBranch;
    if (claimedBranch && claimedBranch !== "Unknown") score += 20;
  }

  // Clean background check — no red flags (+20)
  const redFlags = evidenceSources.filter((s) => s.isRedFlag);
  if (!redFlags || redFlags.length === 0) score += 20;

  // Evidence sources: 1-4 = +5, 5-9 = +10, 10-19 = +15, 20+ = +20
  const sourceCount = evidenceSources.length;
  if (sourceCount >= 20) score += 20;
  else if (sourceCount >= 10) score += 15;
  else if (sourceCount >= 5) score += 10;
  else if (sourceCount >= 1) score += 5;

  // PDL record found (+15) — only if data actually returned
  const hasPdlData = extra?.pdlData != null || pdlScore > 0;
  if (hasPdlData) score += 15;

  // LinkedIn found/confirmed (+10)
  const linkedinConfirmed = !!(extra?.linkedinUrl) || evidenceSources.some((s) => s.url?.includes("linkedin.com"));
  if (linkedinConfirmed) score += 10;

  // Any social platform confirmed (+10)
  const socialFound = evidenceSources.some((s) =>
    s.category === "Social Media" ||
    /instagram\.com|youtube\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com/i.test(s.url ?? "")
  );
  if (socialFound) score += 10;

  // Content signals (+5) — for service members: dates/MOS; for non-service: any content presence
  if (isNonService) {
    // Non-service types get content credit if any content signals found (community involvement, etc.)
    if (contentSignals.hasDates || contentSignals.hasUnitOrMOS || contentSignals.hasAwards) score += 5;
  } else {
    if (contentSignals.hasDates || contentSignals.hasUnitOrMOS) score += 5;
  }

  // Bonus: Instagram handle present (+5)
  const hasInstagram = evidenceSources.some((s) => /instagram\.com/i.test(s.url ?? ""));
  if (hasInstagram) score += 5;

  // Bonus: YouTube results found (+5) — media presence confirmed
  const hasYouTube = evidenceSources.some((s) => /youtube\.com|youtu\.be/i.test(s.url ?? ""));
  if (hasYouTube) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function recommendStatus(score: number, hasCriminalFlags: boolean): "verified" | "pending" | "flagged" | "denied" {
  // Only flag if there's actual negative evidence AND score is low
  if (hasCriminalFlags && score < 40) return "flagged";
  if (score >= 80) return "verified";
  if (score >= 40) return "pending";
  return "flagged";
}

/** Re-compute score from an existing DB record without API calls. */
export function recomputeScoreFromRecord(record: {
  pdl_data?: unknown;
  evidence_sources?: unknown;
  claimed_branch?: string | null;
  claimed_type?: string | null;
  linkedin_url?: string | null;
  firecrawl_data?: unknown;
}): { score: number; status: "verified" | "pending" | "flagged" | "denied" } {
  const pdlData = record.pdl_data as PDLResponse | null;
  const pdlScore = scorePDL(pdlData);
  const evidenceSources = Array.isArray(record.evidence_sources)
    ? (record.evidence_sources as EvidenceSource[])
    : [];
  const firecrawlData = Array.isArray(record.firecrawl_data)
    ? (record.firecrawl_data as { url: string; markdown?: string }[])
    : [];
  const contentSignals = { hasUnitOrMOS: false, hasDates: false, hasAwards: false };
  for (const fc of firecrawlData) {
    const md = (fc.markdown ?? "").toLowerCase();
    if (MILITARY_KEYWORDS.test(md)) contentSignals.hasUnitOrMOS = true;
    if (/\d{4}\s*[-–]\s*\d{4}|served from|deployment|active duty|enlisted|commissioned/i.test(md)) contentSignals.hasDates = true;
    if (/medal|decoration|award|ribbon|badge|purple heart|bronze star|silver star/i.test(md)) contentSignals.hasAwards = true;
  }
  const score = computeVerificationScore(pdlScore, evidenceSources, contentSignals, {
    claimedBranch: record.claimed_branch ?? undefined,
    claimedType: record.claimed_type ?? undefined,
    linkedinUrl: record.linkedin_url ?? undefined,
    pdlData,
  });
  const hasCriminalFlags = evidenceSources.some((s) => s.isRedFlag);
  return { score, status: recommendStatus(score, hasCriminalFlags) };
}

// --- AI Analysis (Claude) ---
const ANTHROPIC_URL = "/api/anthropic";
function anthropicHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
}

export async function runVerificationAnalysis(params: {
  personName: string;
  claimedStatus: string;
  claimedBranch: string;
  claimedType: string;
  pdlData: unknown;
  serpResults: unknown;
  firecrawlExtractions: unknown;
  mediaAppearances?: unknown;
  careerData?: unknown;
  socialProfiles?: unknown;
}): Promise<string> {
  const systemPrompt = `You are a military service verification analyst for MilCrunch — a platform that supports and celebrates military creators and veterans. Your job is to look for SUPPORTING evidence, not to play "gotcha."

CRITICAL PRINCIPLES:
- Be GENEROUS. The default assumption is that the person IS who they claim to be.
- Absence of evidence is NOT evidence of fraud. Many veterans have zero online footprint.
- Only flag someone if there is CONCRETE NEGATIVE evidence (stolen valor conviction, criminal fraud, factually impossible claims like serving in a branch that didn't exist).
- A lack of PDL employment data, web results, or scrape content should NOT lower confidence — these databases are incomplete.
- Military service records are often not publicly available. This is normal.

Analyze the following evidence about ${params.personName} who claims to be a ${params.claimedStatus} from the ${params.claimedBranch} of type ${params.claimedType}.

Evidence sources:
1. People Data Labs professional data: ${JSON.stringify(params.pdlData, null, 2)}
2. Web search results: ${JSON.stringify(params.serpResults, null, 2)}
3. Scraped page content: ${JSON.stringify(params.firecrawlExtractions, null, 2)}
4. Media & Appearances: ${JSON.stringify(params.mediaAppearances ?? [], null, 2)}
5. Career Timeline: ${JSON.stringify(params.careerData ?? null, null, 2)}
6. Social Profiles: ${JSON.stringify(params.socialProfiles ?? [], null, 2)}

MILITARY CATEGORY DETECTION — CRITICAL:
Before scoring, determine the person's ACTUAL military connection type from the evidence:
- "Veteran" — ONLY if evidence shows PERSONAL military service (their own enlistment, "I served", "when I was deployed", their own DD-214, etc.)
- "Military Spouse" — if evidence mentions: "military spouse", "milspouse", "my husband/wife serves/served", "married to a Marine/Soldier", "military wife/husband", "deployment wife/husband", "PCS life", etc.
- "Gold Star Family" — if evidence mentions: "Gold Star", "fallen Marine/Soldier", husband/wife killed in action, tribute to fallen service member
- "Military Family" — if evidence mentions: "military kid/brat/child", parent who served, etc.
IMPORTANT: References to a SPOUSE's or FAMILY MEMBER's military service (e.g. "my Marine husband", "tribute to my fallen husband") should categorize the person as Military Spouse or Gold Star — NOT as Veteran. Only personal service evidence makes someone a Veteran.

Provide:
1. MILITARY CATEGORY: State the detected category (Veteran / Military Spouse / Gold Star Family / Military Family / Active Duty) and the branch if identifiable. Explain which evidence led to this determination.
2. VERIFICATION CONFIDENCE: A score from 50-100% with reasoning. Start at 50% (benefit of the doubt) and only go UP with supporting evidence, or DOWN if there is concrete negative evidence.
3. EVIDENCE SUMMARY: Key findings. Highlight anything that SUPPORTS the claim. Only mention contradictions if they are factual and specific.
4. RED FLAGS: ONLY list these if there is actual negative evidence (criminal records, stolen valor reports, factual impossibilities). Do NOT list "no evidence found" as a red flag.
5. RECOMMENDED STATUS: Verified (supporting evidence found), Pending (no evidence either way — this is the DEFAULT), Flagged (concrete negative evidence found).
6. SUGGESTED FOLLOW-UP: What additional steps could confirm the claim — e.g., DD-214 upload, reference check, direct outreach.

Remember: Most veterans are telling the truth. Give them the benefit of the doubt.`;

  try {
    const { json: data } = await fetchAnthropicWithRetry({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: "Please perform the verification analysis and provide your assessment." }],
    });
    const text = (data as any).content?.[0]?.text ?? "";
    const out = (text ?? "").trim();
    if (!out) return "No analysis generated.";
    // Clean markdown headers (###, ####) → bold lines so MarkdownResponse renders them cleanly
    const cleaned = out.replace(/^#{3,}\s+(.+)$/gm, "**$1**");
    return cleaned;
  } catch (e) {
    console.error("[Verification] Claude error after all retries:", e);
    return "pending_retry";
  }
}

// --- Criminal History AI Filter ---
export interface AIFilteredCriminalResult {
  title: string;
  url: string;
  snippet: string;
  relevance_score: number;
  concern_level: "none" | "low" | "medium" | "high";
  reasoning: string;
}

export async function filterCriminalResults(params: {
  personName: string;
  claimedBranch: string;
  locationContext: string;
  results: { title: string; url: string; snippet: string }[];
}): Promise<{
  filtered: AIFilteredCriminalResult[];
  summary: string;
  ai_failed?: boolean;
}> {
  const prompt = `You are filtering criminal/background search results for a specific person.
Subject: "${params.personName}", claimed military branch: ${params.claimedBranch}, location context: ${params.locationContext || "unknown"}.

Here are the search results to analyze:
${JSON.stringify(params.results, null, 2)}

For EACH result, determine:
1. NAME MATCH: Is this result about the SAME "${params.personName}", or a DIFFERENT person who happens to share a similar name? Compare the full name carefully. If the result mentions a different first name, middle name, age, or location that doesn't match, it is likely a different person — mark relevance_score below 20.
2. CONCERN_LEVEL: none, low, medium, high
3. REASONING: Brief explanation

IMPORTANT RULES:
- Generic mentions of military documents (DD-214, VA benefits, GI Bill, military records) are NOT red flags unless they specifically indicate fraud or falsification by this person.
- Educational or informational content about military processes is NOT a red flag.
- Results about a DIFFERENT person with a similar name must get relevance_score below 20 and concern_level "none".
- Only mark concern_level "high" if you are confident the result is about THIS specific person AND indicates stolen valor, fraud, or criminal activity.
- Be CONSERVATIVE: when in doubt, mark relevance as low and concern as none.

Return a JSON object with this exact structure:
{
  "results": [
    {
      "title": "...",
      "url": "...",
      "snippet": "...",
      "relevance_score": 0-100,
      "concern_level": "none|low|medium|high",
      "reasoning": "..."
    }
  ],
  "summary": "Based on analysis, X of Y results appear to be about a different person. Recommended confidence in criminal findings: Z%"
}

Return ONLY the JSON object, no markdown formatting.`;

  try {
    const { json: data } = await fetchAnthropicWithRetry({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const text = ((data as any).content?.[0]?.text ?? "").trim();
    // Strip markdown code fences if present
    const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr);
    return {
      filtered: (parsed.results ?? []).map((r: Record<string, unknown>) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        snippet: r.snippet ?? "",
        relevance_score: typeof r.relevance_score === "number" ? r.relevance_score : 50,
        concern_level: r.concern_level ?? "low",
        reasoning: r.reasoning ?? "",
      })),
      summary: parsed.summary ?? "",
    };
  } catch (e) {
    console.error("[Verification] Criminal filter AI error:", e);
    // Do NOT return unfiltered results as concerns — return empty with failure flag
    return {
      filtered: [],
      summary: "Background review incomplete — AI analysis unavailable.",
      ai_failed: true,
    };
  }
}

// --- YouTube Media Search ---
export interface YouTubeResult {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export async function searchYouTube(personName: string, branch?: string, socialHandle?: string): Promise<YouTubeResult[]> {
  // Build queries with increasing specificity
  const handleTerm = socialHandle ? ` "${socialHandle}"` : "";
  const branchTerm = branch && branch !== "Unknown" ? branch : "military";
  const queries = [
    // Most specific: name + handle
    socialHandle ? `"${personName}" "${socialHandle}"` : null,
    // Name + branch/military context
    `"${personName}" ${branchTerm}`,
    // Name + veteran
    `"${personName}" veteran`,
    // Handle alone (if available) — catches content posted by/about their handle
    socialHandle ? `"${socialHandle}" ${branchTerm}` : null,
  ].filter((q): q is string => q !== null);

  const allVideos: YouTubeResult[] = [];
  const seenIds = new Set<string>();

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        part: "snippet",
        type: "video",
        q,
        maxResults: "5",
      });
      const resp = await fetch(`/api/youtube?${params.toString()}`);
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const item of data.items ?? []) {
        const id = item.id?.videoId;
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        allVideos.push({
          videoId: id,
          title: item.snippet?.title ?? "Untitled",
          channelTitle: item.snippet?.channelTitle ?? "",
          description: item.snippet?.description ?? "",
          thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? "",
          publishedAt: item.snippet?.publishedAt ?? "",
        });
      }
    } catch {
      // continue with next query
    }
  }

  // Post-fetch relevance filter: keep only results mentioning the person's name, handle, or military context
  const nameParts = personName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
  const handleLower = (socialHandle || "").toLowerCase().replace(/^@/, "");
  const filtered = allVideos.filter((v) => {
    const haystack = `${v.title} ${v.channelTitle} ${v.description}`.toLowerCase();
    // Must match at least one: handle, last name, or first+last name combo
    const matchesHandle = handleLower && haystack.includes(handleLower);
    const matchesLastName = nameParts.length > 0 && haystack.includes(nameParts[nameParts.length - 1]);
    const matchesFullName = nameParts.length >= 2 && nameParts.every((part) => haystack.includes(part));
    return matchesHandle || matchesFullName || matchesLastName;
  });

  console.log(`[searchYouTube] ${allVideos.length} raw → ${filtered.length} after relevance filter (name="${personName}", handle="${socialHandle || ""}")`);
  return filtered.slice(0, 20);
}

// --- Pipeline ---
export interface VerificationInput {
  fullName: string;
  claimedBranch: string;
  claimedType: string;
  claimedStatus: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  notes?: string;
  /** Social handle (e.g. "joellerblades") — used to tighten YouTube/media search queries */
  socialHandle?: string;
}

export interface PipelinePhase {
  phase: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  name: string;
  status: "running" | "done" | "empty" | "error" | "skipped";
  data?: unknown;
}

export interface SocialProfile {
  network: string;
  url: string;
  verified: boolean;
}

export interface SocialVerificationResult {
  profiles: SocialProfile[];
  linkedinVerified: boolean;
  instagramFound: boolean;
  totalPlatforms: number;
}

export async function runVerificationPipeline(
  input: VerificationInput,
  onPhase: (phase: PipelinePhase) => void
): Promise<{
  verificationScore: number;
  status: "verified" | "pending" | "flagged" | "denied";
  pdlData: PDLResponse | null;
  serpResults: SerpResult[];
  evidenceSources: EvidenceSource[];
  redFlags: RedFlag[];
  firecrawlData: { url: string; markdown?: string }[];
  aiAnalysis: string;
  linkedinUrl: string | null;
  jobTitle: string | null;
  currentEmployer: string | null;
  skills: string[];
  experience: { title?: string; organization?: string }[];
  education: { school?: string; degree?: string }[];
  youtubeResults: YouTubeResult[];
  mediaAppearances: { type: string; title: string; url: string; snippet?: string }[];
  mediaComplete: boolean;
  careerData: EnhancedCareerResult | null;
  careerComplete: boolean;
  socialVerification: SocialVerificationResult;
  socialComplete: boolean;
}> {
  console.log("[Verify] API Keys present:", {
    serp: !!import.meta.env.VITE_SERP_API_KEY,
    firecrawl: !!import.meta.env.VITE_FIRECRAWL_API_KEY,
    pdl: !!import.meta.env.VITE_PDL_API_KEY,
    anthropic: !!import.meta.env.VITE_ANTHROPIC_API_KEY,
  });

  const evidenceSources: EvidenceSource[] = [];
  const redFlags: RedFlag[] = [];
  let firecrawlData: { url: string; markdown?: string }[] = [];
  let pdlData: PDLResponse | null = null;
  let serpResults: SerpResult[] = [];
  let pdlScore = 0;
  let contentSignals = { hasUnitOrMOS: false, hasDates: false, hasAwards: false };

  // Phase 1: PDL — always mark complete even if no results
  onPhase({ phase: 1, name: "People Data Labs", status: "running" });
  try {
    pdlData = await enrichPersonPDL({
      name: input.fullName,
      profile: input.linkedinUrl ? [input.linkedinUrl] : undefined,
      location: undefined,
    });
    pdlScore = scorePDL(pdlData);
  } catch (e) {
    console.warn("[Verify] Phase 1 failed:", e);
  }
  // Extract useful fields from PDL response
  const pdlLinkedinUrl = pdlData?.profiles?.find((p: any) => p.network === 'linkedin')?.url || null;
  const pdlJobTitle = pdlData?.job_title || pdlData?.employment?.[0]?.title || null;
  const pdlCurrentEmployer = pdlData?.employment?.[0]?.organization || null;
  const pdlSkills = (pdlData as any)?.skills?.map((s: any) => s.name || s) || [];
  const pdlExperience = pdlData?.employment || [];
  const pdlEducation = pdlData?.education || [];
  onPhase({ phase: 1, name: "People Data Labs", status: "done", data: pdlData });

  // Phase 2: SerpAPI — always mark complete even if no results
  onPhase({ phase: 2, name: "Web Search", status: "running" });
  const queries = [
    `${input.fullName} military veteran`,
    `${input.fullName} ${input.claimedBranch}`,
    input.claimedType ? `${input.fullName} ${input.claimedType}` : "",
    `${input.fullName} site:linkedin.com military`,
    `${input.fullName} DD-214`,
  ].filter(Boolean);
  try {
    for (const q of queries) {
      const results = await searchSerp(q);
      serpResults = [...serpResults, ...results];
    }
    const seen = new Set<string>();
    for (const r of serpResults) {
      const url = r.link ?? "";
      if (seen.has(url)) continue;
      seen.add(url);
      const { category, relevance, isRedFlag } = categorizeAndScoreSnippet(r.snippet ?? "", r.title ?? "");
      evidenceSources.push({
        title: r.title ?? "No title",
        url,
        snippet: r.snippet ?? "",
        relevanceScore: relevance,
        category,
        isRedFlag,
      });
      if (isRedFlag) redFlags.push({ text: r.snippet ?? "", source: url, severity: "high" });
    }
    evidenceSources.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  } catch (e) {
    console.warn("[Verify] Phase 2 failed:", e);
  }
  onPhase({ phase: 2, name: "Web Search", status: "done", data: evidenceSources });

  // YouTube media search — starts in parallel, awaited before Media phase
  let youtubeResults: YouTubeResult[] = [];
  const youtubePromise = searchYouTube(input.fullName, input.claimedBranch, input.socialHandle).then(
    (results) => { youtubeResults = results; },
    (err) => { console.warn("[Verify] YouTube search failed:", err); }
  );

  // Phase 5: Media & Appearances — consolidate YouTube + media-related SerpAPI results
  onPhase({ phase: 5, name: "Media & Appearances", status: "running" });
  await youtubePromise;
  let mediaComplete = false;
  const MEDIA_URL_PATTERN = /youtube\.com|youtu\.be|podcast|spotify\.com|apple\.com\/podcast|anchor\.fm|iheart|stitcher|soundcloud|vimeo|dailymotion|rumble|bitchute/i;
  const MEDIA_TEXT_PATTERN = /podcast|interview|episode|keynote|panel|speaking|appearance|guest|featured on|spoke at|conference/i;
  const mediaAppearances: { type: string; title: string; url: string; snippet?: string }[] = [];
  try {
    for (const yt of youtubeResults) {
      mediaAppearances.push({
        type: "youtube",
        title: yt.title,
        url: `https://www.youtube.com/watch?v=${yt.videoId}`,
        snippet: yt.description,
      });
    }
    // Relevance filter: only keep SerpAPI media results that mention the person's name, handle, or platforms
    const mediaNameParts = input.fullName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    const mediaHandleLower = (input.socialHandle || "").toLowerCase().replace(/^@/, "");
    const isMediaRelevant = (title: string, snippet: string, url: string): boolean => {
      const haystack = `${title} ${snippet} ${url}`.toLowerCase();
      if (mediaHandleLower && haystack.includes(mediaHandleLower)) return true;
      if (mediaNameParts.length >= 2 && mediaNameParts.every((part) => haystack.includes(part))) return true;
      // Last name match + military context
      const lastName = mediaNameParts[mediaNameParts.length - 1];
      if (lastName && haystack.includes(lastName) && /military|veteran|army|navy|marine|air force|coast guard|national guard/i.test(haystack)) return true;
      return false;
    };
    for (const es of evidenceSources) {
      const url = es.url ?? "";
      const text = `${es.title ?? ""} ${es.snippet ?? ""}`;
      if (MEDIA_URL_PATTERN.test(url) || MEDIA_TEXT_PATTERN.test(text)) {
        if (mediaAppearances.some((m) => url.includes(m.url) || m.url.includes(url))) continue;
        // Skip results that don't mention the actual person
        if (!isMediaRelevant(es.title ?? "", es.snippet ?? "", url)) continue;
        let type = "article";
        if (/youtube|youtu\.be|vimeo|rumble/i.test(url)) type = "video";
        else if (/podcast|spotify|apple.*podcast|anchor|iheart|stitcher|soundcloud/i.test(url)) type = "podcast";
        else if (MEDIA_TEXT_PATTERN.test(text)) type = "appearance";
        mediaAppearances.push({ type, title: es.title ?? "", url, snippet: es.snippet });
      }
    }
    // Cap at 20 results
    if (mediaAppearances.length > 20) mediaAppearances.length = 20;
    mediaComplete = true;
  } catch (err) {
    console.warn("[Verify] Phase 5 (Media) failed:", err);
  }
  onPhase({
    phase: 5,
    name: "Media & Appearances",
    status: mediaComplete ? (mediaAppearances.length > 0 ? "done" : "empty") : "error",
    data: { count: mediaAppearances.length, mediaComplete, mediaAppearances },
  });

  // Phase 6 (Career) moved after Phase 3 (Firecrawl) so it has web content
  let careerData: EnhancedCareerResult | null = null;
  let careerComplete = false;

  // Phase 7: Social Verification — validate social handles from PDL + evidence
  onPhase({ phase: 7, name: "Social Verification", status: "running" });
  let socialComplete = false;
  const socialProfiles: SocialProfile[] = [];

  // LinkedIn confidence check: only include if URL matches creator identity
  const isLinkedInConfident = (url: string): boolean => {
    // If user explicitly provided this LinkedIn URL, always trust it
    if (input.linkedinUrl && url.toLowerCase().includes(input.linkedinUrl.toLowerCase().replace(/\/$/, ""))) return true;
    const slug = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)?.[1]?.toLowerCase() ?? "";
    if (!slug) return false;
    // Match against social handle (e.g. "joellerblades")
    if (input.socialHandle && slug.includes(input.socialHandle.toLowerCase())) return true;
    // Match against last name
    const nameParts = input.fullName.trim().toLowerCase().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    if (lastName && lastName.length >= 3 && slug.includes(lastName)) return true;
    // Match against first name + last name combination
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      if (firstName.length >= 3 && slug.includes(firstName) && slug.includes(lastName)) return true;
    }
    return false;
  };

  try {
    if (pdlData?.profiles?.length) {
      for (const p of pdlData.profiles) {
        const network = p.network ?? "unknown";
        const url = p.url ?? "";
        // Filter LinkedIn through confidence check
        if (network === "linkedin" && !isLinkedInConfident(url)) {
          console.log("[Verify] Skipping unconfident LinkedIn from PDL:", url);
          continue;
        }
        socialProfiles.push({ network, url, verified: true });
      }
    }
    const SOCIAL_PATTERNS: { network: string; pattern: RegExp }[] = [
      { network: "instagram", pattern: /instagram\.com\/([a-zA-Z0-9_.]+)/i },
      { network: "linkedin", pattern: /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i },
      { network: "twitter", pattern: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i },
      { network: "youtube", pattern: /youtube\.com\/(?:@|channel\/|c\/)([a-zA-Z0-9_-]+)/i },
      { network: "tiktok", pattern: /tiktok\.com\/@([a-zA-Z0-9_.]+)/i },
      { network: "facebook", pattern: /facebook\.com\/([a-zA-Z0-9_.]+)/i },
    ];
    const seenNetworks = new Set(socialProfiles.map((p) => p.network));
    for (const es of evidenceSources) {
      const url = es.url ?? "";
      for (const { network, pattern } of SOCIAL_PATTERNS) {
        if (!seenNetworks.has(network) && pattern.test(url)) {
          // Filter LinkedIn through confidence check
          if (network === "linkedin" && !isLinkedInConfident(url)) {
            console.log("[Verify] Skipping unconfident LinkedIn from evidence:", url);
            continue;
          }
          socialProfiles.push({ network, url, verified: false });
          seenNetworks.add(network);
        }
      }
    }
    if (input.linkedinUrl && pdlLinkedinUrl) {
      const existing = socialProfiles.find((p) => p.network === "linkedin");
      if (existing) existing.verified = true;
    }
    socialComplete = true;
  } catch (err) {
    console.warn("[Verify] Phase 7 (Social) failed:", err);
  }
  const linkedinVerified = socialProfiles.some((p) => p.network === "linkedin" && p.verified);
  const instagramFound = socialProfiles.some((p) => p.network === "instagram");
  const socialVerification: SocialVerificationResult = {
    profiles: socialProfiles,
    linkedinVerified,
    instagramFound,
    totalPlatforms: socialProfiles.length,
  };
  onPhase({ phase: 7, name: "Social Verification", status: "done", data: { socialComplete, totalPlatforms: socialProfiles.length } });

  // Phase 3: Deep Extraction (FireCrawl) — non-blocking; failures must not kill the pipeline
  onPhase({ phase: 3, name: "Deep Extraction", status: "running" });
  try {
    const topUrls =
      serpResults
        .slice(0, 3)
        .map((r) => r.link)
        .filter(Boolean) as string[];
    if (topUrls.length > 0) {
      const scrapePromises = topUrls.map((url: string) =>
        scrapeFirecrawl(url).catch((err: unknown) => {
          console.log("[Verify] FireCrawl failed for:", url, err instanceof Error ? err.message : String(err));
          return null;
        })
      );
      const results = (await Promise.race([
        Promise.all(scrapePromises),
        new Promise<({ markdown?: string } | null)[]>((resolve) => setTimeout(() => resolve([]), 15000)),
      ])) as ({ markdown?: string } | null)[];
      for (let i = 0; i < results.length && i < topUrls.length; i++) {
        const scraped = results[i];
        if (scraped?.markdown) {
          const md = scraped.markdown.toLowerCase();
          if (MILITARY_KEYWORDS.test(md)) contentSignals.hasUnitOrMOS = true;
          if (/\d{4}\s*[-–]\s*\d{4}|served from|deployment|active duty|enlisted|commissioned/i.test(md)) contentSignals.hasDates = true;
          if (/medal|decoration|award|ribbon|badge|purple heart|bronze star|silver star/i.test(md)) contentSignals.hasAwards = true;
          firecrawlData.push({ url: topUrls[i], markdown: scraped.markdown });
        }
      }
    }
  } catch (err) {
    console.warn("[Verify] Phase 3 failed, continuing:", err);
    firecrawlData = [];
  }
  onPhase({ phase: 3, name: "Deep Extraction", status: "done", data: firecrawlData });

  // Phase 6: Career Extraction — AI-powered career timeline from PDL + web + firecrawl data
  onPhase({ phase: 6, name: "Career Extraction", status: "running" });
  try {
    const serpSnippets = evidenceSources.map((s) => `${s.title}: ${s.snippet}`).join("\n");
    const pdlSummary = pdlData ? JSON.stringify({
      employment: pdlData.employment,
      education: pdlData.education,
      job_title: pdlData.job_title,
      skills: (pdlData as any)?.skills,
    }) : undefined;
    const firecrawlContent = firecrawlData.map((d) => d.markdown ?? "").filter(Boolean).join("\n\n---\n\n");
    careerData = await extractCareerTimeline({
      personName: input.fullName,
      firecrawlContent,
      serpSnippets,
      claimedBranch: input.claimedBranch,
      notesField: input.notes,
      pdlSummary,
    });
    careerComplete = true;
    console.log("[Verify] Phase 6 career result:", JSON.stringify({
      branch: careerData.military_summary?.branch,
      careerEntries: careerData.career?.length ?? 0,
      educationEntries: careerData.education?.length ?? 0,
      awards: careerData.awards?.length ?? 0,
    }));
  } catch (err) {
    console.warn("[Verify] Phase 6 (Career) failed:", err);
  }
  const careerHasData = !!(careerData && (careerData.career.length > 0 || careerData.education.length > 0 || careerData.awards.length > 0 || careerData.military_summary?.branch));
  onPhase({
    phase: 6,
    name: "Career Extraction",
    status: careerComplete ? (careerHasData ? "done" : "empty") : "error",
    data: { careerComplete, careerData },
  });

  // Phase 4: AI Analysis — runs after all other phases so it can incorporate everything
  onPhase({ phase: 4, name: "AI Analysis", status: "running" });
  const aiAnalysis = await runVerificationAnalysis({
    personName: input.fullName,
    claimedStatus: input.claimedStatus,
    claimedBranch: input.claimedBranch,
    claimedType: input.claimedType,
    pdlData,
    serpResults: evidenceSources,
    firecrawlExtractions: firecrawlData,
    mediaAppearances,
    careerData,
    socialProfiles,
  });
  onPhase({ phase: 4, name: "AI Analysis", status: "done", data: aiAnalysis });

  const hasCriminalFlags = evidenceSources.some((s) => s.isRedFlag);
  const verificationScore = computeVerificationScore(pdlScore, evidenceSources, contentSignals, { claimedBranch: input.claimedBranch, claimedType: input.claimedType, linkedinUrl: input.linkedinUrl, pdlData });
  const status = recommendStatus(verificationScore, hasCriminalFlags);

  return {
    verificationScore,
    status,
    pdlData,
    serpResults,
    evidenceSources,
    redFlags,
    firecrawlData,
    aiAnalysis,
    linkedinUrl: pdlLinkedinUrl,
    jobTitle: pdlJobTitle,
    currentEmployer: pdlCurrentEmployer,
    skills: pdlSkills,
    experience: pdlExperience,
    education: pdlEducation,
    youtubeResults,
    mediaAppearances,
    mediaComplete,
    careerData,
    careerComplete,
    socialVerification,
    socialComplete,
  };
}

// --- Branch Auto-Detection ---
const BRANCH_PATTERNS: { branch: string; patterns: RegExp[] }[] = [
  { branch: "Army", patterns: [/\barmy\b/i, /\bsoldier\b/i, /\bfort\s+(bragg|hood|campbell|benning|sill|drum|riley|bliss|carson|stewart|leonard wood)\b/i] },
  { branch: "Navy", patterns: [/\bnavy\b/i, /\bsailor\b/i, /\bnaval\b/i, /\bUSN\b/] },
  { branch: "Marines", patterns: [/\bmarine\s*corps?\b/i, /\bUSMC\b/, /\bmarine\b/i, /\bsemper\s*fi\b/i] },
  { branch: "Air Force", patterns: [/\bair\s*force\b/i, /\bairman\b/i, /\bUSAF\b/] },
  { branch: "Coast Guard", patterns: [/\bcoast\s*guard\b/i, /\bUSCG\b/] },
  { branch: "Space Force", patterns: [/\bspace\s*force\b/i, /\bUSSF\b/] },
];

export function detectBranch(aiAnalysis: string | null, evidenceSources: { snippet: string; category: string }[]): string | null {
  const texts = [
    aiAnalysis ?? "",
    ...evidenceSources.filter((s) => s.category === "Military Service").map((s) => s.snippet),
  ].join(" ");
  if (!texts.trim()) return null;
  const counts: Record<string, number> = {};
  for (const { branch, patterns } of BRANCH_PATTERNS) {
    for (const pat of patterns) {
      const matches = texts.match(new RegExp(pat.source, "gi"));
      if (matches) counts[branch] = (counts[branch] ?? 0) + matches.length;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : null;
}

// --- Type Auto-Detection (Spouse / Family / Veteran) ---
// Analyzes AI analysis + evidence to determine if the person is a military spouse/family
// rather than a veteran. Spouse/family language takes PRIORITY over veteran label
// because spouses often reference their partner's service, which can be misread as their own.

const SPOUSE_PATTERNS: RegExp[] = [
  /\bmilitary\s+spouse\b/i,
  /\bmilspouse\b/i,
  /\bmil[\s-]?spouse\b/i,
  /\bmilitary\s+wife\b/i,
  /\bmilitary\s+husband\b/i,
  /\bmy\s+husband\b.*\b(?:serves?|served|veteran|military|deployed|marine|soldier|sailor|airman)\b/i,
  /\bmy\s+wife\b.*\b(?:serves?|served|veteran|military|deployed|marine|soldier|sailor|airman)\b/i,
  /\bmarried\s+to\s+a\s+(?:marine|soldier|sailor|airman|veteran|service\s*member)\b/i,
  /\b(?:marine|soldier|sailor|airman|veteran)\s+(?:husband|wife)\b/i,
  /\bdeployment\s+(?:wife|husband)\b/i,
  /\bPCS\s+(?:wife|husband|life|move)\b/i,
  /\bhusband\s+(?:is|was)\s+(?:a\s+)?(?:veteran|marine|soldier|sailor|airman|in\s+the\s+(?:army|navy|marines|air\s*force|coast\s*guard|military))\b/i,
  /\bwife\s+(?:is|was)\s+(?:a\s+)?(?:veteran|marine|soldier|sailor|airman|in\s+the\s+(?:army|navy|marines|air\s*force|coast\s*guard|military))\b/i,
  /\bfallen\s+(?:marine|soldier|sailor|airman|hero|husband|wife)\b/i,
  /\bhusband\b.*\b(?:fallen|killed\s+in\s+action|KIA)\b/i,
  /\bwife\b.*\b(?:fallen|killed\s+in\s+action|KIA)\b/i,
];

const GOLD_STAR_PATTERNS: RegExp[] = [
  /\bgold\s*star\b/i,
  /\bfallen\s+(?:marine|soldier|sailor|airman|hero|service\s*member)\b/i,
  /\bkilled\s+in\s+action\b/i,
  /\bKIA\b/,
  /\blost\s+(?:my|her|his)\s+(?:husband|wife|son|daughter|father|mother)\b.*\b(?:military|service|combat|war|deployment|iraq|afghanistan)\b/i,
  /\btribute\s+to\s+(?:my\s+)?fallen\b/i,
];

const FAMILY_PATTERNS: RegExp[] = [
  /\bmilitary\s+family\b/i,
  /\bmilitary\s+(?:kid|child|brat|daughter|son)\b/i,
  /\b(?:my\s+)?(?:dad|father|mom|mother)\s+(?:is|was)\s+(?:a\s+)?(?:veteran|marine|soldier|sailor|airman|in\s+the\s+(?:army|navy|marines|air\s*force|coast\s*guard|military))\b/i,
];

const PERSONAL_SERVICE_PATTERNS: RegExp[] = [
  /\bI\s+served\b/i,
  /\bwhen\s+I\s+(?:was\s+)?(?:deployed|enlisted|stationed)\b/i,
  /\bmy\s+(?:enlistment|service|deployment|MOS|DD[\s-]?214|military\s+career)\b/i,
  /\bI\s+(?:enlisted|deployed|was\s+stationed)\b/i,
  /\b(?:my|I)\s+(?:time\s+)?(?:in|with)\s+the\s+(?:army|navy|marines|air\s*force|coast\s*guard|military)\b/i,
  /\bafter\s+(?:I|my)\s+(?:left|retired\s+from)\s+(?:the\s+)?(?:army|navy|marines|air\s*force|coast\s*guard|military|service)\b/i,
];

export function detectType(
  aiAnalysis: string | null,
  evidenceSources: { title?: string; snippet?: string; category?: string }[],
): { claimedStatus: string; claimedType: string } | null {
  const texts = [
    aiAnalysis ?? "",
    ...evidenceSources.map((s) => `${s.title ?? ""} ${s.snippet ?? ""}`),
  ].join("\n");
  if (!texts.trim()) return null;

  // Count matches for each category
  let spouseHits = 0;
  let goldStarHits = 0;
  let familyHits = 0;
  let personalServiceHits = 0;

  for (const pat of SPOUSE_PATTERNS) {
    const m = texts.match(new RegExp(pat.source, "gi"));
    if (m) spouseHits += m.length;
  }
  for (const pat of GOLD_STAR_PATTERNS) {
    const m = texts.match(new RegExp(pat.source, "gi"));
    if (m) goldStarHits += m.length;
  }
  for (const pat of FAMILY_PATTERNS) {
    const m = texts.match(new RegExp(pat.source, "gi"));
    if (m) familyHits += m.length;
  }
  for (const pat of PERSONAL_SERVICE_PATTERNS) {
    const m = texts.match(new RegExp(pat.source, "gi"));
    if (m) personalServiceHits += m.length;
  }

  // Gold Star takes highest priority (subset of spouse/family but more specific)
  if (goldStarHits > 0 && goldStarHits >= personalServiceHits) {
    return { claimedStatus: "gold_star", claimedType: "Gold Star Family" };
  }
  // Spouse language found and outweighs personal service language
  if (spouseHits > 0 && spouseHits > personalServiceHits) {
    return { claimedStatus: "military_spouse", claimedType: "Military Spouse" };
  }
  // Family language found and outweighs personal service language
  if (familyHits > 0 && familyHits > personalServiceHits) {
    return { claimedStatus: "military_family", claimedType: "Military Family" };
  }
  // No spouse/family detected — don't override
  return null;
}

// --- Dossier Narrative (Deep Analysis) ---
export async function generateDossierNarrative(params: {
  personName: string;
  claimedBranch: string;
  claimedType: string;
  firecrawlContent: string;
  serpSnippets: string;
  aiAnalysis: string;
}): Promise<string> {
  const prompt = `You are a military intelligence analyst. Return a professional dossier in clean markdown format. Use EXACTLY this structure:

# [Full Name]
[One-line headline describing their military identity and mission]

## Executive Summary
[2-3 sentence paragraph]

## Key Facts
- **Branch:** [value]
- **Rank:** [value or 'Not publicly available']
- **Service:** [value or 'Not publicly available']
- **Status:** [Active Duty / Veteran / Military Spouse / etc.]
- **Hometown:** [value or 'Not publicly available']
- **Known for:** [value]
- **Current roles:** [value]
- **Notable recognition:** [value or omit if none]

## Career Highlights
- [highlight 1]
- [highlight 2]
- [highlight 3]

## Organizations & Affiliations
- [org 1]
- [org 2]

## Quotes
> [direct quote if found, otherwise omit this section entirely]

*Note: [1-2 sentence disclaimer about sources and any caveats about their military affiliation.]*

Use real markdown syntax. Do not use plain text headers. Do not add extra commentary outside this structure.

INPUT DATA:
Person: ${params.personName}
Claimed Branch: ${params.claimedBranch}
Claimed Type: ${params.claimedType}

Web Sources:
${params.serpSnippets.slice(0, 3000)}

Deep Content:
${params.firecrawlContent.slice(0, 8000)}

AI Analysis:
${params.aiAnalysis.slice(0, 2000)}`;

  try {
    const { json: data } = await fetchAnthropicWithRetry({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = ((data as any).content?.[0]?.text ?? "").trim();

    const DOSSIER_HEADERS = [
      "Executive Summary",
      "Key Facts",
      "Career Highlights",
      "Organizations & Affiliations",
      "Organizations and Affiliations",
      "Quotes",
      "Notable Achievements",
      "Post-Service Career",
    ];

    const formatted = raw
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith("#")) return line;
        const matchedHeader = DOSSIER_HEADERS.find(
          (h) => trimmed.toLowerCase() === h.toLowerCase()
        );
        if (matchedHeader) {
          return `\n## ${matchedHeader}\n`;
        }
        return line;
      })
      .join("\n");

    return formatted;
  } catch (e) {
    console.error("[Verification] Dossier generation error:", e);
    return "";
  }
}

// --- Career Timeline Extraction ---
export interface CareerEntry {
  org: string;
  title: string;
  dates: string;
  location: string;
  is_military: boolean;
  rank?: string;
  mos?: string;
  units?: string[];
  deployments?: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  dates: string;
  is_military?: boolean;
}

export interface AwardEntry {
  name: string;
  context: string;
}

export interface PostServiceEntry {
  role: string;
  org?: string;
  dates?: string;
}

export interface MilitaryServiceSummary {
  branch: string;
  service_dates: string;
  rank: string;
  mos: string;
  units: string[];
  deployments: string[];
  transition_year: string;
}

export interface EnhancedCareerResult {
  career: CareerEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  military_summary: MilitaryServiceSummary;
  post_service: PostServiceEntry[];
}

// Helper: parse a Claude career-extraction JSON response into EnhancedCareerResult
function parseCareerJson(text: string): EnhancedCareerResult {
  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr);
  const ms = parsed.military_summary ?? {};
  return {
    military_summary: {
      branch: String(ms.branch ?? ""),
      service_dates: String(ms.service_dates ?? ""),
      rank: String(ms.rank ?? ""),
      mos: String(ms.mos ?? ""),
      units: Array.isArray(ms.units) ? ms.units.map(String) : [],
      deployments: Array.isArray(ms.deployments) ? ms.deployments.map(String) : [],
      transition_year: String(ms.transition_year ?? ""),
    },
    career: (parsed.career ?? []).map((c: Record<string, unknown>) => ({
      org: String(c.org ?? ""),
      title: String(c.title ?? ""),
      dates: String(c.dates ?? ""),
      location: String(c.location ?? ""),
      is_military: !!c.is_military,
      rank: c.rank ? String(c.rank) : undefined,
      mos: c.mos ? String(c.mos) : undefined,
      units: Array.isArray(c.units) ? c.units.map(String) : undefined,
      deployments: Array.isArray(c.deployments) ? c.deployments.map(String) : undefined,
    })),
    education: (parsed.education ?? []).map((e: Record<string, unknown>) => ({
      school: String(e.school ?? ""),
      degree: String(e.degree ?? ""),
      dates: String(e.dates ?? ""),
      is_military: !!e.is_military,
    })),
    awards: (parsed.awards ?? []).map((a: Record<string, unknown>) => ({
      name: String(a.name ?? ""),
      context: String(a.context ?? ""),
    })),
    post_service: (parsed.post_service ?? []).map((p: Record<string, unknown>) => ({
      role: String(p.role ?? ""),
      org: p.org ? String(p.org) : undefined,
      dates: p.dates ? String(p.dates) : undefined,
    })),
  };
}

// Helper: call Anthropic with aggressive retry logic (4 attempts: immediate, 5s, 15s, 30s)
const ANTHROPIC_RETRY_DELAYS = [0, 5000, 15000, 30000]; // ms before each attempt
async function fetchAnthropicWithRetry(body: Record<string, unknown>, maxAttempts = 4): Promise<{ ok: boolean; status: number; json: unknown }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: anthropicHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        return { ok: true, status: res.status, json };
      }
      // Retry on 429 (rate limit) and 529 (overloaded)
      if ((res.status === 429 || res.status === 529) && attempt < maxAttempts) {
        const delay = ANTHROPIC_RETRY_DELAYS[attempt] ?? 30000;
        console.warn(`[Anthropic] ${res.status} on attempt ${attempt}/${maxAttempts}, retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(`Anthropic ${res.status}`);
    } catch (err) {
      if (attempt >= maxAttempts) throw err;
      const delay = ANTHROPIC_RETRY_DELAYS[attempt] ?? 30000;
      console.warn(`[Anthropic] Error on attempt ${attempt}/${maxAttempts}:`, err, `retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Anthropic: max retries exceeded");
}

const CAREER_EXTRACTION_PROMPT = `Extract comprehensive military and civilian career data from ALL provided sources. Be thorough — look for rank, MOS/Rate/AFSC, units, deployments, awards, military schools, and post-service career.

Return ONLY a JSON object with this exact structure:
{
  "military_summary": {
    "branch": "US Army",
    "service_dates": "2010 - 2022",
    "rank": "Staff Sergeant (E-6)",
    "mos": "11B Infantry",
    "units": ["101st Airborne Division", "3rd Infantry Division"],
    "deployments": ["Afghanistan (2012-2013)", "Iraq (2015)"],
    "transition_year": "2022"
  },
  "career": [
    { "org": "Organization Name", "title": "Job Title", "dates": "2010 - 2015", "location": "City, ST", "is_military": true, "rank": "SSG", "mos": "11B", "units": ["101st Airborne"], "deployments": ["Afghanistan 2012-2013"] }
  ],
  "education": [
    { "school": "School Name", "degree": "Degree or Course", "dates": "2005 - 2009", "is_military": false }
  ],
  "awards": [
    { "name": "Purple Heart", "context": "Awarded for wounds received in combat" }
  ],
  "post_service": [
    { "role": "Content Creator", "org": "YouTube", "dates": "2022 - Present" }
  ]
}

Rules:
- Order career entries from most recent to oldest
- Set is_military=true for military, DoD, VA, National Guard, Reserves, or defense roles
- For military career entries, include rank, mos (MOS/Rate/AFSC), units, and deployments if mentioned
- For education, set is_military=true for military schools (Basic Training, AIT, ALC, SLC, Ranger School, War College, BOLC, OCS, etc.)
- Include ALL military awards and decorations (Purple Heart, CIB, Bronze Star, CAB, ARCOM, AAM, etc.)
- post_service = civilian career AFTER military service (content creator, speaker, author, consultant, etc.)
- If a specific data point is not mentioned in any source, use "" for strings and [] for arrays — do NOT guess
- military_summary aggregates the best data across all sources
- Return ONLY the JSON object, no markdown formatting, no explanation`;

export async function extractCareerTimeline(params: {
  personName: string;
  firecrawlContent: string;
  serpSnippets: string;
  claimedBranch?: string;
  notesField?: string;
  pdlSummary?: string;
}): Promise<EnhancedCareerResult> {
  const prompt = `${CAREER_EXTRACTION_PROMPT}

Person: ${params.personName}${params.claimedBranch ? ` (claimed branch: ${params.claimedBranch})` : ""}

WEB CONTENT:
${params.firecrawlContent.slice(0, 8000)}

SEARCH SNIPPETS:
${params.serpSnippets.slice(0, 3000)}${params.notesField ? `\n\nADDITIONAL NOTES/BIO:\n${params.notesField.slice(0, 2000)}` : ""}${params.pdlSummary ? `\n\nPDL PROFILE DATA:\n${params.pdlSummary.slice(0, 2000)}` : ""}`;

  try {
    const { json: data } = await fetchAnthropicWithRetry({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = ((data as any).content?.[0]?.text ?? "").trim();
    return parseCareerJson(text);
  } catch (e) {
    console.error("[Verification] Career extraction error:", e);
    return {
      career: [],
      education: [],
      awards: [],
      military_summary: { branch: "", service_dates: "", rank: "", mos: "", units: [], deployments: [], transition_year: "" },
      post_service: [],
    };
  }
}

/**
 * Fallback: Extract career data from an existing ai_analysis text.
 * Used when the dedicated career extraction failed (529, timeout, etc.)
 * but the main AI analysis completed successfully and contains career info.
 */
export async function extractCareerFromAIAnalysis(params: {
  personName: string;
  aiAnalysis: string;
  claimedBranch?: string;
}): Promise<EnhancedCareerResult> {
  const prompt = `${CAREER_EXTRACTION_PROMPT}

Person: ${params.personName}${params.claimedBranch ? ` (claimed branch: ${params.claimedBranch})` : ""}

The following is a verification analysis that was already completed. Extract ALL career information from it — military service details, post-service career, education, and awards. Do NOT say "not identified" if the text contains the information.

VERIFICATION ANALYSIS:
${params.aiAnalysis.slice(0, 6000)}`;

  const { json: data } = await fetchAnthropicWithRetry({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = ((data as any).content?.[0]?.text ?? "").trim();
  return parseCareerJson(text);
}
