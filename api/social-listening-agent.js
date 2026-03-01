import { createClient } from "@supabase/supabase-js";

/**
 * Social Listening AI Agent — multi-turn chat about brand mentions.
 * Fetches monitor context + recent mentions from Supabase, then calls Claude
 * with full context. Returns response + optional UI action (filter/compare).
 *
 * POST /api/social-listening-agent
 * Body: { prompt: string, monitor_id: string, history?: {role,content}[] }
 */
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const anthropicKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }
  if (!anthropicKey) {
    return res.status(500).json({ error: "Anthropic API key not configured" });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const { prompt, monitor_id, history = [] } = req.body || {};

  if (!prompt || !monitor_id) {
    return res.status(400).json({ error: "prompt and monitor_id are required" });
  }

  try {
    // 1. Fetch active monitor
    const { data: monitor } = await sb
      .from("brand_monitors")
      .select("*")
      .eq("id", monitor_id)
      .single();

    if (!monitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    // 2. Fetch last 50 mentions for this monitor
    const { data: mentions } = await sb
      .from("social_mentions")
      .select("*")
      .eq("monitor_id", monitor_id)
      .order("detected_at", { ascending: false })
      .limit(50);

    const allMentions = mentions || [];

    // 3. Fetch all monitors (for cross-brand awareness)
    const { data: allMonitors } = await sb
      .from("brand_monitors")
      .select("id, brand_name, keywords, hashtags, is_active")
      .order("created_at", { ascending: true });

    // 4. Compute aggregate stats server-side
    const stats = computeStats(allMentions);

    // 5. Detect action intent from prompt
    const action = detectAction(prompt);

    // 6. Build system prompt
    const systemPrompt = buildSystemPrompt(monitor, allMentions, allMonitors || [], stats);

    // 7. Build messages array (multi-turn)
    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ];

    // 8. Call Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error("[agent] Claude API error:", claudeRes.status, errBody);
      return res.status(500).json({ error: "Claude API error", status: claudeRes.status });
    }

    const claudeData = await claudeRes.json();
    const response = (claudeData.content?.[0]?.text ?? "").trim();

    return res.status(200).json({ response, action });
  } catch (err) {
    console.error("[social-listening-agent] Exception:", err.message);
    return res.status(500).json({ error: "Agent failed", message: err.message });
  }
}

/* ── Compute aggregate stats ── */
function computeStats(mentions) {
  const total = mentions.length;
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  const platformBreakdown = {};
  const creatorMap = {};
  let totalReach = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalViews = 0;
  let sponsoredCount = 0;

  for (const m of mentions) {
    sentimentBreakdown[m.sentiment] = (sentimentBreakdown[m.sentiment] || 0) + 1;
    platformBreakdown[m.platform] = (platformBreakdown[m.platform] || 0) + 1;
    totalReach += m.estimated_reach || 0;
    totalLikes += m.engagement_likes || 0;
    totalComments += m.engagement_comments || 0;
    totalShares += m.engagement_shares || 0;
    totalViews += m.engagement_views || 0;
    if (m.is_sponsored) sponsoredCount++;

    const handle = m.creator_handle;
    if (!creatorMap[handle]) {
      creatorMap[handle] = { count: 0, followers: m.creator_followers || 0, name: m.creator_name || handle };
    }
    creatorMap[handle].count++;
  }

  const topCreators = Object.entries(creatorMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([handle, data]) => ({ handle, ...data }));

  return {
    total,
    sentimentBreakdown,
    platformBreakdown,
    totalReach,
    totalLikes,
    totalComments,
    totalShares,
    totalViews,
    sponsoredCount,
    topCreators,
  };
}

/* ── Detect action intent from prompt ── */
function detectAction(prompt) {
  const lower = prompt.toLowerCase();

  if (/\b(negative|bad|complaints?|angry|upset)\b/.test(lower)) {
    return { type: "filter_sentiment", value: "negative" };
  }
  if (/\b(positive|good|happy|praise|love)\b/.test(lower)) {
    return { type: "filter_sentiment", value: "positive" };
  }
  if (/\b(neutral)\b/.test(lower)) {
    return { type: "filter_sentiment", value: "neutral" };
  }
  if (/\b(mixed)\b/.test(lower)) {
    return { type: "filter_sentiment", value: "mixed" };
  }
  if (/\b(instagram|ig)\b/.test(lower)) {
    return { type: "filter_platform", value: "instagram" };
  }
  if (/\b(tiktok|tik tok)\b/.test(lower)) {
    return { type: "filter_platform", value: "tiktok" };
  }
  if (/\b(youtube|yt)\b/.test(lower)) {
    return { type: "filter_platform", value: "youtube" };
  }
  if (/\b(twitter|x\.com)\b/.test(lower)) {
    return { type: "filter_platform", value: "twitter" };
  }
  if (/\b(sponsored|#ad|paid|partnership)\b/.test(lower)) {
    return { type: "filter_sponsored", value: true };
  }
  if (/compare.+(vs|with|against|to)\b/.test(lower)) {
    return { type: "compare", value: true };
  }

  return null;
}

/* ── Build system prompt with full context ── */
function buildSystemPrompt(monitor, mentions, allMonitors, stats) {
  const recentMentions = mentions.slice(0, 20).map((m) => ({
    creator: m.creator_handle,
    platform: m.platform,
    sentiment: m.sentiment,
    caption: (m.caption_snippet || "").substring(0, 200),
    likes: m.engagement_likes,
    comments: m.engagement_comments,
    views: m.engagement_views,
    reach: m.estimated_reach,
    sponsored: m.is_sponsored,
    themes: m.themes,
    date: m.detected_at,
  }));

  const otherBrands = allMonitors
    .filter((m) => m.id !== monitor.id)
    .map((m) => m.brand_name);

  return `You are a social media intelligence analyst for the brand "${monitor.brand_name}".
You have access to real-time mention data tracked by a social listening monitor.

## Current Monitor
- Brand: ${monitor.brand_name}
- Tracked Keywords: ${(monitor.keywords || []).join(", ") || "none"}
- Tracked Hashtags: ${(monitor.hashtags || []).join(", ") || "none"}

## Aggregate Stats (last 50 mentions)
- Total Mentions: ${stats.total}
- Sentiment: ${JSON.stringify(stats.sentimentBreakdown)}
- Platforms: ${JSON.stringify(stats.platformBreakdown)}
- Total Reach: ${stats.totalReach.toLocaleString()}
- Total Engagement: ${(stats.totalLikes + stats.totalComments + stats.totalShares).toLocaleString()} (${stats.totalLikes} likes, ${stats.totalComments} comments, ${stats.totalShares} shares)
- Total Views: ${stats.totalViews.toLocaleString()}
- Sponsored Mentions: ${stats.sponsoredCount}/${stats.total}
- Top Creators: ${stats.topCreators.map((c) => `@${c.handle} (${c.count} mentions, ${c.followers.toLocaleString()} followers)`).join(", ")}

## Recent Mentions (newest first)
${JSON.stringify(recentMentions, null, 2)}

## Other Monitored Brands
${otherBrands.length > 0 ? otherBrands.join(", ") : "None"}

## Instructions
- Give concise, actionable insights using markdown formatting
- Use bullet points, bold, and tables when helpful
- Reference specific creators, posts, and numbers from the data
- If asked about trends, analyze temporal patterns in the mention dates
- If asked to compare brands, note you can see mentions for "${monitor.brand_name}" — for other brands, suggest the user create monitors
- Do not make up data — only reference what's in the mentions above
- Keep responses focused and under 500 words unless the user asks for detail`;
}
