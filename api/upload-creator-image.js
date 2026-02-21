import { createClient } from "@supabase/supabase-js";

const BUCKET = "creator-avatars";

/**
 * POST /api/upload-creator-image
 * Accepts pre-fetched image data (base64) from the browser and uploads to Supabase Storage.
 * The browser fetches Instagram CDN images directly (no CORS issue),
 * validates them, and sends the bytes here — no server-side CDN fetch needed.
 *
 * Body: { handle, imageBase64, mimeType?, updateDb? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { handle: h, creatorHandle, imageBase64, mimeType, updateDb } = body || {};
  const handle = h || creatorHandle;

  if (!handle || !imageBase64) {
    return res.status(400).json({ error: "handle and imageBase64 are required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Decode base64 to buffer
    const buffer = Buffer.from(imageBase64, "base64");

    if (buffer.length < 5000) {
      console.error("[upload]", handle, "image too small:", buffer.length, "bytes");
      return res.status(400).json({ error: `Image too small (${buffer.length} bytes)` });
    }

    const contentType = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
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
