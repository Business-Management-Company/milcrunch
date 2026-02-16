import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageUrl, handle } = req.body || {};
  if (!imageUrl || !handle) {
    return res.status(400).json({ error: "imageUrl and handle are required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[upload-creator-image] Missing env:", { url: !!supabaseUrl, key: !!supabaseKey });
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    console.log("[upload-creator-image] Fetching:", imageUrl.substring(0, 120));

    const imgResp = await fetch(imageUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RecurrentX/1.0)",
        "Accept": "image/*,*/*",
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
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const path = `directory-avatars/${safeName}.${ext}`;

    console.log("[upload-creator-image] Uploading to creator-images:", path, `(${buffer.length} bytes)`);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: uploadError } = await supabase.storage
      .from("creator-images")
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error("[upload-creator-image] Supabase upload error:", uploadError.message);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase.storage
      .from("creator-images")
      .getPublicUrl(path);

    console.log("[upload-creator-image] Success:", urlData.publicUrl);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (e) {
    console.error("[upload-creator-image] Exception:", e.message, e.stack);
    return res.status(502).json({ error: "Image upload failed", message: e.message });
  }
}
