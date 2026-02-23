export default async function handler(req, res) {
  try {
    const { imageUrl, handle } = req.body;
    if (!imageUrl || !handle) return res.status(400).json({ error: "Missing imageUrl or handle" });

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return res.status(502).json({ error: "Failed to fetch image" });

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ext = "jpg";
    const path = `avatars/${handle}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("creator-images")
      .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: { publicUrl } } = supabase.storage
      .from("creator-images")
      .getPublicUrl(path);

    await supabase.from("directory_members")
      .update({ avatar_url: publicUrl, ic_avatar_url: publicUrl })
      .eq("creator_handle", handle);

    return res.status(200).json({ url: publicUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
