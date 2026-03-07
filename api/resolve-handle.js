import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/resolve-handle?handle=johnny-rocket
 *
 * Looks up a creator by handle stored in auth.users raw_user_meta_data.
 * Returns the public bio fields needed to render /c/:handle.
 * Uses the service role key to read auth.users (not accessible from client).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const handle = (req.query.handle || "").trim().toLowerCase();
  if (!handle) {
    return res.status(400).json({ error: "handle is required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // List users and find one whose handle matches
    // Supabase admin API doesn't support filtering by metadata directly,
    // so we paginate through users. For small user bases this is fine.
    let page = 1;
    const perPage = 1000;
    let found = null;

    while (!found) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error("[resolve-handle] listUsers error:", error);
        return res.status(500).json({ error: "Failed to query users" });
      }

      if (!users || users.length === 0) break;

      found = users.find(
        (u) =>
          (u.user_metadata?.handle || "").toLowerCase() === handle
      );

      if (users.length < perPage) break;
      page++;
    }

    if (!found) {
      return res.status(404).json({ error: "not_found" });
    }

    const meta = found.user_metadata || {};

    // Return only public bio fields — never expose email, id, or private data
    return res.status(200).json({
      display_name: meta.full_name || meta.display_name || handle,
      handle: meta.handle || handle,
      avatar_url: meta.avatar_url || null,
      hero_image_url: meta.hero_image_url || null,
      hero_image_format: meta.hero_image_format || meta.image_style || "landscape",
      hero_dominant_color: meta.hero_dominant_color || null,
      bio: meta.bio || null,
      category: meta.category || null,
      branch: meta.military_branch || meta.branch || null,
      custom_links: meta.custom_links || null,
      bio_page_theme: meta.bio_page_theme || "light",
      is_verified_veteran: !!meta.is_verified_veteran,
      service_line: meta.service_line || null,
      social_accounts: meta.social_accounts || [],
    });
  } catch (err) {
    console.error("[resolve-handle] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
