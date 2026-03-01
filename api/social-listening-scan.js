import { createClient } from "@supabase/supabase-js";

/**
 * Social Listening Scan — scans creator_enrichment_cache for brand keyword
 * matches in post captions/hashtags, then runs matches through Claude for
 * sentiment analysis. Zero IC API credits.
 *
 * POST /api/social-listening-scan
 * Body: { monitor_id, action?: "scan" | "seed" | "ensure_tables" }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const anthropicKey =
    process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { action, monitor_id } = req.body || {};

  try {
    // ── Ensure tables exist ──
    if (action === "ensure_tables") {
      return await ensureTables(supabase, res);
    }

    // ── Seed demo data ──
    if (action === "seed") {
      return await seedDemoData(supabase, res);
    }

    // ── Default: run scan ──
    if (!monitor_id) {
      return res.status(400).json({ error: "monitor_id is required" });
    }

    return await runScan(supabase, anthropicKey, monitor_id, res);
  } catch (err) {
    console.error("[social-listening-scan] Exception:", err.message);
    return res
      .status(500)
      .json({ error: "Scan failed", message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCAN ENGINE — reads enrichment cache, matches keywords, Claude sentiment
   ═══════════════════════════════════════════════════════════════════════════ */

async function runScan(supabase, anthropicKey, monitorId, res) {
  const startTime = Date.now();

  // 1. Fetch monitor
  const { data: monitor, error: monErr } = await supabase
    .from("brand_monitors")
    .select("*")
    .eq("id", monitorId)
    .single();

  if (monErr || !monitor) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  const keywords = (monitor.keywords || []).map((k) => k.toLowerCase());
  const hashtags = (monitor.hashtags || []).map((h) =>
    h.toLowerCase().replace(/^#/, "")
  );
  const allTerms = [...keywords, ...hashtags];

  if (allTerms.length === 0) {
    return res.status(400).json({ error: "Monitor has no keywords or hashtags" });
  }

  // 2. Create monitor_runs record
  const { data: runRecord } = await supabase
    .from("monitor_runs")
    .insert({ monitor_id: monitorId, status: "running", posts_found: 0, posts_analyzed: 0 })
    .select("id")
    .single();
  const runId = runRecord?.id;

  // 3. Fetch enrichment cache — all rows with enrichment_data
  const { data: cacheRows, error: cacheErr } = await supabase
    .from("creator_enrichment_cache")
    .select("username, platform, enrichment_data");

  if (cacheErr) {
    console.error("[scan] Cache fetch error:", cacheErr.message);
    if (runId) {
      await supabase.from("monitor_runs").update({ status: "failed", error_message: cacheErr.message }).eq("id", runId);
    }
    return res.status(500).json({ error: "Failed to fetch enrichment cache", detail: cacheErr.message });
  }

  console.log(`[scan] Fetched ${(cacheRows || []).length} cached creators`);

  // 4. Fetch existing mentions to deduplicate
  const { data: existingMentions } = await supabase
    .from("social_mentions")
    .select("creator_handle, caption_snippet")
    .eq("monitor_id", monitorId);
  const existingSet = new Set(
    (existingMentions || []).map((m) => `${m.creator_handle}||${m.caption_snippet}`)
  );

  // 5. Extract posts and match keywords
  const matches = [];

  for (const row of cacheRows || []) {
    if (!row.enrichment_data) continue;
    const ed = row.enrichment_data;

    // Extract posts from all platforms in the enrichment data
    const platforms = ["instagram", "tiktok", "youtube", "twitter", "facebook"];
    for (const plat of platforms) {
      // Platform data can live at: ed.result[plat] or ed[plat] (for instagram)
      const platData =
        (ed.result && ed.result[plat]) ||
        (plat === "instagram" ? ed.instagram : null) ||
        ed[plat];

      if (!platData || typeof platData !== "object") continue;

      const posts = platData.post_data;
      if (!Array.isArray(posts) || posts.length === 0) continue;

      const creatorFollowers = Number(
        platData.follower_count || platData.subscriber_count || 0
      );
      const creatorName =
        platData.full_name || platData.name || platData.username || row.username;
      const creatorAvatar =
        platData.profile_picture || platData.picture || platData.avatar || null;

      for (const post of posts) {
        const caption = String(
          post.caption || post.title || post.description || ""
        );
        const captionLower = caption.toLowerCase();

        // Extract hashtags from post
        const postHashtags = [];
        const hashtagMatches = caption.match(/#[\w]+/g);
        if (hashtagMatches) {
          postHashtags.push(
            ...hashtagMatches.map((h) => h.toLowerCase().replace(/^#/, ""))
          );
        }

        // Check for keyword/hashtag matches
        const matchedKeywords = [];
        for (const term of allTerms) {
          if (captionLower.includes(term)) {
            matchedKeywords.push(term);
          }
          // Also check hashtags
          if (postHashtags.includes(term.replace(/^#/, ""))) {
            if (!matchedKeywords.includes(term)) matchedKeywords.push(term);
          }
        }

        if (matchedKeywords.length === 0) continue;

        // Build caption snippet (first 280 chars)
        const snippet = caption.length > 280 ? caption.slice(0, 277) + "..." : caption;

        // Deduplicate
        const dedupeKey = `${row.username}||${snippet}`;
        if (existingSet.has(dedupeKey)) continue;
        existingSet.add(dedupeKey);

        // Extract engagement
        const eng =
          post.engagement && typeof post.engagement === "object"
            ? post.engagement
            : post;
        const likes = Number(eng.likes || eng.like_count || eng.digg_count || 0);
        const comments = Number(eng.comments || eng.comment_count || 0);
        const shares = Number(eng.shares || eng.share_count || eng.retweet_count || 0);
        const views = Number(eng.views || eng.view_count || eng.play_count || 0);

        // Thumbnail
        const media = Array.isArray(post.media) && post.media[0];
        const thumbnail =
          (media && media.url) ||
          post.thumbnail ||
          post.image_url ||
          post.cover ||
          post.video_cover ||
          null;

        // Post URL
        const postUrl =
          post.post_url || post.video_url || post.url || null;

        // Post date
        const postDate =
          post.created_at || post.create_time || post.published_at || null;

        matches.push({
          monitor_id: monitorId,
          creator_handle: row.username,
          creator_name: creatorName,
          creator_avatar: creatorAvatar,
          platform: plat,
          post_url: postUrl,
          post_thumbnail: thumbnail,
          caption_snippet: snippet,
          matched_keywords: matchedKeywords,
          engagement_likes: likes,
          engagement_comments: comments,
          engagement_shares: shares,
          engagement_views: views,
          creator_followers: creatorFollowers,
          estimated_reach: creatorFollowers > 0 ? creatorFollowers : (likes + comments) * 10,
          post_date: postDate,
        });
      }
    }
  }

  console.log(`[scan] Found ${matches.length} keyword matches`);

  // Cap at 50 per scan
  const capped = matches.length > 50;
  const toAnalyze = matches.slice(0, 50);
  let claudeCalls = 0;

  // 6. Batch Claude sentiment analysis (5 at a time, 500ms delay)
  if (anthropicKey && toAnalyze.length > 0) {
    const batchSize = 5;
    for (let i = 0; i < toAnalyze.length; i += batchSize) {
      const batch = toAnalyze.slice(i, i + batchSize);

      const sentimentPromises = batch.map(async (match) => {
        try {
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 1024,
              system:
                "You are a social media analyst for military influencer marketing. Analyze this creator's post for brand sentiment. Return ONLY valid JSON with no other text:\n{\n  \"sentiment\": \"positive\" | \"neutral\" | \"negative\" | \"mixed\",\n  \"sentiment_score\": 0.0 to 1.0,\n  \"is_sponsored\": true or false,\n  \"sponsorship_signals\": [],\n  \"themes\": [],\n  \"brand_context\": \"one sentence on how the brand is mentioned\"\n}",
              messages: [
                {
                  role: "user",
                  content: `Brand: ${monitor.brand_name}\nKeywords: ${allTerms.join(", ")}\nCreator: @${match.creator_handle} (${match.creator_followers} followers)\nCaption: ${match.caption_snippet}\nAnalyze.`,
                },
              ],
            }),
          });

          claudeCalls++;

          if (!resp.ok) {
            console.error("[scan] Claude API error:", resp.status);
            return null;
          }

          const data = await resp.json();
          const text = data.content?.[0]?.text || "";

          // Parse JSON — try trimming to last valid }
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            const trimmed = text.slice(0, text.lastIndexOf("}") + 1);
            try {
              parsed = JSON.parse(trimmed);
            } catch {
              return null;
            }
          }

          return {
            handle: match.creator_handle,
            snippet: match.caption_snippet,
            sentiment: parsed.sentiment || "neutral",
            sentiment_score: Number(parsed.sentiment_score) || 0.5,
            is_sponsored: Boolean(parsed.is_sponsored),
            sponsorship_signals: Array.isArray(parsed.sponsorship_signals)
              ? parsed.sponsorship_signals
              : [],
            themes: Array.isArray(parsed.themes) ? parsed.themes : [],
            brand_context: parsed.brand_context || "",
          };
        } catch (err) {
          console.error("[scan] Claude call failed:", err.message);
          return null;
        }
      });

      const results = await Promise.all(sentimentPromises);

      // Apply sentiment to matches
      for (const result of results) {
        if (!result) continue;
        const match = toAnalyze.find(
          (m) =>
            m.creator_handle === result.handle &&
            m.caption_snippet === result.snippet
        );
        if (match) {
          match.sentiment = result.sentiment;
          match.sentiment_score = result.sentiment_score;
          match.is_sponsored = result.is_sponsored;
          match.sponsorship_signals = result.sponsorship_signals;
          match.themes = result.themes;
          match.brand_context = result.brand_context;
        }
      }

      // Delay between batches
      if (i + batchSize < toAnalyze.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  // Default unscored mentions
  for (const m of toAnalyze) {
    if (!m.sentiment) {
      m.sentiment = "neutral";
      m.sentiment_score = 0.5;
      m.brand_context = "Analysis unavailable";
    }
  }

  // 7. Save to social_mentions
  if (toAnalyze.length > 0) {
    const { error: insertErr } = await supabase
      .from("social_mentions")
      .insert(toAnalyze);

    if (insertErr) {
      console.error("[scan] Insert error:", insertErr.message);
    }
  }

  // 8. Update monitor_runs
  const duration = Date.now() - startTime;
  if (runId) {
    await supabase
      .from("monitor_runs")
      .update({
        posts_found: matches.length,
        posts_analyzed: toAnalyze.length,
        credits_used: 0,
        status: "completed",
        duration_ms: duration,
      })
      .eq("id", runId);
  }

  return res.status(200).json({
    success: true,
    posts_found: matches.length,
    posts_analyzed: toAnalyze.length,
    claude_calls: claudeCalls,
    ic_credits_used: 0,
    capped,
    duration_ms: duration,
    creators_scanned: (cacheRows || []).length,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENSURE TABLES — creates tables if they don't exist (idempotent)
   ═══════════════════════════════════════════════════════════════════════════ */

async function ensureTables(supabase, res) {
  const sql = `
    CREATE TABLE IF NOT EXISTS brand_monitors (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      brand_name TEXT NOT NULL,
      keywords TEXT[] DEFAULT '{}',
      hashtags TEXT[] DEFAULT '{}',
      logo_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS social_mentions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      monitor_id UUID REFERENCES brand_monitors(id) ON DELETE CASCADE,
      creator_handle TEXT NOT NULL,
      creator_name TEXT,
      creator_avatar TEXT,
      platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'facebook')),
      post_url TEXT,
      post_thumbnail TEXT,
      caption_snippet TEXT,
      matched_keywords TEXT[] DEFAULT '{}',
      sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
      sentiment_score NUMERIC(3,2),
      is_sponsored BOOLEAN DEFAULT false,
      sponsorship_signals TEXT[],
      themes TEXT[] DEFAULT '{}',
      brand_context TEXT,
      engagement_likes INTEGER DEFAULT 0,
      engagement_comments INTEGER DEFAULT 0,
      engagement_shares INTEGER DEFAULT 0,
      engagement_views INTEGER DEFAULT 0,
      creator_followers INTEGER DEFAULT 0,
      estimated_reach INTEGER DEFAULT 0,
      post_date TIMESTAMPTZ,
      detected_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS monitor_runs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      monitor_id UUID REFERENCES brand_monitors(id) ON DELETE CASCADE,
      ran_at TIMESTAMPTZ DEFAULT now(),
      posts_found INTEGER DEFAULT 0,
      posts_analyzed INTEGER DEFAULT 0,
      credits_used INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
      error_message TEXT,
      duration_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_social_mentions_monitor ON social_mentions(monitor_id);
    CREATE INDEX IF NOT EXISTS idx_social_mentions_sentiment ON social_mentions(sentiment);
    CREATE INDEX IF NOT EXISTS idx_social_mentions_detected ON social_mentions(detected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_social_mentions_platform ON social_mentions(platform);
    CREATE INDEX IF NOT EXISTS idx_monitor_runs_monitor ON monitor_runs(monitor_id);

    DO $$ BEGIN
      ALTER TABLE brand_monitors ENABLE ROW LEVEL SECURITY;
      ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE monitor_runs ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE POLICY "Allow all for authenticated users" ON brand_monitors FOR ALL USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE POLICY "Allow all for authenticated users" ON social_mentions FOR ALL USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE POLICY "Allow all for authenticated users" ON monitor_runs FOR ALL USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `;

  const { error } = await supabase.rpc("exec_sql", { query: sql });
  if (error) {
    console.error("[ensure_tables] Error:", error.message);
    return res.status(500).json({ error: "Failed to create tables", detail: error.message });
  }

  return res.status(200).json({ success: true, message: "Tables ensured" });
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEED DEMO DATA — creates monitors + realistic mentions for demo
   ═══════════════════════════════════════════════════════════════════════════ */

async function seedDemoData(supabase, res) {
  const now = new Date();

  function daysAgo(d, h = 0) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    dt.setHours(dt.getHours() - h);
    return dt.toISOString();
  }

  // Create 3 monitors
  const monitors = [
    { brand_name: "USAA", keywords: ["usaa", "military banking", "military insurance"], hashtags: ["usaa", "usaaproud", "militaryfinance"] },
    { brand_name: "VetTix", keywords: ["vettix", "vet tix", "veteran tickets"], hashtags: ["vettix", "veterantickets", "vettixevents"] },
    { brand_name: "Grunt Style", keywords: ["grunt style", "gruntstyle"], hashtags: ["gruntstyle", "gruntlife", "thiswedefend"] },
  ];

  const { data: insertedMonitors, error: monErr } = await supabase
    .from("brand_monitors")
    .upsert(monitors, { onConflict: "brand_name", ignoreDuplicates: true })
    .select("id, brand_name");

  if (monErr) {
    // If upsert fails, try insert or select existing
    console.error("[seed] Monitor upsert error:", monErr.message);
  }

  // Fetch monitors (either just inserted or pre-existing)
  const { data: allMonitors } = await supabase
    .from("brand_monitors")
    .select("id, brand_name")
    .in("brand_name", ["USAA", "VetTix", "Grunt Style"]);

  if (!allMonitors || allMonitors.length === 0) {
    return res.status(500).json({ error: "Could not create or fetch monitors" });
  }

  const monitorMap = {};
  for (const m of allMonitors) {
    monitorMap[m.brand_name] = m.id;
  }

  // Realistic military creator handles
  const creators = [
    { handle: "patriotickenny", name: "Patriotic Kenny", followers: 245000, platform: "instagram" },
    { handle: "kendallmariah", name: "Kendall Mariah", followers: 189000, platform: "instagram" },
    { handle: "johnny_marines", name: "Johnny Marines", followers: 168000, platform: "tiktok" },
    { handle: "florent.groberg", name: "Florent Groberg", followers: 51900, platform: "instagram" },
    { handle: "army_ranger_fit", name: "Ranger Fitness", followers: 120000, platform: "instagram" },
    { handle: "sgtmaj_retired", name: "SGM (Ret) Jackson", followers: 178000, platform: "tiktok" },
    { handle: "navy_wife_cooks", name: "Navy Wife Cooks", followers: 89000, platform: "tiktok" },
    { handle: "tacticool_brit", name: "Tactical Brit", followers: 234000, platform: "instagram" },
    { handle: "pcs_with_pets", name: "PCS With Pets", followers: 67000, platform: "tiktok" },
    { handle: "combatflipflops", name: "Combat Flip Flops", followers: 42000, platform: "youtube" },
    { handle: "airforce_fam", name: "Air Force Family", followers: 78000, platform: "instagram" },
    { handle: "davebrayusa", name: "DAVE BRAY USA", followers: 89000, platform: "youtube" },
    { handle: "mil_tech_review", name: "Military Tech Review", followers: 145000, platform: "youtube" },
    { handle: "fitness_vet", name: "Fitness Vet", followers: 92000, platform: "tiktok" },
    { handle: "veteran_mom", name: "Veteran Mom Life", followers: 34000, platform: "instagram" },
  ];

  // USAA mentions
  const usaaMentions = [
    { creator: creators[0], caption: "Just renewed my auto insurance with @USAA — 15 years and counting. Best rates for military families hands down. #USAA #MilitaryFamily", sentiment: "positive", score: 0.92, days: 1 },
    { creator: creators[1], caption: "USAA just sent me the nicest care package for Military Appreciation Month. Love a brand that actually walks the walk. #USAAProud", sentiment: "positive", score: 0.95, days: 2 },
    { creator: creators[2], caption: "POV: You find out USAA covers PCS damage claims in full. Game changer for military moves. #USAA #PCSseason", sentiment: "positive", score: 0.88, days: 3, platform: "tiktok" },
    { creator: creators[3], caption: "Partnered with USAA to talk about financial readiness before deployment. So important for service members and families. #ad #USAAPartner", sentiment: "positive", score: 0.85, sponsored: true, days: 4 },
    { creator: creators[4], caption: "Honest review: USAA's mobile app update is clean. Deposit checks, track investments, file claims — all in one. #MilitaryFinance", sentiment: "positive", score: 0.80, days: 5 },
    { creator: creators[5], caption: "Tried switching from USAA to save money. Came right back after 3 months. Nobody understands military life like they do. #USAA", sentiment: "positive", score: 0.90, days: 6, platform: "tiktok" },
    { creator: creators[6], caption: "USAA customer service had me on hold for 45 minutes today. Not the experience I expected. Still love the coverage though. #USAA", sentiment: "mixed", score: 0.45, days: 8 },
    { creator: creators[7], caption: "USAA sponsoring events at Fort Liberty this weekend. Great to see them engaging with the community on the ground. #USAAProud", sentiment: "positive", score: 0.82, days: 10 },
    { creator: creators[8], caption: "Real talk: USAA auto rates went up 20% this year. Anyone else seeing this? Still competitive but man. #MilitaryFinance", sentiment: "negative", score: 0.30, days: 12, platform: "tiktok" },
    { creator: creators[9], caption: "USAA just became our title sponsor for the Veterans Day 5K. Huge support for the cause. Full video on the channel. #USAA", sentiment: "positive", score: 0.93, days: 14, platform: "youtube" },
    { creator: creators[10], caption: "Teaching my kids about saving with USAA's youth savings account. Love that it starts the financial literacy early. #MilitaryFamily #USAA", sentiment: "positive", score: 0.87, days: 16 },
    { creator: creators[11], caption: "Performing at the USAA Military Appreciation concert this Saturday! Free admission for all active duty and vets. #USAAProud", sentiment: "positive", score: 0.91, days: 18, platform: "youtube" },
    { creator: creators[12], caption: "Reviewing USAA's new home security bundle. Decent pricing, integrates with the app. Worth it? Full breakdown in the video. #USAA", sentiment: "neutral", score: 0.55, days: 20, platform: "youtube" },
    { creator: creators[13], caption: "Shoutout to USAA for sponsoring the military fitness challenge this year. Prizes, community, purpose. #USAAProud #VetFit", sentiment: "positive", score: 0.88, days: 22, platform: "tiktok" },
    { creator: creators[14], caption: "USAA's scholarship program helped me finish my degree post-service. Grateful doesn't even cover it. #USAA #VeteranEducation", sentiment: "positive", score: 0.96, days: 25 },
    { creator: creators[0], caption: "USAA banking app crashed during bill pay. Third time this month. Fix your servers please. #USAA", sentiment: "negative", score: 0.20, days: 27 },
    { creator: creators[3], caption: "USAA just announced expanded mental health resources for veterans. This is the kind of support our community needs. #USAAProud", sentiment: "positive", score: 0.94, days: 28 },
  ];

  // VetTix mentions
  const vettixMentions = [
    { creator: creators[0], caption: "Got free NFL tickets through @VetTix last night! Amazing seats. Thank you for honoring our service. #VetTix #VeteranPerks", sentiment: "positive", score: 0.95, days: 1 },
    { creator: creators[2], caption: "VetTix just dropped Taylor Swift tickets for veterans. I'm not crying, you're crying. Apply NOW. #VetTix #VeteranTickets", sentiment: "positive", score: 0.93, days: 3, platform: "tiktok" },
    { creator: creators[4], caption: "Monthly VetTix haul: 2 Commanders games, a comedy show, and monster trucks. All free. Sign up if you haven't. #VetTix", sentiment: "positive", score: 0.90, days: 5 },
    { creator: creators[5], caption: "Took my whole family to Disney on Ice through #VetTix. The kids' faces were worth everything. #VeteranTickets", sentiment: "positive", score: 0.97, days: 7, platform: "tiktok" },
    { creator: creators[7], caption: "VetTix doesn't get enough credit. They've given out over 15 million tickets to veterans. That's insane. #VetTixEvents", sentiment: "positive", score: 0.88, days: 9 },
    { creator: creators[8], caption: "Applied for 12 events on VetTix this month. Got selected for 2. Wish the odds were better but still grateful. #VetTix", sentiment: "neutral", score: 0.50, days: 11, platform: "tiktok" },
    { creator: creators[10], caption: "VetTix + Air Force birthday weekend = perfect combo. Taking the whole squadron out tonight. #VetTix #USAF", sentiment: "positive", score: 0.89, days: 13 },
    { creator: creators[11], caption: "Honored to partner with VetTix to give away 100 concert tickets to veterans this month. Link in bio. #VetTix #ad", sentiment: "positive", score: 0.86, sponsored: true, days: 15, platform: "youtube" },
    { creator: creators[12], caption: "Reviewing the VetTix verification process. Quick, painless, and you get access to incredible events. Worth the 5 minutes. #VetTix", sentiment: "positive", score: 0.82, days: 17, platform: "youtube" },
    { creator: creators[13], caption: "VetTix literally changed my weekends. From sitting at home to front row at NBA games. #VeteranTickets #VetTix", sentiment: "positive", score: 0.94, days: 19, platform: "tiktok" },
    { creator: creators[14], caption: "VetTix date night with the hubby. Hamilton tickets. For FREE. I love being a mil spouse sometimes. #VetTix", sentiment: "positive", score: 0.96, days: 22 },
    { creator: creators[1], caption: "PSA: VetTix is NOT just for combat vets. Any honorably discharged veteran qualifies. Stop gatekeeping. #VetTix #AllVeterans", sentiment: "neutral", score: 0.55, days: 24 },
    { creator: creators[3], caption: "VetTix Super Bowl lottery is open. Chances are slim but you miss 100% of the shots you don't take. #VetTix", sentiment: "positive", score: 0.78, days: 26 },
    { creator: creators[6], caption: "Kids' first NHL game courtesy of VetTix. Making memories that cost nothing but meant everything. #VetTix #MilFam", sentiment: "positive", score: 0.95, days: 28 },
    { creator: creators[9], caption: "VetTix just expanded to include Gold Star families. This is how you honor sacrifice. Incredible move. #VetTix", sentiment: "positive", score: 0.97, days: 29, platform: "youtube" },
  ];

  // Grunt Style mentions
  const gruntMentions = [
    { creator: creators[0], caption: "New Grunt Style drop just hit. This flag tee is clean. Link in bio. #GruntStyle #ThisWeDefend", sentiment: "positive", score: 0.88, days: 1 },
    { creator: creators[2], caption: "POV: Your entire wardrobe is Grunt Style and you're not sorry about it. #GruntLife #GruntStyle", sentiment: "positive", score: 0.85, days: 2, platform: "tiktok" },
    { creator: creators[3], caption: "Partnered with @GruntStyle for their Veterans Day collection. 10% of proceeds go to veteran nonprofits. #ad #GruntStyle", sentiment: "positive", score: 0.90, sponsored: true, days: 4 },
    { creator: creators[4], caption: "Grunt Style workout gear review: Squat tested, deployment approved. These shorts can HANDLE IT. #GruntStyle #VetFit", sentiment: "positive", score: 0.83, days: 6 },
    { creator: creators[5], caption: "Grunt Style's new 'Freedom' hoodie is my entire personality right now. Sorry not sorry. #GruntLife #ThisWeDefend", sentiment: "positive", score: 0.82, days: 8, platform: "tiktok" },
    { creator: creators[7], caption: "Ordered a Grunt Style shirt. Arrived in 2 days with a handwritten thank you note. The little things matter. #GruntStyle", sentiment: "positive", score: 0.91, days: 10 },
    { creator: creators[8], caption: "Grunt Style quality has gone down since they changed manufacturers. My last 3 shirts shrank after one wash. #GruntStyle", sentiment: "negative", score: 0.25, days: 12, platform: "tiktok" },
    { creator: creators[9], caption: "Grunt Style sent the team new gear for our veterans charity run. Love brands that support the mission. #GruntStyle #ThisWeDefend", sentiment: "positive", score: 0.92, days: 14, platform: "youtube" },
    { creator: creators[10], caption: "Matching Grunt Style tees for the whole Air Force family. Ready for the 4th of July parade! #GruntStyle #MilFam", sentiment: "positive", score: 0.87, days: 16 },
    { creator: creators[11], caption: "Wearing my Grunt Style on stage tonight at Fort Bragg. If you know, you know. #GruntLife #ThisWeDefend", sentiment: "positive", score: 0.84, days: 18, platform: "youtube" },
    { creator: creators[12], caption: "Grunt Style vs. Nine Line Apparel — full comparison video. Which military brand wins? #GruntStyle #MilGear", sentiment: "neutral", score: 0.50, days: 20, platform: "youtube" },
    { creator: creators[13], caption: "Grunt Style ambassador program is legit. Good commission, great community, real support for vets. #GruntStyle #VetBusiness", sentiment: "positive", score: 0.86, days: 22, platform: "tiktok" },
    { creator: creators[14], caption: "Hubby got me a Grunt Style 'Army Wife' shirt and honestly it's my favorite thing I own. #GruntStyle #MilSpouse", sentiment: "positive", score: 0.89, days: 24 },
    { creator: creators[1], caption: "Grunt Style's veteran hiring program is something more companies should copy. Real jobs, not just talk. #GruntStyle #VetEmployment", sentiment: "positive", score: 0.93, days: 26 },
    { creator: creators[6], caption: "Made my Grunt Style meal prep video wearing the new apron. It's tactical cooking at its finest. #GruntStyle #GruntLife", sentiment: "positive", score: 0.81, days: 28 },
  ];

  const allDemoMentions = [];

  function buildMentions(mentionList, brandName) {
    const mId = monitorMap[brandName];
    if (!mId) return;
    for (const m of mentionList) {
      allDemoMentions.push({
        monitor_id: mId,
        creator_handle: m.creator.handle,
        creator_name: m.creator.name,
        creator_avatar: null,
        platform: m.platform || m.creator.platform,
        post_url: null,
        post_thumbnail: null,
        caption_snippet: m.caption,
        matched_keywords: [brandName.toLowerCase()],
        sentiment: m.sentiment,
        sentiment_score: m.score,
        is_sponsored: m.sponsored || false,
        sponsorship_signals: m.sponsored ? ["#ad", "Partnered with"] : [],
        themes: ["military", "veteran community"],
        brand_context: `Creator mentions ${brandName} in the context of military/veteran lifestyle.`,
        engagement_likes: Math.floor(Math.random() * 10000) + 500,
        engagement_comments: Math.floor(Math.random() * 500) + 20,
        engagement_shares: Math.floor(Math.random() * 200) + 10,
        engagement_views: Math.floor(Math.random() * 50000) + 5000,
        creator_followers: m.creator.followers,
        estimated_reach: m.creator.followers,
        post_date: daysAgo(m.days, Math.floor(Math.random() * 12)),
        detected_at: daysAgo(m.days, Math.floor(Math.random() * 6)),
      });
    }
  }

  buildMentions(usaaMentions, "USAA");
  buildMentions(vettixMentions, "VetTix");
  buildMentions(gruntMentions, "Grunt Style");

  // Clear existing seed data for these monitors, then insert
  for (const brandName of ["USAA", "VetTix", "Grunt Style"]) {
    const mId = monitorMap[brandName];
    if (mId) {
      await supabase.from("social_mentions").delete().eq("monitor_id", mId);
      await supabase.from("monitor_runs").delete().eq("monitor_id", mId);
    }
  }

  const { error: mentionErr } = await supabase
    .from("social_mentions")
    .insert(allDemoMentions);

  if (mentionErr) {
    console.error("[seed] Mention insert error:", mentionErr.message);
    return res.status(500).json({ error: "Failed to seed mentions", detail: mentionErr.message });
  }

  // Create monitor_runs records
  const runRecords = [];
  for (const brandName of ["USAA", "VetTix", "Grunt Style"]) {
    const mId = monitorMap[brandName];
    if (!mId) continue;
    const mentionsForBrand = allDemoMentions.filter((m) => m.monitor_id === mId);
    runRecords.push({
      monitor_id: mId,
      ran_at: daysAgo(0),
      posts_found: mentionsForBrand.length,
      posts_analyzed: mentionsForBrand.length,
      credits_used: 0,
      status: "completed",
      duration_ms: 3200,
    });
  }

  await supabase.from("monitor_runs").insert(runRecords);

  return res.status(200).json({
    success: true,
    monitors_created: allMonitors.length,
    mentions_seeded: allDemoMentions.length,
    message: "Demo data seeded successfully",
  });
}
