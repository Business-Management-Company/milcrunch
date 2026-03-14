/**
 * MilCrunch AI Service — frontend wrapper
 *
 * Calls the /api/anthropic proxy which handles multi-LLM fallback
 * (Claude → OpenAI → Gemini) server-side.
 *
 * Reads the `X-AI-Provider` response header to track which provider
 * actually served the request.
 */

let lastProvider = "Claude";

/**
 * Call the MilCrunch AI backend with automatic multi-provider fallback.
 */
export async function callAI(
  prompt: string,
  systemPrompt: string,
  options?: {
    maxTokens?: number;
    messages?: { role: string; content: string }[];
  }
): Promise<{ text: string; provider: string }> {
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

  // Read header BEFORE calling .json()
  const provider = res.headers.get("X-AI-Provider") || "Claude";
  lastProvider = provider;

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `AI request failed (${res.status})`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  if (!text) {
    throw new Error("AI assistant is temporarily unavailable. Please try again in a moment.");
  }

  return { text, provider };
}

/**
 * Returns which provider successfully responded last.
 */
export function getActiveProvider(): string {
  return lastProvider;
}
