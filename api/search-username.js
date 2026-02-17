export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { username, platform = 'instagram', search_type = 'lookalike' } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  const apiKey =
    req.headers.authorization?.replace('Bearer ', '') ||
    process.env.VITE_INFLUENCERS_CLUB_API_KEY;
  if (!apiKey) return res.status(401).json({ error: 'No API key' });

  try {
    const cleanUsername = username.replace('@', '').trim();
    const response = await fetch('https://api-dashboard.influencers.club/public/v1/search/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        platform: platform,
        search_type: search_type,
        search_value: cleanUsername
      })
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Search failed', details: error.message });
  }
}
