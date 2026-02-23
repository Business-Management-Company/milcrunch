export default async function handler(req, res) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Optional: pass ?limit=3 for testing on a small batch first
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 1000;
    const dryRun = req.query.dry === "true";

    // Find all rows where ic_avatar_url still points to CloudFront
    const { data: creators, error: fetchError } = await supabase
      .from("directory_members")
      .select("id, creator_handle, ic_avatar_url, avatar_url")
      .like("ic_avatar_url", "%d32n58yyab954y.cloudfront.net%")
      .limit(limit);

    if (fetchError) {
      return res.status(500).json({ error: "Query failed: " + fetchError.message });
    }

    if (!creators || creators.length === 0) {
      return res.status(200).json({ message: "No CloudFront avatars found. Migration complete!", total: 0 });
    }

    if (dryRun) {
      return res.status(200).json({
        message: "Dry run — these creators would be migrated",
        total: creators.length,
        creators: creators.map(c => ({ handle: c.creator_handle, current_url: c.ic_avatar_url }))
      });
    }

    const results = [];

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];
      const handle = creator.creator_handle;
      const imageUrl = creator.ic_avatar_url;

      try {
        // Download from CloudFront
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          results.push({ handle, status: "failed", reason: `Fetch failed: ${imgRes.status}` });
          continue;
        }

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const path = `avatars/${handle}.jpg`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("creator-images")
          .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

        if (uploadError) {
          results.push({ handle, status: "failed", reason: `Upload failed: ${uploadError.message}` });
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("creator-images")
          .getPublicUrl(path);

        // Update database
        const { error: updateError } = await supabase
          .from("directory_members")
          .update({ avatar_url: publicUrl, ic_avatar_url: publicUrl })
          .eq("id", creator.id);

        if (updateError) {
          results.push({ handle, status: "failed", reason: `DB update failed: ${updateError.message}` });
          continue;
        }

        results.push({ handle, status: "migrated", newUrl: publicUrl });
      } catch (err) {
        results.push({ handle, status: "failed", reason: err.message });
      }
    }

    const migrated = results.filter(r => r.status === "migrated").length;
    const failed = results.filter(r => r.status === "failed").length;

    return res.status(200).json({
      message: `Migration complete: ${migrated} migrated, ${failed} failed out of ${creators.length}`,
      total: creators.length,
      migrated,
      failed,
      results
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
