export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const username = req.query.username;
    const platform = req.query.platform || 'instagram';

    if (!username) {
      return res.status(400).json({ error: 'Missing username' });
    }

    const cleanUsername = username.replace('@', '').trim();
    const apiKey =
      req.headers.authorization?.replace('Bearer ', '') ||
      process.env.INFLUENCERS_CLUB_API_KEY ||
      process.env.VITE_INFLUENCERS_CLUB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Use the same base URL that the working /api/influencers proxy uses
    const response = await fetch('https://api-dashboard.influencers.club/public/v1/discovery/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        platform: platform,
        paging: { limit: 25, page: 1 },
        sort: { sort_by: 'relevancy', sort_order: 'desc' },
        filters: { lookalike_handle: cleanUsername },
      }),
    });

    const text = await response.text();
    console.log('Lookalike API status:', response.status);

    // Fall back to ai_search if lookalike filter not supported
    if (!response.ok) {
      console.log('Lookalike filter failed, falling back to ai_search');
      const fallback = await fetch('https://api-dashboard.influencers.club/public/v1/discovery/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          platform: platform,
          paging: { limit: 25, page: 1 },
          sort: { sort_by: 'relevancy', sort_order: 'desc' },
          filters: { ai_search: cleanUsername, keywords_in_bio: [''] },
        }),
      });
      const fbText = await fallback.text();
      return res.status(fallback.status).setHeader('Content-Type', 'application/json').send(fbText);
    }

    return res.status(response.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (error) {
    console.error('Lookalike error:', error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
}
