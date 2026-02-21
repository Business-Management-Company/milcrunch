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
    if (!res.ok) {
      const text = await res.text();
      console.warn("[Verification] PDL response:", res.status, text.slice(0, 200));
      throw new Error(`PDL ${res.status}`);
    }
    const json = await res.json();
    console.log("[Verification] PDL data keys:", Object.keys(json.data ?? json));
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
// GENEROUS scoring: starts at 50 baseline. Absence of evidence is NOT evidence of fraud.
// Only deduct for actual negative evidence (stolen valor, criminal record, factual impossibility).
export function computeVerificationScore(
  pdlScore: number,
  evidenceSources: EvidenceSource[],
  contentSignals: { hasUnitOrMOS: boolean; hasDates: boolean; hasAwards: boolean }
): number {
  const baseline = 50;

  // Web corroboration: +5 per military-related source, max +25
  const corroborating = evidenceSources.filter((s) => s.category === "Military Service" && !s.isRedFlag);
  const webScore = Math.min(25, corroborating.length * 5);

  // Content signals: +5 each, max +15
  let contentScore = 0;
  if (contentSignals.hasUnitOrMOS) contentScore += 5;
  if (contentSignals.hasDates) contentScore += 5;
  if (contentSignals.hasAwards) contentScore += 5;

  // Red flag deductions — only for actual negative evidence
  let deductions = 0;
  for (const s of evidenceSources.filter((s) => s.isRedFlag)) {
    const text = `${s.title} ${s.snippet}`.toLowerCase();
    if (/stolen valor/.test(text)) deductions += 40;
    else if (/criminal|fraud|convicted|indicted|scam/.test(text)) deductions += 30;
    else if (/fake|fabricat|impost/.test(text)) deductions += 20;
    else deductions += 10;
  }

  return Math.min(100, Math.max(0, baseline + pdlScore + webScore + contentScore - deductions));
}

export function recommendStatus(score: number, hasCriminalFlags: boolean): "verified" | "pending" | "flagged" | "denied" {
  // Only flag if there's actual negative evidence AND score is low
  if (hasCriminalFlags && score < 40) return "flagged";
  if (score >= 70) return "verified";
  if (score >= 40) return "pending";
  return "flagged";
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

Provide:
1. VERIFICATION CONFIDENCE: A score from 50-100% with reasoning. Start at 50% (benefit of the doubt) and only go UP with supporting evidence, or DOWN if there is concrete negative evidence.
2. EVIDENCE SUMMARY: Key findings. Highlight anything that SUPPORTS the claim. Only mention contradictions if they are factual and specific.
3. RED FLAGS: ONLY list these if there is actual negative evidence (criminal records, stolen valor reports, factual impossibilities). Do NOT list "no evidence found" as a red flag.
4. RECOMMENDED STATUS: Verified (supporting evidence found), Pending (no evidence either way — this is the DEFAULT), Flagged (concrete negative evidence found).
5. SUGGESTED FOLLOW-UP: What additional steps could confirm the claim — e.g., DD-214 upload, reference check, direct outreach.

Remember: Most veterans are telling the truth. Give them the benefit of the doubt.`;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: anthropicHeaders(),
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
}> {
  const prompt = `You are filtering criminal/background search results for a specific person. The subject is: ${params.personName}, claimed military branch: ${params.claimedBranch}, location context: ${params.locationContext || "unknown"}.

Here are the search results to analyze:
${JSON.stringify(params.results, null, 2)}

For each search result, determine:
- RELEVANCE: Is this result likely about the SAME person, or a different person with a similar name? Consider location, age, context clues.
- CONCERN_LEVEL: none, low, medium, high
- REASONING: Brief explanation

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

Be CONSERVATIVE with flagging — if you can't confirm it's the same person, mark relevance as low.
Return ONLY the JSON object, no markdown formatting.`;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: anthropicHeaders(),
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").trim();
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
    return {
      filtered: params.results.map((r) => ({
        ...r,
        relevance_score: 50,
        concern_level: "low" as const,
        reasoning: "AI filtering failed",
      })),
      summary: "AI filtering failed — showing unfiltered results.",
    };
  }
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
    claimedType: input.claimedType,
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

// --- Dossier Narrative (Deep Analysis) ---
export async function generateDossierNarrative(params: {
  personName: string;
  claimedBranch: string;
  claimedType: string;
  firecrawlContent: string;
  serpSnippets: string;
  aiAnalysis: string;
}): Promise<string> {
  const prompt = `Format your response using proper markdown: use ## for section headings, ** for bold labels, and - for bullet points. Do not use plain bullet characters (•) or plain text headings without markdown syntax.

Summarize this person's background based on the following web content. Write a clean, professional 3-5 paragraph narrative dossier about ${params.personName} (claimed ${params.claimedType}, ${params.claimedBranch}).

Include:
- Military service background (branch, rank, dates, units if available)
- Key career highlights and current role
- Notable achievements, awards, or community involvement
- Any relevant public information

Use bullet points for key facts where appropriate. Be factual — only include information supported by the sources below. If information is limited, say so briefly.

WEB CONTENT:
${params.firecrawlContent.slice(0, 8000)}

SEARCH SNIPPETS:
${params.serpSnippets.slice(0, 3000)}

AI ANALYSIS:
${params.aiAnalysis.slice(0, 2000)}`;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: anthropicHeaders(),
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    return (data.content?.[0]?.text ?? "").trim();
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

export async function extractCareerTimeline(params: {
  personName: string;
  firecrawlContent: string;
  serpSnippets: string;
  claimedBranch?: string;
  notesField?: string;
  pdlSummary?: string;
}): Promise<EnhancedCareerResult> {
  const prompt = `Extract comprehensive military and civilian career data for ${params.personName}${params.claimedBranch ? ` (claimed branch: ${params.claimedBranch})` : ""} from ALL provided sources. Be thorough — look for rank, MOS/Rate/AFSC, units, deployments, awards, military schools, and post-service career.

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
- Return ONLY the JSON object, no markdown formatting, no explanation

WEB CONTENT:
${params.firecrawlContent.slice(0, 8000)}

SEARCH SNIPPETS:
${params.serpSnippets.slice(0, 3000)}${params.notesField ? `\n\nADDITIONAL NOTES/BIO:\n${params.notesField.slice(0, 2000)}` : ""}${params.pdlSummary ? `\n\nPDL PROFILE DATA:\n${params.pdlSummary.slice(0, 2000)}` : ""}`;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: anthropicHeaders(),
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").trim();
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
