export default async function handler(req, res) {
  const { username, platform = "instagram" } = req.query;
  if (!username) return res.status(400).json({ error: "Missing username" });

  const apiKey =
    req.headers.authorization?.replace("Bearer ", "") ||
    process.env.VITE_INFLUENCERS_CLUB_API_KEY;
  if (!apiKey) return res.status(401).json({ error: "No API key" });

  try {
    const response = await fetch(
      "https://api-dashboard.influencers.club/public/v1/search/lookalike",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          platform: platform,
          username: username,
        }),
      }
    );

    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(response.status).json(data);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Lookalike search failed", details: error.message });
  }
}
