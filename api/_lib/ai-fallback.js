/**
 * Multi-LLM Fallback System for MilCrunch
 *
 * Tries Claude -> OpenAI -> Gemini in order. If one provider fails
 * (rate limit, server error, timeout), automatically falls through
 * to the next.
 *
 * Required Vercel Environment Variables:
 *   ANTHROPIC_API_KEY   — Claude (primary)
 *   OPENAI_API_KEY      — GPT-4o-mini (first fallback)
 *   GEMINI_API_KEY      — Gemini 1.5 Flash (second fallback)
 */

const TIMEOUT_MS = 15_000;

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
  const raw = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || "";
  const key = raw.replace(/^["' ]+|["' ]+$/g, "").trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  const resp = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    const err = new Error(`Claude ${resp.status}: ${errText.slice(0, 200)}`);
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
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("OPENAI_API_KEY not configured");

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
        messages: toOpenAIMessages(body),
      }),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    const err = new Error(`OpenAI ${resp.status}: ${errText.slice(0, 200)}`);
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

function toGeminiContents(body) {
  const contents = [];
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      const text = typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.map((b) => b.text || "").join("\n")
          : String(msg.content);
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      });
    }
  }
  return contents;
}

async function tryGemini(body) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const systemText = typeof body.system === "string"
    ? body.system
    : Array.isArray(body.system)
      ? body.system.map((b) => b.text || "").join("\n")
      : "";

  const payload = {
    contents: toGeminiContents(body),
    generationConfig: {
      maxOutputTokens: body.max_tokens || 1000,
      temperature: body.temperature ?? 1,
    },
  };
  if (systemText) {
    payload.systemInstruction = { parts: [{ text: systemText }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const resp = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    const err = new Error(`Gemini ${resp.status}: ${errText.slice(0, 200)}`);
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
      const retryable = err.name === "AbortError" || (typeof status === "number" && isRetryableStatus(status));
      const reason = err.name === "AbortError" ? "timeout" : err.message?.slice(0, 100);

      console.warn(`[ai-fallback] ${name} failed (${status}): ${reason}`);
      errors.push({ provider: name, status, reason });

      // If the error is NOT retryable (e.g. 400 bad request, 401 auth),
      // still try next provider — the issue may be provider-specific
    }
  }

  // All providers failed
  console.error("[ai-fallback] All providers failed:", errors);
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
