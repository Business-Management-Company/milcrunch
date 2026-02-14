const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const icApiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      error: "Missing env vars",
      has_SUPABASE_URL: !!process.env.SUPABASE_URL,
      has_VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      has_SERVICE_KEY: !!serviceKey,
    });
  }
  if (!icApiKey) {
    return res.status(500).json({
      error: "Missing INFLUENCERS_CLUB_API_KEY",
      has_INFLUENCERS_CLUB_API_KEY: !!process.env.INFLUENCERS_CLUB_API_KEY,
      has_VITE_INFLUENCERS_CLUB_API_KEY: !!process.env.VITE_INFLUENCERS_CLUB_API_KEY,
    });
  }

  // ─── 1. Read all featured creators via Supabase REST API ───
  const selectUrl = `${supabaseUrl}/rest/v1/featured_creators?select=id,handle,display_name,avatar_url,platform&order=sort_order.asc`;
  const selectResp = await fetch(selectUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!selectResp.ok) {
    const errText = await selectResp.text().catch(() => "");
    return res.status(500).json({ error: "DB fetch failed", code: selectResp.status, detail: errText });
  }

  const creators = await selectResp.json();
  console.log(`[fetch-avatars] Found ${creators.length} featured creators`);

  const results = [];
  let firstFullResponse = null;

  for (let idx = 0; idx < creators.length; idx++) {
    const creator = creators[idx];

    // 2-second delay between API calls (skip for the first)
    if (idx > 0) {
      await sleep(2000);
    }

    try {
      // ─── 2. Call Influencers.club enrichment API ───
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
          detail: errText.slice(0, 300),
        });
        continue;
      }

      const enrichData = await enrichResp.json();

      // ─── 3. Log the FULL response for the first creator ───
      if (!firstFullResponse) {
        firstFullResponse = { handle: creator.handle, data: enrichData };
        console.log(`[fetch-avatars] ===== FULL RESPONSE for @${creator.handle} =====`);
        console.log(JSON.stringify(enrichData, null, 2));
        console.log(`[fetch-avatars] ===== END FULL RESPONSE =====`);
      }

      // ─── 4. Extract profile picture from every plausible field name ───
      const avatarUrl =
        enrichData?.profile_picture ||
        enrichData?.profile_pic_url ||
        enrichData?.profile_pic_url_hd ||
        enrichData?.profile_pic ||
        enrichData?.avatar_url ||
        enrichData?.avatar ||
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
        enrichData?.data?.profile_pic_url ||
        enrichData?.data?.avatar_url ||
        null;

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

      // ─── 5. Update avatar_url in Supabase via REST API ───
      const updateUrl = `${supabaseUrl}/rest/v1/featured_creators?id=eq.${creator.id}`;
      const updateResp = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });

      if (!updateResp.ok) {
        const errText = await updateResp.text().catch(() => "");
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "db_update_failed",
          avatar_url: avatarUrl,
          detail: errText.slice(0, 200),
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
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    first_response_logged: firstFullResponse
      ? `Full JSON logged to Vercel function logs for @${firstFullResponse.handle}`
      : "No creators found",
    first_response_keys: firstFullResponse ? Object.keys(firstFullResponse.data) : [],
    results,
  });
}
