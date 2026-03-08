const MIN_AVATAR_BYTES = 5000; // IC placeholder is ~2556 bytes

module.exports = async function handler(req, res) {
  try {
    const { imageUrl, handle } = req.body;
    if (!imageUrl || !handle) return res.status(400).json({ error: "Missing imageUrl or handle" });

    // Skip if already a Supabase Storage URL
    if (imageUrl.includes("supabase.co/storage")) {
      return res.status(200).json({ url: imageUrl, skipped: true });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const imgRes = await fetch(imageUrl, {
      redirect: "follow",
      headers: { Accept: "image/*,*/*" },
    });
    if (!imgRes.ok) return res.status(502).json({ error: `Failed to fetch image: HTTP ${imgRes.status}` });

    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // Validate: reject tiny images (IC placeholder is ~2556 bytes)
    if (buffer.length < MIN_AVATAR_BYTES) {
      return res.status(422).json({ error: `Image too small (${buffer.length} bytes) — likely placeholder` });
    }

    // Validate: reject HTML responses masquerading as images
    const head = buffer.slice(0, 200).toString("utf8").toLowerCase();
    if (head.includes("<!doctype") || head.includes("<html") || head.includes("<head")) {
      return res.status(422).json({ error: "Response is HTML, not an image" });
    }

    // Validate: check content-type is actually an image
    // Allow octet-stream (generic binary) since CDNs sometimes don't set proper MIME
    const contentType = imgRes.headers.get("content-type") || "";
    if (contentType && !contentType.startsWith("image/") && !contentType.includes("octet-stream")) {
      return res.status(422).json({ error: `Invalid content-type: ${contentType}` });
    }

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

    return res.status(200).json({ url: publicUrl, size: buffer.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
