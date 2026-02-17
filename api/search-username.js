export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const username = req.query.username;
    const platform = req.query.platform || 'instagram';
    const searchType = req.query.search_type || 'lookalike';

    if (!username) {
      return res.status(400).json({ error: 'Missing username' });
    }

    const cleanUsername = username.replace('@', '').trim();
    const apiKey = process.env.INFLUENCERS_CLUB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('Searching:', cleanUsername, platform, searchType);

    const response = await fetch('https://api.influencers.club/public/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        platform: platform,
        search_type: searchType,
        search_value: cleanUsername
      })
    });

    const text = await response.text();
    console.log('API response status:', response.status);
    console.log('API response body:', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON from API', body: text.substring(0, 200) });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Search error:', error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
}
