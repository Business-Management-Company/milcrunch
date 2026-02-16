export default async function handler(req, res) {
  const apiKey = req.headers.authorization?.replace("Bearer ", "") || process.env.VITE_INFLUENCERS_CLUB_API_KEY;
  if (!apiKey) return res.status(401).json({ error: "No API key" });
  try {
    const upstream = await fetch("https://api-dashboard.influencers.club/public/v1/accounts/credits", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
