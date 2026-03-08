const { createClient } = require("@supabase/supabase-js");

const BUCKET = "creator-avatars";

/**
 * POST /api/upload-creator-image
 *
 * Two modes:
 *   1. { handle, imageUrl }     — server fetches the image from the URL, validates, uploads
 *   2. { handle, imageBase64 }  — accepts pre-encoded base64 image data
 *
 * Returns { url } — the permanent Supabase Storage public URL.
 */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { handle: h, creatorHandle, imageBase64, imageUrl, mimeType, updateDb, serverFetch } = body || {};
  const handle = h || creatorHandle;

  if (!handle || (!imageBase64 && !imageUrl)) {
    return res.status(400).json({ error: "handle and (imageBase64 or imageUrl) required" });
  }

  // When serverFetch is true, always fetch imageUrl server-side (skip any browser/CORS path)
  if (serverFetch && imageUrl) {
    console.log("[upload] serverFetch mode for", handle);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let buffer;
    let contentType = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";

    if (imageBase64) {
      // ── Mode 1: base64 ──
      buffer = Buffer.from(imageBase64, "base64");
    } else {
      // ── Mode 2: fetch from URL (server-side) ──
      console.log("[upload]", handle, "fetching", imageUrl.substring(0, 120));
      const imgResp = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      if (!imgResp.ok) {
        console.warn("[upload]", handle, "fetch failed:", imgResp.status);
        return res.status(400).json({ error: `Image fetch failed: ${imgResp.status}` });
      }

      const respType = imgResp.headers.get("content-type") || "";
      if (!respType.startsWith("image/")) {
        console.warn("[upload]", handle, "not an image:", respType);
        return res.status(400).json({ error: `Not an image: ${respType}` });
      }
      contentType = respType.split(";")[0];

      const arrayBuf = await imgResp.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    }

    // ── Validate ──
    if (buffer.length < 5000) {
      console.warn("[upload]", handle, "too small:", buffer.length, "bytes");
      return res.status(400).json({ error: `Image too small (${buffer.length} bytes)` });
    }

    const head = buffer.slice(0, 200).toString("utf8").toLowerCase();
    if (head.includes("<!doctype") || head.includes("<html")) {
      console.warn("[upload]", handle, "response is HTML, not an image");
      return res.status(400).json({ error: "Response is HTML, not an image" });
    }

    // ── Upload to Supabase Storage ──
    const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const path = `${safeName}/avatar.jpg`;

    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    console.log("[upload]", handle, "uploading", buffer.length, "bytes to", path);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error("[upload]", handle, "storage error:", uploadError.message);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const permanentUrl = urlData.publicUrl;
    console.log("[upload]", handle, "success:", permanentUrl);

    // Optionally update directory_members rows
    if (updateDb !== false) {
      const { error: dbErr } = await supabase
        .from("directory_members")
        .update({ ic_avatar_url: permanentUrl, avatar_url: permanentUrl })
        .eq("creator_handle", handle.toLowerCase());
      if (dbErr) {
        await supabase
          .from("directory_members")
          .update({ ic_avatar_url: permanentUrl, avatar_url: permanentUrl })
          .eq("creator_handle", handle);
      }
    }

    return res.status(200).json({ url: permanentUrl });
  } catch (e) {
    console.error("[upload]", handle, "exception:", e.message);
    return res.status(502).json({ error: e.message });
  }
}
