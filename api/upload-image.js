import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: { sizeLimit: "6mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fileBase64, contentType, bucket, folder, userId } = req.body || {};

  if (!fileBase64 || !contentType || !bucket) {
    return res.status(400).json({ error: "fileBase64, contentType, and bucket are required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[upload-image] Missing env:", { url: !!supabaseUrl, key: !!supabaseKey });
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    const buffer = Buffer.from(fileBase64, "base64");
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const dir = folder || "uploads";
    const owner = userId || "anon";
    const path = `${dir}/${owner}/${Date.now()}.${ext}`;

    console.log(`[upload-image] Uploading to ${bucket}/${path} (${buffer.length} bytes)`);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error("[upload-image] Upload error:", uploadError.message);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    console.log("[upload-image] Success:", urlData.publicUrl);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (e) {
    console.error("[upload-image] Exception:", e.message);
    return res.status(502).json({ error: "Upload failed", message: e.message });
  }
}
