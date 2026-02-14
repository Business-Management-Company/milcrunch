import { createClient } from "@supabase/supabase-js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const icApiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }
  if (!icApiKey) {
    return res.status(500).json({ error: "Missing INFLUENCERS_CLUB_API_KEY" });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Get all featured creators (active or not — fetch avatars for all)
  const { data: creators, error: fetchErr } = await supabase
    .from("featured_creators")
    .select("id, handle, display_name, avatar_url, platform")
    .order("sort_order", { ascending: true });

  if (fetchErr) {
    return res.status(500).json({ error: "DB fetch failed", detail: fetchErr.message });
  }

  const results = [];
  let firstFullResponse = null;

  for (let idx = 0; idx < (creators || []).length; idx++) {
    const creator = creators[idx];

    // 2-second delay between API calls (skip for the first one)
    if (idx > 0) {
      await sleep(2000);
    }

    try {
      const enrichResp = await fetch(
        "https://api.influencers.club/public/v1/creators/enrich/handle/raw/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${icApiKey}`,
          },
          body: JSON.stringify({
            handle: creator.handle,
            platform: creator.platform || "instagram",
          }),
        }
      );

      if (!enrichResp.ok) {
        const errText = await enrichResp.text().catch(() => "");
        console.error(`[fetch-avatars] Enrich failed for @${creator.handle}: ${enrichResp.status} ${errText}`);
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "enrich_failed",
          code: enrichResp.status,
          detail: errText.slice(0, 200),
        });
        continue;
      }

      const enrichData = await enrichResp.json();

      // Log the FULL response for the first creator so we can see exact field names
      if (!firstFullResponse) {
        firstFullResponse = { handle: creator.handle, response: enrichData };
        console.log(
          `[fetch-avatars] FULL RESPONSE for @${creator.handle}:`,
          JSON.stringify(enrichData, null, 2)
        );
      }

      // Try every plausible field name for the profile picture
      const avatarUrl =
        enrichData?.profile_picture ||
        enrichData?.profile_pic ||
        enrichData?.profile_pic_url ||
        enrichData?.profile_pic_url_hd ||
        enrichData?.avatar ||
        enrichData?.avatar_url ||
        enrichData?.picture ||
        enrichData?.image ||
        enrichData?.photo ||
        enrichData?.user_profile?.picture ||
        enrichData?.user_profile?.profile_pic_url ||
        enrichData?.user_profile?.profile_pic_url_hd ||
        enrichData?.result?.user_profile?.picture ||
        enrichData?.result?.profile_picture ||
        enrichData?.result?.picture ||
        enrichData?.instagram?.user_profile?.picture ||
        enrichData?.data?.profile_picture ||
        enrichData?.data?.avatar_url ||
        null;

      // Also list all top-level keys so we can debug
      const topKeys = Object.keys(enrichData || {});

      if (!avatarUrl) {
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "no_avatar_found",
          top_level_keys: topKeys,
        });
        continue;
      }

      // Update DB with the avatar URL
      const { error: updateErr } = await supabase
        .from("featured_creators")
        .update({ avatar_url: avatarUrl })
        .eq("id", creator.id);

      if (updateErr) {
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "db_update_failed",
          avatar_url: avatarUrl,
          detail: updateErr.message,
        });
        continue;
      }

      results.push({
        handle: creator.handle,
        display_name: creator.display_name,
        status: "success",
        avatar_url: avatarUrl,
      });
    } catch (e) {
      results.push({
        handle: creator.handle,
        display_name: creator.display_name,
        status: "error",
        detail: e.message,
      });
    }
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  return res.status(200).json({
    summary: `Fetched ${succeeded} of ${results.length} avatars (${results.length - succeeded} failed)`,
    first_response_logged: firstFullResponse ? `See Vercel function logs for @${firstFullResponse.handle}` : null,
    first_response_keys: firstFullResponse ? Object.keys(firstFullResponse.response) : null,
    results,
  });
}
