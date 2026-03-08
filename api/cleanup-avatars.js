const { createClient } = require("@supabase/supabase-js");

const BUCKET = "creator-avatars";
const MIN_IMAGE_BYTES = 5000;

const config = { maxDuration: 60 };

/**
 * POST /api/cleanup-avatars
 * Finds corrupted files in creator-avatars (< 5 KB or HTML content)
 * and deletes them + nulls out directory_members URLs.
 */
const handler = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  // List all top-level entries in the bucket (folders + flat files)
  const { data: rootEntries, error: listErr } = await sb.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (listErr) {
    return res.status(500).json({ error: listErr.message });
  }
  if (!rootEntries || rootEntries.length === 0) {
    return res.json({ message: "Bucket empty", deleted: 0, nulled: 0 });
  }

  let deleted = 0;
  let nulled = 0;
  const details = [];

  for (const entry of rootEntries) {
    // Determine the file path — could be flat (handle.jpg) or folder (handle/avatar.jpg)
    let filePath = null;
    let handle = null;

    if (entry.name.includes(".")) {
      // Flat file: handle.jpg
      filePath = entry.name;
      handle = entry.name.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
    } else {
      // Folder: list contents to find avatar.jpg
      const { data: subFiles } = await sb.storage
        .from(BUCKET)
        .list(entry.name, { limit: 10 });
      if (subFiles && subFiles.length > 0) {
        const avatar = subFiles.find((f) => f.name.startsWith("avatar"));
        if (avatar) {
          filePath = `${entry.name}/${avatar.name}`;
          handle = entry.name;
        }
      }
    }

    if (!filePath) continue;

    // Download the file and check if it's a valid image
    const { data: fileData, error: dlErr } = await sb.storage
      .from(BUCKET)
      .download(filePath);

    if (dlErr || !fileData) {
      details.push({ handle, path: filePath, error: dlErr?.message || "no data" });
      continue;
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const isTooSmall = buffer.length < MIN_IMAGE_BYTES;
    const headStr = buffer.slice(0, 100).toString("utf8").toLowerCase();
    const isHtml = headStr.includes("<!doctype") || headStr.includes("<html");

    if (isTooSmall || isHtml) {
      console.log("[cleanup]", handle, "corrupted:", buffer.length, "bytes, html:", isHtml, "— deleting");

      // Delete from storage
      const { error: rmErr } = await sb.storage.from(BUCKET).remove([filePath]);
      if (rmErr) {
        details.push({ handle, path: filePath, error: `delete failed: ${rmErr.message}` });
        continue;
      }
      deleted++;

      // Null out directory_members URLs
      const { error: dbErr } = await sb
        .from("directory_members")
        .update({ ic_avatar_url: null, avatar_url: null })
        .ilike("creator_handle", handle);

      if (!dbErr) nulled++;
      details.push({ handle, bytes: buffer.length, html: isHtml, deleted: true, dbNulled: !dbErr });
    } else {
      details.push({ handle, bytes: buffer.length, ok: true });
    }
  }

  console.log("[cleanup] Done:", deleted, "deleted,", nulled, "DB rows nulled");

  return res.json({ total: rootEntries.length, deleted, nulled, details });
}

module.exports = handler;
module.exports.config = config;
