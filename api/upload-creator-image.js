import { createClient } from "@supabase/supabase-js";

const BUCKET = "creator-avatars";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Defensive body parsing ──
  // Vercel usually auto-parses JSON, but sometimes req.body arrives as a string
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      console.error("[upload-creator-image] Failed to parse body string:", body?.substring?.(0, 200));
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  if (!body || typeof body !== "object") {
    console.error("[upload-creator-image] Body is not an object:", typeof body, body);
    return res.status(400).json({ error: "Request body must be JSON object" });
  }

  const { imageUrl, handle: h, creatorHandle, updateDb } = body;
  const handle = h || creatorHandle;

  if (!imageUrl || !handle) {
    console.error("[upload-creator-image] Missing required fields:", {
      imageUrl: imageUrl ? imageUrl.substring(0, 80) : imageUrl,
      handle,
      bodyKeys: Object.keys(body),
    });
    return res.status(400).json({
      error: "imageUrl and handle (or creatorHandle) are required",
      received: { hasImageUrl: !!imageUrl, hasHandle: !!handle, bodyKeys: Object.keys(body) },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  console.log("[upload-creator-image] Env check:", {
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    usingKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon",
  });

  if (!supabaseUrl || !supabaseKey) {
    console.error("[upload-creator-image] Missing env:", { url: !!supabaseUrl, key: !!supabaseKey });
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("[upload-creator-image] Fetching image for", handle, ":", imageUrl.substring(0, 150));

    const imgResp = await fetch(imageUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!imgResp.ok) {
      const errorText = await imgResp.text().catch(() => "");
      console.error("[upload-creator-image] Image fetch FAILED:", {
        status: imgResp.status,
        statusText: imgResp.statusText,
        url: imageUrl.substring(0, 150),
        responseBody: errorText.substring(0, 200),
        headers: Object.fromEntries(imgResp.headers.entries()),
      });
      return res.status(502).json({
        error: `Image fetch failed: ${imgResp.status} ${imgResp.statusText}`,
        imageUrl: imageUrl.substring(0, 120),
      });
    }

    const buffer = Buffer.from(await imgResp.arrayBuffer());
    if (buffer.length < 100) {
      console.error("[upload-creator-image] Image too small:", buffer.length, "bytes — likely not a real image");
      return res.status(502).json({ error: "Fetched image too small, likely expired or blocked" });
    }

    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const path = `${safeName}/avatar.jpg`;

    // Ensure bucket exists (idempotent — ignores "already exists" error)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    console.log("[upload-creator-image] Uploading to", BUCKET, path, `(${buffer.length} bytes, ${contentType})`);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      console.error("[upload-creator-image] Storage upload FAILED:", {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError,
      });
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    const permanentUrl = urlData.publicUrl;
    console.log("[upload-creator-image] Success:", permanentUrl);

    // Update directory_members with the permanent URL
    if (updateDb !== false) {
      const { error: dbErr } = await supabase
        .from("directory_members")
        .update({ ic_avatar_url: permanentUrl, avatar_url: permanentUrl })
        .eq("creator_handle", handle.toLowerCase());

      if (dbErr) {
        console.warn("[upload-creator-image] DB update failed:", dbErr.message);
        // Also try with original case
        const { error: dbErr2 } = await supabase
          .from("directory_members")
          .update({ ic_avatar_url: permanentUrl, avatar_url: permanentUrl })
          .eq("creator_handle", handle);
        if (dbErr2) console.warn("[upload-creator-image] DB update (original case) also failed:", dbErr2.message);
      } else {
        console.log("[upload-creator-image] Updated directory_members for", handle);
      }
    }

    return res.status(200).json({ url: permanentUrl });
  } catch (e) {
    console.error("[upload-creator-image] Exception:", e.message, e.stack);
    return res.status(502).json({ error: "Image upload failed", message: e.message });
  }
}
