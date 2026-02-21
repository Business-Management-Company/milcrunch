import { createClient } from "@supabase/supabase-js";

const BUCKET = "creator-avatars";
const MIN_IMAGE_BYTES = 5000; // Real profile photos are > 5 KB; HTML error pages are smaller

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Defensive body parsing ──
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be JSON object" });
  }

  const { imageUrl, handle: h, creatorHandle, updateDb } = body;
  const handle = h || creatorHandle;

  if (!imageUrl || !handle) {
    return res.status(400).json({
      error: "imageUrl and handle are required",
      received: { hasImageUrl: !!imageUrl, hasHandle: !!handle },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("[upload] Fetching", handle, ":", imageUrl.substring(0, 120));

    const imgResp = await fetch(imageUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!imgResp.ok) {
      console.error("[upload]", handle, "fetch failed:", imgResp.status);
      return res.status(502).json({ error: `Image fetch failed: ${imgResp.status}` });
    }

    // ── Validate content-type: must be an actual image ──
    const contentType = imgResp.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.error("[upload]", handle, "not an image. Content-Type:", contentType);
      return res.status(502).json({
        error: "Response is not an image",
        contentType,
      });
    }

    // ── Validate size: real photos are > 5 KB; HTML error pages are smaller ──
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    if (buffer.length < MIN_IMAGE_BYTES) {
      console.error("[upload]", handle, "too small:", buffer.length, "bytes (min", MIN_IMAGE_BYTES, ")");
      return res.status(502).json({
        error: `Image too small (${buffer.length} bytes), likely not a real photo`,
      });
    }

    // ── Extra guard: check for HTML inside the buffer ──
    const head = buffer.slice(0, 100).toString("utf8").toLowerCase();
    if (head.includes("<!doctype") || head.includes("<html")) {
      console.error("[upload]", handle, "buffer contains HTML, not an image");
      return res.status(502).json({ error: "Response body is HTML, not an image" });
    }

    const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const path = `${safeName}/avatar.jpg`;

    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    console.log("[upload]", handle, "uploading", buffer.length, "bytes to", path);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

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
