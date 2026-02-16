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
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    const imgResp = await fetch(imageUrl, { redirect: "follow" });
    if (!imgResp.ok) {
      return res.status(400).json({ error: `Failed to fetch image: ${imgResp.status}` });
    }

    const buffer = Buffer.from(await imgResp.arrayBuffer());
    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const path = `directory-avatars/${safeName}.${ext}`;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: uploadError } = await supabase.storage
      .from("creator-assets")
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase.storage
      .from("creator-assets")
      .getPublicUrl(path);

    return res.status(200).json({ url: urlData.publicUrl });
  } catch (e) {
    return res.status(502).json({ error: "Image upload failed", message: e.message });
  }
}
