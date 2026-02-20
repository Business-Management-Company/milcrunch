export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_PLACES_API_KEY not configured" });
  }

  // ── Photo proxy: GET /api/places?photo=1&ref=XXXX ──────────
  if (req.method === "GET" && req.query.photo && req.query.ref) {
    const photoUrl =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=400&photo_reference=${encodeURIComponent(req.query.ref)}&key=${key}`;
    try {
      const photoResp = await fetch(photoUrl, { redirect: "follow" });
      if (!photoResp.ok) {
        return res.status(photoResp.status).json({ error: "Photo fetch failed" });
      }
      const contentType = photoResp.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = await photoResp.arrayBuffer();
      return res.status(200).send(Buffer.from(buffer));
    } catch (e) {
      return res.status(502).json({ error: "Photo proxy error", message: e.message });
    }
  }

  // ── Search: POST /api/places ───────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, location } = req.body || {};
  if (!location) {
    return res.status(400).json({ error: "Missing 'location' in request body" });
  }

  const searchQuery = [query || "event venue", location].filter(Boolean).join(" ");

  try {
    // Step 1: Google Places Text Search
    const textSearchUrl =
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${encodeURIComponent(searchQuery)}&key=${key}`;

    const searchResp = await fetch(textSearchUrl);
    const searchData = await searchResp.json();

    if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
      return res
        .status(502)
        .json({ error: `Google Places error: ${searchData.status}`, detail: searchData.error_message });
    }

    const places = (searchData.results || []).slice(0, 20);

    // Step 2: Fetch Place Details in parallel for phone, website, maps URL
    const detailed = await Promise.all(
      places.map(async (place) => {
        let phone = null;
        let website = null;
        let mapsUrl = null;

        try {
          const detailUrl =
            `https://maps.googleapis.com/maps/api/place/details/json` +
            `?place_id=${place.place_id}` +
            `&fields=formatted_phone_number,website,url` +
            `&key=${key}`;
          const detailResp = await fetch(detailUrl);
          const detailData = await detailResp.json();

          if (detailData.status === "OK" && detailData.result) {
            phone = detailData.result.formatted_phone_number || null;
            website = detailData.result.website || null;
            mapsUrl = detailData.result.url || null;
          }
        } catch {
          // If details fail for one place, skip it
        }

        // Build photo URL through our own proxy so the API key stays server-side
        const photoRef = place.photos && place.photos[0] ? place.photos[0].photo_reference : null;
        const photoUrl = photoRef
          ? `/api/places?photo=1&ref=${encodeURIComponent(photoRef)}`
          : null;

        return {
          place_id: place.place_id,
          name: place.name,
          address: place.formatted_address || "",
          rating: place.rating || 0,
          user_ratings_total: place.user_ratings_total || 0,
          photo_url: photoUrl,
          phone,
          website,
          maps_url: mapsUrl,
          types: place.types || [],
          price_level: place.price_level != null ? place.price_level : null,
          business_status: place.business_status || "OPERATIONAL",
        };
      }),
    );

    res.status(200).json({ results: detailed, total: detailed.length });
  } catch (e) {
    res.status(502).json({ error: "Google Places API proxy error", message: e.message });
  }
}
