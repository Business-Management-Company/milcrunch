module.exports = async function handler(req, res) {
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
    const apiKey =
      req.headers.authorization?.replace('Bearer ', '') ||
      process.env.INFLUENCERS_CLUB_API_KEY ||
      process.env.VITE_INFLUENCERS_CLUB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('Searching:', cleanUsername, platform, searchType);

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
        filters: searchType === 'lookalike'
          ? { lookalike_handle: cleanUsername }
          : { search_by_handle: cleanUsername },
      }),
    });

    const text = await response.text();
    console.log('API response status:', response.status);
    console.log('API response body:', text.substring(0, 500));

    // If handle-specific filter not supported, fall back to ai_search
    if (!response.ok) {
      console.log('Handle filter failed, falling back to ai_search');
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
      console.log('Fallback status:', fallback.status);
      return res.status(fallback.status).setHeader('Content-Type', 'application/json').send(fbText);
    }

    return res.status(response.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (error) {
    console.error('Search error:', error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
}
