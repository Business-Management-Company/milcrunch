export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { keyword, platforms } = req.body || {};

  if (!keyword) {
    return res.status(400).json({ error: "keyword is required" });
  }

  const apiKey = process.env.VITE_SERP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "SERP API key not configured" });
  }

  try {
    // Build site filter from platforms
    const siteMap = {
      instagram: "site:instagram.com",
      tiktok: "site:tiktok.com",
      twitter: "site:twitter.com",
      youtube: "site:youtube.com",
      facebook: "site:facebook.com",
    };

    const selectedPlatforms = platforms && platforms.length > 0
      ? platforms
      : ["instagram", "tiktok", "twitter", "youtube"];

    const siteFilter = selectedPlatforms.map((p) => siteMap[p]).filter(Boolean).join(" OR ");
    const query = `${keyword} ${siteFilter}`;

    const url = `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=20`;

    console.log(`[social-monitor] Searching for: ${query}`);

    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      console.error("[social-monitor] SERP API error:", resp.status, text);
      return res.status(resp.status).json({ error: "SERP API error", details: text });
    }

    const data = await resp.json();
    const organicResults = data.organic_results || [];

    // Parse results into mentions
    const mentions = organicResults.map((result) => {
      const link = result.link || "";
      let platform = "unknown";
      if (link.includes("instagram.com")) platform = "instagram";
      else if (link.includes("tiktok.com")) platform = "tiktok";
      else if (link.includes("twitter.com") || link.includes("x.com")) platform = "twitter";
      else if (link.includes("youtube.com") || link.includes("youtu.be")) platform = "youtube";
      else if (link.includes("facebook.com")) platform = "facebook";

      // Extract author handle from URL or title
      let authorHandle = "";
      if (platform === "instagram") {
        const match = link.match(/instagram\.com\/([^/?]+)/);
        if (match) authorHandle = match[1];
      } else if (platform === "tiktok") {
        const match = link.match(/tiktok\.com\/@([^/?]+)/);
        if (match) authorHandle = match[1];
      } else if (platform === "twitter") {
        const match = link.match(/(?:twitter|x)\.com\/([^/?]+)/);
        if (match) authorHandle = match[1];
      } else if (platform === "youtube") {
        const match = link.match(/youtube\.com\/@([^/?]+)/);
        if (match) authorHandle = match[1];
      }

      return {
        keyword_text: keyword,
        platform,
        post_url: link,
        post_text: result.snippet || result.title || "",
        author_handle: authorHandle || "unknown",
        author_name: result.source || authorHandle || "Unknown",
        posted_at: result.date || null,
      };
    }).filter((m) => m.platform !== "unknown");

    console.log(`[social-monitor] Found ${mentions.length} mentions for "${keyword}"`);

    return res.status(200).json({ mentions, total: mentions.length });
  } catch (err) {
    console.error("[social-monitor] Exception:", err.message);
    return res.status(500).json({ error: "Search failed", message: err.message });
  }
}
