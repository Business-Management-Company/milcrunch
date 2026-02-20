import { createClient } from "@supabase/supabase-js";

const BUCKET = "creator-avatars";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageUrl, handle: h, creatorHandle, updateDb } = req.body || {};
  const handle = h || creatorHandle;
  if (!imageUrl || !handle) {
    return res.status(400).json({ error: "imageUrl and handle (or creatorHandle) are required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[upload-creator-image] Missing env:", { url: !!supabaseUrl, key: !!supabaseKey });
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("[upload-creator-image] Fetching:", imageUrl.substring(0, 120));

    const imgResp = await fetch(imageUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MilCrunch/1.0)",
        Accept: "image/*,*/*",
      },
    });

    if (!imgResp.ok) {
      console.error("[upload-creator-image] Image fetch failed:", imgResp.status, imgResp.statusText);
      return res.status(400).json({
        error: `Failed to fetch image: ${imgResp.status} ${imgResp.statusText}`,
        imageUrl: imageUrl.substring(0, 120),
      });
    }

    const buffer = Buffer.from(await imgResp.arrayBuffer());
    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const path = `${safeName}/avatar.jpg`;

    // Ensure bucket exists (idempotent — ignores "already exists" error)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    console.log("[upload-creator-image] Uploading to", BUCKET, path, `(${buffer.length} bytes)`);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error("[upload-creator-image] Upload error:", uploadError.message);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    const permanentUrl = urlData.publicUrl;
    console.log("[upload-creator-image] Success:", permanentUrl);

    // Optionally update directory_members with the permanent URL
    if (updateDb !== false) {
      supabase
        .from("directory_members")
        .update({ ic_avatar_url: permanentUrl, avatar_url: permanentUrl })
        .eq("creator_handle", handle.toLowerCase())
        .then(({ error }) => {
          if (error) console.warn("[upload-creator-image] DB update failed:", error.message);
          else console.log("[upload-creator-image] Updated directory_members for", handle);
        });
    }

    return res.status(200).json({ url: permanentUrl });
  } catch (e) {
    console.error("[upload-creator-image] Exception:", e.message, e.stack);
    return res.status(502).json({ error: "Image upload failed", message: e.message });
  }
}
