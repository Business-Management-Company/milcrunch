/**
 * Multi-LLM Fallback System for MilCrunch
 *
 * Tries Claude -> OpenAI -> Gemini in order. If one provider fails
 * (rate limit, server error, timeout), automatically falls through
 * to the next.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  VERCEL ENV VAR NAMING:                                     │
 * │                                                             │
 * │  VITE_ prefix = client-side only (Vite injects at build)   │
 * │  No prefix    = server-side only (Vercel API functions)     │
 * │                                                             │
 * │  These vars must be set WITHOUT the VITE_ prefix in the    │
 * │  Vercel dashboard under Settings → Environment Variables:   │
 * │                                                             │
 * │    ANTHROPIC_API_KEY  — Claude (primary)                    │
 * │    OPENAI_API_KEY     — GPT-4o-mini (first fallback)        │
 * │    GEMINI_API_KEY     — Gemini 1.5 Flash (second fallback)  │
 * │                                                             │
 * │  If you only have VITE_ prefixed versions, the code below  │
 * │  will also check those as a fallback.                       │
 * └─────────────────────────────────────────────────────────────┘
 */

console.log("[ai-fallback] Module loading...", {
  anthropic: !!process.env.ANTHROPIC_API_KEY,
  vite_anthropic: !!process.env.VITE_ANTHROPIC_API_KEY,
  openai: !!process.env.OPENAI_API_KEY,
  vite_openai: !!process.env.VITE_OPENAI_API_KEY,
  gemini: !!process.env.GEMINI_API_KEY,
  vite_gemini: !!process.env.VITE_GEMINI_API_KEY,
});

const TIMEOUT_MS = 15000;

/**
 * Read an env var, trying non-prefixed first, then VITE_ prefixed.
 * Strips quotes/whitespace that can sneak in from Vercel dashboard.
 */
