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

function getKey(envKey: string): string {
  const v = import.meta.env[envKey];
  return typeof v === "string" ? v.trim() : "";
}

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

const PDL_BASE = "https://api.peopledatalabs.com/v5/person/enrich";

export async function enrichPersonPDL(params: PDLEnrichParams): Promise<PDLResponse | null> {
  const key = getKey("VITE_PDL_API_KEY");
  if (!key) {
    console.warn("[Verification] VITE_PDL_API_KEY not set");
    return null;
  }
  const searchParams = new URLSearchParams();
  if (params.name) searchParams.set("name", params.name);
  if (params.profile?.length) searchParams.set("profile", params.profile.join(","));
  if (params.location) searchParams.set("location", params.location);
  try {
    const res = await fetch(`${PDL_BASE}?${searchParams.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
    });
    if (!res.ok) throw new Error(`PDL ${res.status}`);
    const json = await res.json();
    return (json.data ?? json) as PDLResponse;
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
    if (employer === 0 && MILITARY_EMPLOYERS.some((e) => org.includes(e.toLowerCase()))) employer = 15;
    if (title === 0 && MILITARY_TITLES.some((t) => jobTitle.includes(t.toLowerCase()))) title = 10;
  }
  for (const edu of educationList) {
    const school = safeString(edu?.school);
    const degree = safeString(edu?.degree);
    if (education === 0 && MILITARY_ACADEMIES.some((a) => school.includes(a.toLowerCase()))) education = 5;
  }
  return Math.min(30, employer + title + education);
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
  const key = getKey("VITE_SERP_API_KEY");
  if (!key) {
    console.warn("[Verification] VITE_SERP_API_KEY not set");
    return [];
  }
  const serpUrl = `https://serpapi.com/search.json?api_key=${key}&engine=google&q=${encodeURIComponent(query)}&num=10`;
  try {
    const res = await fetch(serpUrl, {
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
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape";

export async function scrapeFirecrawl(url: string): Promise<{ markdown?: string } | null> {
  const key = getKey("VITE_FIRECRAWL_API_KEY");
  if (!key) {
    console.warn("[Verification] VITE_FIRECRAWL_API_KEY not set");
    return null;
  }
  try {
    const res = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
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
export function computeVerificationScore(
  pdlScore: number,
  evidenceSources: EvidenceSource[],
  contentSignals: { hasUnitOrMOS: boolean; hasDates: boolean; hasAwards: boolean }
): number {
  let webScore = 0;
  let deductions = 0;
  const corroborating = evidenceSources.filter((s) => s.category === "Military Service" && !s.isRedFlag);
  webScore += Math.min(5, corroborating.length) * 8;
  evidenceSources.filter((s) => s.isRedFlag).forEach(() => (deductions += 10));
  webScore = Math.max(0, Math.min(40, webScore - deductions));
  let contentScore = 0;
  if (contentSignals.hasUnitOrMOS) contentScore += 15;
  if (contentSignals.hasDates) contentScore += 10;
  if (contentSignals.hasAwards) contentScore += 5;
  contentScore = Math.min(30, contentScore);
  return Math.min(100, Math.max(0, pdlScore + webScore + contentScore));
}

export function recommendStatus(score: number, hasCriminalFlags: boolean): "verified" | "pending" | "flagged" | "denied" {
  if (hasCriminalFlags || score < 20) return "flagged";
  if (score >= 80) return "verified";
  if (score >= 50) return "pending";
  return "flagged";
}

// --- AI Analysis (Claude) ---
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
function getAnthropicKey(): string {
  const k = import.meta.env.VITE_ANTHROPIC_API_KEY;
  return typeof k === "string" ? k.trim() : "";
}

export async function runVerificationAnalysis(params: {
  personName: string;
  claimedStatus: string;
  claimedBranch: string;
  claimedRank: string;
  pdlData: unknown;
  serpResults: unknown;
  firecrawlExtractions: unknown;
}): Promise<string> {
  const key = getAnthropicKey();
  if (!key) return "AI analysis skipped (no API key).";
  const systemPrompt = `You are a military service verification analyst for ParadeDeck. Analyze the following evidence about ${params.personName} who claims to be a ${params.claimedStatus} from the ${params.claimedBranch} with rank ${params.claimedRank}.

Evidence sources:
1. People Data Labs professional data: ${JSON.stringify(params.pdlData, null, 2)}
2. Web search results: ${JSON.stringify(params.serpResults, null, 2)}
3. Scraped page content: ${JSON.stringify(params.firecrawlExtractions, null, 2)}

Provide:
1. VERIFICATION CONFIDENCE: A score from 0-100% with reasoning
2. EVIDENCE SUMMARY: Key findings supporting or contradicting the claim
3. RED FLAGS: Any concerning findings (criminal records, inconsistencies, stolen valor indicators)
4. RECOMMENDED STATUS: Verified, Pending (needs more info), Flagged (concerns found), or Denied
5. SUGGESTED FOLLOW-UP: What additional steps could confirm the claim

Be thorough but fair. Not finding evidence doesn't mean the claim is false — many veterans have limited online presence.`;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: "Please perform the verification analysis and provide your assessment." }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const out = (text ?? "").trim();
    return out ? out : "No analysis generated.";
  } catch (e) {
    console.error("[Verification] Claude error:", e);
    return `Analysis failed: ${(e as Error).message}`;
  }
}

// --- Pipeline ---
export interface VerificationInput {
  fullName: string;
  claimedBranch: string;
  claimedRank: string;
  claimedStatus: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  notes?: string;
}

export interface PipelinePhase {
  phase: 1 | 2 | 3 | 4;
  name: string;
  status: "running" | "done" | "error" | "skipped";
  data?: unknown;
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
  onPhase({ phase: 1, name: "People Data Labs", status: "done", data: pdlData });

  // Phase 2: SerpAPI — always mark complete even if no results
  onPhase({ phase: 2, name: "Web Search", status: "running" });
  const queries = [
    `${input.fullName} military veteran`,
    `${input.fullName} ${input.claimedBranch}`,
    input.claimedRank ? `${input.fullName} ${input.claimedRank}` : "",
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
  // ALWAYS continue to Phase 4 regardless of Phase 3 outcome. Pass whatever data we have: PDL + SerpAPI at minimum, FireCrawl if available.
  onPhase({ phase: 3, name: "Deep Extraction", status: "done", data: firecrawlData });

  // Phase 4: AI Analysis — ALWAYS runs regardless of Phase 3 outcome
  onPhase({ phase: 4, name: "AI Analysis", status: "running" });
  const aiAnalysis = await runVerificationAnalysis({
    personName: input.fullName,
    claimedStatus: input.claimedStatus,
    claimedBranch: input.claimedBranch,
    claimedRank: input.claimedRank,
    pdlData,
    serpResults: evidenceSources,
    firecrawlExtractions: firecrawlData,
  });
  onPhase({ phase: 4, name: "AI Analysis", status: "done", data: aiAnalysis });

  const hasCriminalFlags = evidenceSources.some((s) => s.isRedFlag);
  const verificationScore = computeVerificationScore(pdlScore, evidenceSources, contentSignals);
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
  };
}
