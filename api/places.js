export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_PLACES_API_KEY not configured" });
  }

  // ── Photo selection helper ─────────────────────────────────
  // Google Places photos[0] is often an exterior/pool shot.
  // Look at up to 3 photos and prefer one whose attribution
  // hints at an interior/event space. Fallback: use the 2nd photo.
  function pickBestPhoto(photos) {
    if (!Array.isArray(photos) || photos.length === 0) return null;

    const candidates = photos.slice(0, 3);

    // Keywords in html_attributions that hint at interior/event shots
    const INTERIOR_HINTS = /interior|ballroom|banquet|conference|meeting|event|hall|stage|reception|lounge|dining/i;

    for (const p of candidates) {
      const attr = (p.html_attributions || []).join(" ");
      if (INTERIOR_HINTS.test(attr)) {
        return p.photo_reference;
      }
    }

    // No attribution match — skip the first (exterior) if we have alternatives
    if (candidates.length >= 2) {
      return candidates[1].photo_reference;
    }

    return candidates[0].photo_reference;
  }

  // ── Photo proxy: GET /api/places?photo=1&ref=XXXX ──────────
  if (req.method === "GET" && req.query.photo && req.query.ref) {
    const photoUrl =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=800&photo_reference=${encodeURIComponent(req.query.ref)}&key=${key}`;
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

  const { queries } = req.body || {};
  if (!Array.isArray(queries) || queries.length === 0) {
    return res.status(400).json({ error: "Missing 'queries' array in request body" });
  }

  try {
    // Step 1: Run all text searches in parallel (cap at 5 queries)
    const searchPromises = queries.slice(0, 5).map(async (q) => {
      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/textsearch/json` +
          `?query=${encodeURIComponent(q)}&key=${key}`;
        const resp = await fetch(url);
        const data = await resp.json();
        return data.status === "OK" ? (data.results || []).slice(0, 20) : [];
      } catch {
        return [];
      }
    });

    const allResults = await Promise.all(searchPromises);

    // Step 2: Merge and deduplicate by place_id
    const seen = new Set();
    const unique = [];
    for (const results of allResults) {
      for (const place of results) {
        if (!seen.has(place.place_id)) {
          seen.add(place.place_id);
          unique.push(place);
        }
      }
    }

    // Step 3: Fetch Place Details in parallel for phone, website, maps URL
    // Cap at 30 to stay within serverless timeout
    const toDetail = unique.slice(0, 30);
    const detailed = await Promise.all(
      toDetail.map(async (place) => {
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
          // Skip details on error for this place
        }

        // Pick the best photo: prefer interior/event-space shots over
        // exterior/pool images that Google often ranks first.
        const photoRef = pickBestPhoto(place.photos);
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
