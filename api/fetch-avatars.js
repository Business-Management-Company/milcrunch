const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  // ─── Env var diagnostics ───
  const envDiag = {
    has_SUPABASE_URL: !!process.env.SUPABASE_URL,
    has_VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    has_SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_INFLUENCERS_CLUB_API_KEY: !!process.env.INFLUENCERS_CLUB_API_KEY,
    has_VITE_INFLUENCERS_CLUB_API_KEY: !!process.env.VITE_INFLUENCERS_CLUB_API_KEY,
  };
  console.log("[fetch-avatars] ENV DIAGNOSTICS:", JSON.stringify(envDiag));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const icApiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Missing Supabase env vars", env: envDiag });
  }
  if (!icApiKey) {
    return res.status(500).json({ error: "Missing Influencers Club API key", env: envDiag });
  }

  // Log partial key info for debugging (first 8 chars only)
  console.log("[fetch-avatars] Supabase URL:", supabaseUrl);
  console.log("[fetch-avatars] Service key starts with:", serviceKey.substring(0, 8) + "...");
  console.log("[fetch-avatars] IC API key starts with:", icApiKey.substring(0, 8) + "...");

  // ─── 1. Read all featured creators via Supabase REST API ───
  const selectUrl = `${supabaseUrl}/rest/v1/featured_creators?select=id,handle,display_name,avatar_url,platform&order=sort_order.asc`;
  console.log("[fetch-avatars] Fetching creators from:", selectUrl);

  let selectResp;
  try {
    selectResp = await fetch(selectUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
  } catch (fetchErr) {
    console.error("[fetch-avatars] Supabase fetch threw:", fetchErr.message);
    return res.status(500).json({ error: "Supabase fetch threw", detail: fetchErr.message, env: envDiag });
  }

  const selectBody = await selectResp.text();
  console.log("[fetch-avatars] Supabase response status:", selectResp.status);
  console.log("[fetch-avatars] Supabase response body (first 500):", selectBody.substring(0, 500));

  if (!selectResp.ok) {
    return res.status(500).json({
      error: "Supabase read failed",
      http_status: selectResp.status,
      body: selectBody.substring(0, 500),
      env: envDiag,
    });
  }

  let creators;
  try {
    creators = JSON.parse(selectBody);
  } catch (e) {
    return res.status(500).json({ error: "Supabase returned non-JSON", body: selectBody.substring(0, 500) });
  }

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
      const enrichUrl = "https://api.influencers.club/public/v1/creators/enrich/handle/raw/";
      const enrichBody = { handle: creator.handle, platform: creator.platform || "instagram" };
      console.log(`[fetch-avatars] [${idx + 1}/${creators.length}] Enriching @${creator.handle}...`);

      let enrichResp;
      try {
        enrichResp = await fetch(enrichUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${icApiKey}`,
          },
          body: JSON.stringify(enrichBody),
        });
      } catch (fetchErr) {
        console.error(`[fetch-avatars] IC fetch threw for @${creator.handle}:`, fetchErr.message);
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "fetch_error",
          detail: fetchErr.message,
        });
        continue;
      }

      const enrichText = await enrichResp.text();
      console.log(`[fetch-avatars] IC response for @${creator.handle}: status=${enrichResp.status}, body length=${enrichText.length}`);

      if (!enrichResp.ok) {
        console.error(`[fetch-avatars] IC error for @${creator.handle}: ${enrichResp.status} ${enrichText.substring(0, 300)}`);
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "enrich_failed",
          http_status: enrichResp.status,
          detail: enrichText.substring(0, 300),
        });
        continue;
      }

      let enrichData;
      try {
        enrichData = JSON.parse(enrichText);
      } catch (e) {
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "json_parse_error",
          detail: enrichText.substring(0, 300),
        });
        continue;
      }

      // ─── 3. Log the FULL response for the first creator ───
      if (!firstFullResponse) {
        firstFullResponse = { handle: creator.handle, data: enrichData };
        console.log(`[fetch-avatars] ===== FULL RESPONSE for @${creator.handle} =====`);
        console.log(JSON.stringify(enrichData, null, 2));
        console.log(`[fetch-avatars] ===== END FULL RESPONSE =====`);
      }

      // ─── 4. Extract profile picture — try every plausible path ───
      const avatarUrl =
        // Top-level fields
        enrichData?.profile_picture ||
        enrichData?.profile_pic_url ||
        enrichData?.profile_pic_url_hd ||
        enrichData?.profile_pic ||
        enrichData?.avatar_url ||
        enrichData?.avatar ||
        enrichData?.picture ||
        enrichData?.image ||
        enrichData?.photo ||
        // Nested under user_profile
        enrichData?.user_profile?.picture ||
        enrichData?.user_profile?.profile_pic_url ||
        enrichData?.user_profile?.profile_pic_url_hd ||
        enrichData?.user_profile?.profile_picture ||
        // Nested under result
        enrichData?.result?.user_profile?.picture ||
        enrichData?.result?.profile_picture ||
        enrichData?.result?.picture ||
        // Nested under result.instagram
        enrichData?.result?.instagram?.picture ||
        enrichData?.result?.instagram?.profile_pic_url ||
        enrichData?.result?.instagram?.profile_pic_url_hd ||
        enrichData?.result?.instagram?.profile_picture ||
        // Nested under instagram
        enrichData?.instagram?.user_profile?.picture ||
        enrichData?.instagram?.picture ||
        enrichData?.instagram?.profile_pic_url ||
        enrichData?.instagram?.profile_pic_url_hd ||
        // Nested under data
        enrichData?.data?.profile_picture ||
        enrichData?.data?.profile_pic_url ||
        enrichData?.data?.avatar_url ||
        null;

      const topKeys = Object.keys(enrichData || {});
      // Also log nested keys for debugging
      const nestedInfo = {};
      for (const key of topKeys) {
        const val = enrichData[key];
        if (val && typeof val === "object" && !Array.isArray(val)) {
          nestedInfo[key] = Object.keys(val);
        }
      }
      console.log(`[fetch-avatars] @${creator.handle} top keys: [${topKeys.join(", ")}]`);
      console.log(`[fetch-avatars] @${creator.handle} nested keys:`, JSON.stringify(nestedInfo));
      console.log(`[fetch-avatars] @${creator.handle} avatar found: ${avatarUrl ? "YES" : "NO"}`);

      if (!avatarUrl) {
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "no_avatar_found",
          top_level_keys: topKeys,
          nested_keys: nestedInfo,
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
        console.error(`[fetch-avatars] DB update failed for @${creator.handle}: ${updateResp.status} ${errText}`);
        results.push({
          handle: creator.handle,
          display_name: creator.display_name,
          status: "db_update_failed",
          avatar_url: avatarUrl,
          http_status: updateResp.status,
          detail: errText.substring(0, 200),
        });
        continue;
      }

      console.log(`[fetch-avatars] SUCCESS @${creator.handle} → ${avatarUrl.substring(0, 80)}...`);
      results.push({
        handle: creator.handle,
        display_name: creator.display_name,
        status: "success",
        avatar_url: avatarUrl,
      });
    } catch (e) {
      console.error(`[fetch-avatars] Unexpected error for @${creator.handle}:`, e.message, e.stack);
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
    env: envDiag,
    first_response_logged: firstFullResponse
      ? `Full JSON logged to Vercel function logs for @${firstFullResponse.handle}`
      : "No creators found or all failed before enrichment",
    first_response_keys: firstFullResponse ? Object.keys(firstFullResponse.data) : [],
    results,
  });
}
