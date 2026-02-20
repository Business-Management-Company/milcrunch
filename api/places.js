export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_PLACES_API_KEY not configured" });
  }

  if (req.method === "POST") {
    // Text Search (New) — POST to Google Places API v1
    const { query, type, maxResultCount, locationBias } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' in request body" });
    }

    const body = {
      textQuery: query,
      maxResultCount: maxResultCount || 20,
      languageCode: "en",
    };

    // Add venue type filter
    if (type) {
      body.includedType = type;
    }

    // Add location bias if provided
    if (locationBias) {
      body.locationBias = locationBias;
    }

    try {
      const resp = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.websiteUri",
              "places.nationalPhoneNumber",
              "places.googleMapsUri",
              "places.rating",
              "places.userRatingCount",
              "places.photos",
              "places.types",
              "places.primaryType",
              "places.editorialSummary",
              "places.currentOpeningHours",
              "places.priceLevel",
              "places.accessibilityOptions",
              "places.location",
            ].join(","),
          },
          body: JSON.stringify(body),
        }
      );
      const data = await resp.text();
      res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
    } catch (e) {
      res.status(502).json({ error: "Google Places proxy error", message: e.message });
    }
  } else if (req.method === "GET") {
    // Photo fetch — proxy a photo reference
    const { photoName, maxWidth } = req.query || {};
    if (!photoName) {
      return res.status(400).json({ error: "Missing 'photoName' query param" });
    }

    try {
      const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth || 400}&key=${key}`;
      const resp = await fetch(photoUrl);
      if (!resp.ok) {
        return res.status(resp.status).json({ error: "Photo fetch failed" });
      }
      // Return the final redirected URL
      return res.status(200).json({ url: resp.url });
    } catch (e) {
      res.status(502).json({ error: "Photo proxy error", message: e.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
