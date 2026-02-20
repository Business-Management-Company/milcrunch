/**
 * AI-powered intent classifier for the dashboard command bar.
 * Sends user queries to Claude Haiku via /api/anthropic proxy
 * and returns structured intent + extracted filters.
 */

export type IntentType =
  | "FIND_CREATORS"
  | "BUILD_LIST"
  | "MANAGE_EVENT"
  | "RUN_CAMPAIGN"
  | "VERIFY_CREATOR"
  | "UNCLEAR";

export interface CreatorFilters {
  keyword?: string;
  platform?: string;
  branch?: string;
  min_followers?: number;
  max_followers?: number;
  min_engagement?: number;
  category?: string; // "podcasters", "speakers", "authors", etc.
}

export interface ClassificationResult {
  intent: IntentType;
  filters?: CreatorFilters;
  followUp?: string;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an intent classifier for a military creator & event management platform called MilCrunch. Given a user query, classify the intent and extract relevant parameters.

Return ONLY valid JSON with this exact schema (no markdown, no explanation):
{
  "intent": "FIND_CREATORS" | "BUILD_LIST" | "MANAGE_EVENT" | "RUN_CAMPAIGN" | "VERIFY_CREATOR" | "UNCLEAR",
  "filters": { ... },
  "followUp": "string or null",
  "confidence": 0.0-1.0
}

Intent definitions:
- FIND_CREATORS: User wants to find, search, or discover creators, influencers, speakers, podcasters, authors, or military spouses. This is the most common intent.
- BUILD_LIST: User wants to build a list, create an outreach list, or organize creators into groups.
- MANAGE_EVENT: User wants to manage events, create an event, handle registration, or plan a conference.
- RUN_CAMPAIGN: User wants to create or run a social media campaign, schedule posts, or manage content.
- VERIFY_CREATOR: User wants to verify someone's military status, check credentials, or validate a creator.
- UNCLEAR: The query is too vague, off-topic, or needs more context to classify.

For FIND_CREATORS, extract filters into the "filters" object:
- keyword: The search terms (e.g. "veteran fitness", "mil spouse lifestyle")
- platform: One of "instagram", "tiktok", "youtube", "x" (formerly twitter), "linkedin" — only if explicitly mentioned
- branch: Military branch if mentioned — one of "Army", "Navy", "Air Force", "Marines", "Coast Guard"
- min_followers: Minimum follower count if mentioned (parse "50k" as 50000, "1M" as 1000000)
- max_followers: Maximum follower count if mentioned
- min_engagement: Minimum engagement rate if mentioned (as a number, e.g. 3 for 3%)
- category: Creator type if mentioned — one of "podcasters", "speakers", "authors", "brand-ambassadors", "content-creators"

For followUp: Set this ONLY when the query clearly needs one specific piece of information to act on. For example:
- "find speakers for my event" → followUp: "Which event are you planning for?"
- "build a list" → followUp: "What type of creators should be in the list?"
Do NOT set followUp for queries that can be acted on directly, even if vague. Prefer action over asking.

Omit null/undefined fields from filters. If no filters apply, omit the filters object entirely.`;

export async function classifyIntent(query: string): Promise<ClassificationResult> {
  try {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: query }],
      }),
    });

    if (!res.ok) {
      console.error("Intent classification failed:", res.status);
      return { intent: "UNCLEAR", confidence: 0 };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      return { intent: "UNCLEAR", confidence: 0 };
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    return {
      intent: parsed.intent ?? "UNCLEAR",
      filters: parsed.filters ?? undefined,
      followUp: parsed.followUp ?? undefined,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch (err) {
    console.error("Intent classification error:", err);
    return { intent: "UNCLEAR", confidence: 0 };
  }
}