function readKey(name) {
  const raw = process.env[name] || process.env[`VITE_${name}`] || "";
  return raw.replace(/^["' ]+|["' ]+$/g, "").trim();
}

/**
 * Fetch with a timeout. Rejects if the request takes longer than `ms`.
 */
function fetchWithTimeout(url, options, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

/**
 * Returns true for HTTP status codes that indicate a transient/retryable failure.
 */
function isRetryableStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

/* ─── Provider: Claude ─────────────────────────────────────── */

async function tryClaude(body) {
  const key = readKey("ANTHROPIC_API_KEY");
  console.log(`[ai-fallback] Trying Claude — key: ${key ? key.slice(0, 8) + "..." : "MISSING"} (len=${key.length})`);
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  // Use a known-good model; callers may pass anything
  const safeBody = { ...body, model: body.model || "claude-sonnet-4-5-20250929" };
  console.log("[ai-fallback] Claude request model:", safeBody.model, "max_tokens:", safeBody.max_tokens);

  const resp = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(safeBody),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[ai-fallback] Claude error body:", errText);
    const err = new Error(`Claude ${resp.status}: ${errText.slice(0, 500)}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  return {
    ...data,
    _provider: "claude",
    _service: "Anthropic",
  };
}

/* ─── Provider: OpenAI ─────────────────────────────────────── */

function toOpenAIMessages(body) {
  const messages = [];
  // System prompt
  if (body.system) {
    const text = typeof body.system === "string"
      ? body.system
      : Array.isArray(body.system)
        ? body.system.map((b) => b.text || "").join("\n")
        : "";
    if (text) messages.push({ role: "system", content: text });
  }
  // Conversation messages
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((b) => b.text || "").join("\n")
            : String(msg.content),
      });
    }
  }
  return messages;
}

async function tryOpenAI(body) {
  const key = readKey("OPENAI_API_KEY");
  console.log(`[ai-fallback] Trying OpenAI — key: ${key ? key.slice(0, 8) + "..." : "MISSING"} (len=${key.length})`);
  if (!key) throw new Error("OPENAI_API_KEY not configured — add OPENAI_API_KEY to Vercel env vars (no VITE_ prefix)");

  const openaiMessages = toOpenAIMessages(body);
  console.log("[ai-fallback] OpenAI messages count:", openaiMessages.length, "first role:", openaiMessages[0]?.role);

  const resp = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature ?? 1,
        messages: openaiMessages,
      }),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[ai-fallback] OpenAI error body:", errText);
    const err = new Error(`OpenAI ${resp.status}: ${errText.slice(0, 500)}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return {
    content: [{ type: "text", text }],
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
    model: "gpt-4o-mini",
    _provider: "openai",
    _service: "OpenAI",
  };
}

/* ─── Provider: Gemini ─────────────────────────────────────── */

async function tryGemini(body) {
  const key = readKey("GEMINI_API_KEY");
  console.log(`[ai-fallback] Trying Gemini — key: ${key ? key.slice(0, 8) + "..." : "MISSING"} (len=${key.length})`);
  if (!key) throw new Error("GEMINI_API_KEY not configured — add GEMINI_API_KEY to Vercel env vars (no VITE_ prefix)");

  // Extract system prompt
  const systemText = typeof body.system === "string"
    ? body.system
    : Array.isArray(body.system)
      ? body.system.map((b) => b.text || "").join("\n")
      : "";

  // Extract user prompt from messages
  let userText = "";
  if (Array.isArray(body.messages)) {
    userText = body.messages
      .map((msg) =>
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((b) => b.text || "").join("\n")
            : String(msg.content)
      )
      .join("\n\n");
  }

  // Simplified format: concatenate system + user into one contents entry
  const combinedPrompt = systemText
    ? systemText + "\n\n" + userText
    : userText;

  const payload = {
    contents: [{ parts: [{ text: combinedPrompt }] }],
    generationConfig: {
      maxOutputTokens: body.max_tokens || 1000,
    },
  };

  console.log("[ai-fallback] Gemini prompt length:", combinedPrompt.length);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const resp = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[ai-fallback] Gemini error body:", errText);
    const err = new Error(`Gemini ${resp.status}: ${errText.slice(0, 500)}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return {
    content: [{ type: "text", text }],
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
    model: "gemini-1.5-flash",
    _provider: "gemini",
    _service: "Google",
  };
}

/* ─── Main Fallback Orchestrator ───────────────────────────── */

const providers = [
  { name: "Claude", fn: tryClaude },
  { name: "OpenAI", fn: tryOpenAI },
  { name: "Gemini", fn: tryGemini },
];

/**
 * Call AI with automatic fallback: Claude → OpenAI → Gemini.
 *
 * @param {object} body — Anthropic-format request body
 *   { model, max_tokens, system, messages, temperature? }
 * @returns {object} Normalized response with _provider and _service fields
 */
async function callWithFallback(body) {
  console.log("[ai-fallback] Starting fallback chain. Env var check:", {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    VITE_ANTHROPIC_API_KEY: !!process.env.VITE_ANTHROPIC_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    VITE_OPENAI_API_KEY: !!process.env.VITE_OPENAI_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    VITE_GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY,
  });

  const errors = [];

  for (let i = 0; i < providers.length; i++) {
    const { name, fn } = providers[i];
    try {
      const result = await fn(body);
      if (i > 0) {
        console.log(`[ai-fallback] ${name} succeeded (fallback from ${providers.slice(0, i).map((p) => p.name).join(" -> ")})`);
      } else {
        console.log(`[ai-fallback] ${name} succeeded`);
      }
      return result;
    } catch (err) {
      const status = err.status || "network";
      const reason = err.name === "AbortError" ? "timeout (15s)" : err.message?.slice(0, 150);

      console.warn(`[ai-fallback] ${name} FAILED (${status}): ${reason}`);
      errors.push({ provider: name, status, reason });
    }
  }

  // All providers failed
  console.error("[ai-fallback] ALL PROVIDERS FAILED:", JSON.stringify(errors, null, 2));
  return {
    content: [
      {
        type: "text",
        text: "AI assistant is temporarily unavailable. Please try again in a moment.",
      },
    ],
    usage: { input_tokens: 0, output_tokens: 0 },
    _provider: "none",
    _service: "None",
    _allFailed: true,
    _errors: errors,
  };
}

module.exports = { callWithFallback };
