export default async function handler(req, res) {
  const key = process.env.YELP_API_KEY || process.env.VITE_YELP_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "YELP_API_KEY not configured" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { term, location, categories, limit, offset, sort_by } = req.body || {};
  if (!location) {
    return res.status(400).json({ error: "Missing 'location' in request body" });
  }

  const params = new URLSearchParams();
  params.set("location", location);
  params.set("limit", String(limit || 20));
  if (term) params.set("term", term);
  if (categories) params.set("categories", categories);
  if (offset) params.set("offset", String(offset));
  if (sort_by) params.set("sort_by", sort_by);

  try {
    const resp = await fetch(
      `https://api.yelp.com/v3/businesses/search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
      }
    );
    const data = await resp.text();
    res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
  } catch (e) {
    res.status(502).json({ error: "Yelp API proxy error", message: e.message });
  }
}
