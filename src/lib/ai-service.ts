/**
 * MilCrunch AI Service — frontend wrapper
 *
 * Calls the /api/anthropic proxy which handles multi-LLM fallback
 * (Claude → OpenAI → Gemini) server-side.
 *
 * Reads the `x-ai-provider` response header to track which provider
 * actually served the request.
 *
 * Required Vercel Environment Variables (server-side, set in Vercel dashboard):
 *   ANTHROPIC_API_KEY   — Claude (primary)
 *   OPENAI_API_KEY      — GPT-4o-mini (first fallback)
 *   GEMINI_API_KEY      — Gemini 1.5 Flash (second fallback)
 */

export type AIProvider = "claude" | "openai" | "gemini" | "none";

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: "Claude",
  openai: "GPT-4o",
  gemini: "Gemini",
  none: "Unavailable",
};

let lastProvider: AIProvider = "claude";

/**
 * Call the MilCrunch AI backend with automatic multi-provider fallback.
 *
 * @param prompt     — The user's message / prompt text
 * @param systemPrompt — System instructions for the AI
 * @param options.maxTokens — Max response tokens (default 1000)
 * @param options.messages  — Full conversation history (overrides prompt if provided)
 * @returns The AI's text response
 */
export async function callAI(
  prompt: string,
  systemPrompt: string,
  options?: {
    maxTokens?: number;
    messages?: { role: string; content: string }[];
  }
): Promise<{ text: string; provider: AIProvider }> {
  const messages = options?.messages ?? [{ role: "user", content: prompt }];

  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: options?.maxTokens ?? 1000,
      system: systemPrompt,
      messages,
    }),
  });

  const provider = (res.headers.get("x-ai-provider") as AIProvider) || "claude";
  lastProvider = provider;

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      err.error || `AI request failed (${res.status})`
    );
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  if (!text && data._allFailed) {
    throw new Error(
      "AI assistant is temporarily unavailable. Please try again in a moment."
    );
  }

  return { text, provider };
}

/**
 * Returns which provider successfully responded last.
 */
export function getActiveProvider(): AIProvider {
  return lastProvider;
}
