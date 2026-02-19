#!/usr/bin/env node
/**
 * Demo Data Seeder for demo@recurrentx.com
 * Seeds realistic data across all major platform sections.
 * Run: node scripts/seed-demo.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://swposmlpipmdwocpkfwc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cG9zbWxwaXBtZHdvY3BrZndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjUyNjYsImV4cCI6MjA4MDM0MTI2Nn0.354lgZU9NPfQndeFR9-BCuI2Bkkc00FIQoudoFHK9c8";
const DEMO_EMAIL = "demo@recurrentx.com";
const DEMO_PASSWORD = "MIC2026demo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── helpers ────────────────────────────────────────────
const counts = {};

function log(label, result) {
  if (result.error) {
    console.error(`  ✗ ${label}:`, result.error.message, result.error.details || "");
    counts[label] = 0;
    return null;
  }
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  console.log(`  ✓ ${label}: ${rows.length} row(s)`);
  counts[label] = rows.length;
  return result.data;
}

// ─── authenticate (create user if needed) ───────────────
console.log("\n🔑 Signing in as demo user...");
let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
});

if (authError) {
  console.log("  → Demo user does not exist, creating...");
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    options: {
      data: { role: "brand", full_name: "Demo Account" },
    },
  });
  if (signUpError) {
    console.error("Sign-up failed:", signUpError.message);
    process.exit(1);
  }
  const retry = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (retry.error) {
    if (signUpData.session) {
      authData = signUpData;
    } else {
      console.error("Sign-in failed:", retry.error.message);
      process.exit(1);
    }
  } else {
    authData = retry.data;
  }
}

const userId = authData.user.id;
console.log(`  ✓ Authenticated — user_id: ${userId}\n`);

// Ensure profile exists with correct name
console.log("👤 Ensuring demo profile...");
const profileResult = await supabase.from("profiles").upsert(
  {
    user_id: userId,
    full_name: "MilCrunch Demo",
    updated_at: new Date().toISOString(),
  },
  { onConflict: "user_id" }
);
if (profileResult.error) {
  console.error("  ✗ Profile upsert:", profileResult.error.message);
} else {
  console.log("  ✓ Profile set: MilCrunch Demo");
}

// Also update user_metadata full_name
await supabase.auth.updateUser({ data: { full_name: "MilCrunch Demo" } });
console.log("  ✓ user_metadata updated\n");

// ─── look up existing org/brand (or use null) ──────────
console.log("🏢 Looking for existing org & brand...");

let orgId = null;
let brandId = null;

const { data: existingOrg } = await supabase
  .from("organizations")
  .select("id")
  .limit(1)
  .maybeSingle();
if (existingOrg) {
  orgId = existingOrg.id;
  console.log(`  ✓ Using org: ${orgId}`);
} else {
  console.log("  → No orgs found, events will use null org/brand");
}

if (orgId) {
  const { data: existingBrand } = await supabase
    .from("brands")
    .select("id")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle();
  if (existingBrand) {
    brandId = existingBrand.id;
    console.log(`  ✓ Using brand: ${brandId}`);
  }
}

// ═══════════════════════════════════════════════════════
// 1. EVENTS
// ═══════════════════════════════════════════════════════
console.log("\n📅 Seeding events...");

const eventBase = {
  created_by: userId,
  ...(brandId && { brand_id: brandId }),
  ...(orgId && { organization_id: orgId }),
};

const eventsPayload = [
  {
    ...eventBase,
    title: "Military Influencer Conference 2026",
    slug: "mic-2026",
    description:
      "The premier gathering of military influencers, veteran creators, and defense-adjacent brands. Three days of panels, networking, live podcasting, and brand partnerships in Tampa Bay.",
    event_type: "hybrid",
    venue: "Tampa Convention Center",
    address: "333 S Franklin St",
    city: "Tampa",
    state: "FL",
    country: "US",
    timezone: "America/New_York",
    start_date: "2026-09-23T09:00:00-04:00",
    end_date: "2026-09-25T18:00:00-04:00",
    registration_deadline: "2026-09-20T23:59:59-04:00",
    capacity: 450,
    is_published: true,
  },
  {
    ...eventBase,
    title: "Veteran Creator Summit 2026",
    slug: "vcs-2026",
    description:
      "An intimate summit for veteran content creators looking to level up their brand, master monetization, and connect with sponsors who get it.",
    event_type: "live",
    venue: "JW Marriott Austin",
    address: "110 E 2nd St",
    city: "Austin",
    state: "TX",
    country: "US",
    timezone: "America/Chicago",
    start_date: "2026-06-12T09:00:00-05:00",
    end_date: "2026-06-14T17:00:00-05:00",
    registration_deadline: "2026-06-10T23:59:59-05:00",
    capacity: 200,
    is_published: true,
  },
  {
    ...eventBase,
    title: "MIC 2025",
    slug: "mic-2025",
    description:
      "The inaugural Military Influencer Conference brought together 380 attendees across three days of panels, live shows, and partnership signings.",
    event_type: "live",
    venue: "San Diego Convention Center",
    address: "111 W Harbor Dr",
    city: "San Diego",
    state: "CA",
    country: "US",
    timezone: "America/Los_Angeles",
    start_date: "2025-09-18T09:00:00-07:00",
    end_date: "2025-09-20T18:00:00-07:00",
    capacity: 380,
    is_published: true,
  },
];

const eventsResult = await supabase.from("events").insert(eventsPayload).select();
const events = log("Events", eventsResult);
if (!events) process.exit(1);

const mic2026 = events.find((e) => e.slug === "mic-2026");
const vcs2026 = events.find((e) => e.slug === "vcs-2026");
const mic2025 = events.find((e) => e.slug === "mic-2025");

// ═══════════════════════════════════════════════════════
// 2. EVENT TICKETS + REGISTRATIONS (15 attendees for MIC 2026)
// ═══════════════════════════════════════════════════════
console.log("\n🎟️  Seeding tickets & registrations...");

const ticketsPayload = [
  { event_id: mic2026.id, name: "VIP", description: "Front-row seating, VIP lounge, swag bag, after-party access", price: 299, quantity: 50, sold: 12, is_active: true, sort_order: 0 },
  { event_id: mic2026.id, name: "General Admission", description: "Full event access, all panels and networking sessions", price: 149, quantity: 350, sold: 45, is_active: true, sort_order: 1 },
  { event_id: mic2026.id, name: "Press / Media", description: "Media credentials, press room access, interview slots", price: 0, quantity: 30, sold: 8, is_active: true, sort_order: 2 },
  { event_id: mic2026.id, name: "Creator Pass", description: "For registered military creators — includes creator lounge", price: 99, quantity: 100, sold: 22, is_active: true, sort_order: 3 },
];

const ticketsResult = await supabase.from("event_tickets").insert(ticketsPayload).select();
const tickets = log("Event tickets", ticketsResult);

const vipTicket = tickets?.find((t) => t.name === "VIP");
const gaTicket = tickets?.find((t) => t.name === "General Admission");
const pressTicket = tickets?.find((t) => t.name === "Press / Media");
const creatorTicket = tickets?.find((t) => t.name === "Creator Pass");

const attendees = [
  { first_name: "Marcus", last_name: "Williams", email: "marcus.williams@gmail.com", company: "VetMedia Group", title: "CEO & Founder", military_branch: "Army", military_status: "Veteran", ticket_id: vipTicket?.id },
  { first_name: "Sarah", last_name: "Chen", email: "sarah.chen@outlook.com", company: "MilSpouse Collective", title: "Content Director", military_branch: "Navy", military_status: "Spouse", ticket_id: vipTicket?.id },
  { first_name: "James", last_name: "Rodriguez", email: "jrodriguez88@gmail.com", company: "Raider Media", title: "Host & Producer", military_branch: "Marines", military_status: "Veteran", ticket_id: vipTicket?.id },
  { first_name: "Devon", last_name: "Jackson", email: "devon.j@icloud.com", company: "Task & Purpose", title: "Senior Editor", military_branch: "Army", military_status: "Active Duty", ticket_id: pressTicket?.id },
  { first_name: "Amanda", last_name: "Foster", email: "afoster.mil@gmail.com", company: "Vet Creator Network", title: "Podcast Host", military_branch: "Air Force", military_status: "Veteran", ticket_id: gaTicket?.id },
  { first_name: "Tyler", last_name: "Brooks", email: "tbrooks@veteranmedia.co", company: "Veteran Media Co", title: "Videographer", military_branch: "Navy", military_status: "Veteran", ticket_id: gaTicket?.id },
  { first_name: "Keisha", last_name: "Thompson", email: "keisha.t@gmail.com", company: "GI Jill Podcast", title: "Host", military_branch: "Army", military_status: "Veteran", ticket_id: creatorTicket?.id },
  { first_name: "Ryan", last_name: "O'Brien", email: "robrien@msn.com", company: "Freelance", title: "Military Photographer", military_branch: "Coast Guard", military_status: "Veteran", ticket_id: gaTicket?.id },
  { first_name: "Maria", last_name: "Gonzalez", email: "mgonzalez@armywife.com", company: "Army Wife Network", title: "Community Manager", military_branch: "Army", military_status: "Spouse", ticket_id: gaTicket?.id },
  { first_name: "Daniel", last_name: "Kim", email: "dkim.vet@gmail.com", company: "VetTech Podcast", title: "Co-Host & Engineer", military_branch: "Air Force", military_status: "Veteran", ticket_id: creatorTicket?.id },
  { first_name: "Brittany", last_name: "Hayes", email: "bhayes@militaryone.com", company: "MilitaryOneClick", title: "Brand Partnerships", military_branch: null, military_status: "Spouse", ticket_id: gaTicket?.id },
  { first_name: "Chris", last_name: "Nguyen", email: "chris.nguyen.usmc@gmail.com", company: "Terminal Lance", title: "Illustrator & Creator", military_branch: "Marines", military_status: "Veteran", ticket_id: creatorTicket?.id },
  { first_name: "Jasmine", last_name: "Patel", email: "jpatel.press@reuters.com", company: "Reuters Defense", title: "Correspondent", military_branch: null, military_status: null, ticket_id: pressTicket?.id },
  { first_name: "Eric", last_name: "Morrison", email: "emorrison@gmail.com", company: "SOF Media", title: "Director of Content", military_branch: "Army", military_status: "Veteran", ticket_id: vipTicket?.id },
  { first_name: "Stephanie", last_name: "Cruz", email: "scruz@navywife.org", company: "Navy Spouse Support", title: "Executive Director", military_branch: "Navy", military_status: "Spouse", ticket_id: gaTicket?.id },
];

const regsPayload = attendees.map((a) => ({ event_id: mic2026.id, ...a }));
const regsResult = await supabase.from("event_registrations").insert(regsPayload).select();
log("Registrations", regsResult);

// ═══════════════════════════════════════════════════════
// 3. SPONSORS (event_sponsors + global sponsors)
// ═══════════════════════════════════════════════════════
console.log("\n💰 Seeding sponsors...");

const eventSponsorsPayload = [
  { event_id: mic2026.id, sponsor_name: "USAA", tier: "platinum", description: "Official financial services partner of MIC 2026. Proud supporter of military families.", website_url: "https://www.usaa.com", sort_order: 0 },
  { event_id: mic2026.id, sponsor_name: "Hibbett Sports", tier: "gold", description: "Outfitting military athletes and creators with the latest gear.", website_url: "https://www.hibbett.com", sort_order: 1 },
  { event_id: mic2026.id, sponsor_name: "AAFES", tier: "gold", description: "The Exchange — proudly serving those who serve since 1895.", website_url: "https://www.shopmyexchange.com", sort_order: 2 },
  { event_id: mic2026.id, sponsor_name: "Black Rifle Coffee Company", tier: "silver", description: "Premium coffee roasted by veterans, for everyone. Fueling the MIC creator lounge.", website_url: "https://www.blackriflecoffee.com", sort_order: 3 },
  { event_id: mic2026.id, sponsor_name: "Grunt Style", tier: "silver", description: "Patriotic apparel brand. Official merch partner for MIC 2026.", website_url: "https://www.gruntstyle.com", sort_order: 4 },
];

const eventSponsorsResult = await supabase.from("event_sponsors").insert(eventSponsorsPayload).select();
log("Event sponsors", eventSponsorsResult);

const globalSponsorsPayload = [
  { name: "USAA", website: "https://www.usaa.com", contact_name: "Rachel Mitchell", contact_email: "partnerships@usaa.com", contact_phone: "(210) 555-0142", industries: ["Financial Services", "Insurance"], notes: "Platinum sponsor MIC 2026 — $25,000 commitment" },
  { name: "Hibbett Sports", website: "https://www.hibbett.com", contact_name: "Jake Turner", contact_email: "sponsorships@hibbett.com", contact_phone: "(205) 555-0198", industries: ["Retail", "Sports & Outdoors"], notes: "Gold sponsor MIC 2026 — $15,000 commitment" },
  { name: "AAFES (The Exchange)", website: "https://www.shopmyexchange.com", contact_name: "Col. David Park (Ret.)", contact_email: "community@aafes.com", contact_phone: "(214) 555-0177", industries: ["Retail", "Government Services"], notes: "Gold sponsor MIC 2026 — $15,000 commitment" },
  { name: "Black Rifle Coffee Company", website: "https://www.blackriflecoffee.com", contact_name: "Tom Nguyen", contact_email: "events@blackriflecoffee.com", contact_phone: "(801) 555-0133", industries: ["Food & Beverage", "Veteran-Owned"], notes: "Silver sponsor MIC 2026 — $8,000 commitment. Providing creator lounge coffee." },
  { name: "Grunt Style", website: "https://www.gruntstyle.com", contact_name: "Lisa Hernandez", contact_email: "partnerships@gruntstyle.com", contact_phone: "(210) 555-0166", industries: ["Apparel", "Veteran-Owned"], notes: "Silver sponsor MIC 2026 — $8,000 commitment. Official merch partner." },
];

const globalSponsorsResult = await supabase.from("sponsors").insert(globalSponsorsPayload).select();
log("Global sponsors", globalSponsorsResult);

// ═══════════════════════════════════════════════════════
// 4. 365 INSIGHTS (event_engagement_metrics — 12 months)
// ═══════════════════════════════════════════════════════
console.log("\n📊 Seeding 365 insights metrics...");

const metricsPayload = [];
for (let m = 0; m < 12; m++) {
  const year = m < 10 ? 2025 : 2026;
  const month = ((m + 3) % 12) || 12;
  const monthStr = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const periodStart = `${year}-${monthStr}-01`;
  const periodEnd = `${year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const growthMultiplier = 1 + m * 0.08 + Math.random() * 0.05;

  metricsPayload.push(
    {
      event_id: mic2026.id,
      metric_type: "sponsor_impressions",
      period_start: periodStart,
      period_end: periodEnd,
      value: Math.round(45000 * growthMultiplier),
      metadata: { platform_breakdown: { instagram: 42, tiktok: 31, youtube: 18, twitter: 9 } },
    },
    {
      event_id: mic2026.id,
      metric_type: "community_growth",
      period_start: periodStart,
      period_end: periodEnd,
      value: Math.round(1200 * growthMultiplier),
      metadata: { new_followers: Math.round(800 * growthMultiplier), churned: Math.round(120 + Math.random() * 40) },
    },
    {
      event_id: mic2026.id,
      metric_type: "creator_engagement",
      period_start: periodStart,
      period_end: periodEnd,
      value: parseFloat((3.2 + m * 0.15 + Math.random() * 0.3).toFixed(2)),
      metadata: { likes: Math.round(12000 * growthMultiplier), comments: Math.round(2400 * growthMultiplier), shares: Math.round(890 * growthMultiplier) },
    },
    {
      event_id: mic2026.id,
      metric_type: "content_performance",
      period_start: periodStart,
      period_end: periodEnd,
      value: Math.round(28000 * growthMultiplier),
      metadata: { posts_published: Math.round(35 + m * 2), avg_reach: Math.round(8000 * growthMultiplier), top_post_reach: Math.round(22000 * growthMultiplier) },
    },
    {
      event_id: mic2026.id,
      metric_type: "revenue_attribution",
      period_start: periodStart,
      period_end: periodEnd,
      value: parseFloat((4200 * growthMultiplier).toFixed(2)),
      metadata: { sponsorship: Math.round(2800 * growthMultiplier), ticket_sales: Math.round(900 * growthMultiplier), merch: Math.round(500 * growthMultiplier) },
    }
  );
}

const metricsResult = await supabase.from("event_engagement_metrics").insert(metricsPayload).select();
log("365 Insights metrics", metricsResult);

// ═══════════════════════════════════════════════════════
// 5. EMAIL CAMPAIGNS (3 campaigns)
// ═══════════════════════════════════════════════════════
console.log("\n✉️  Seeding email campaigns...");

const emailCampaignsPayload = [
  {
    name: "MIC 2026 Announcement",
    subject: "Military Influencer Conference 2026 — Early Bird Tickets Live",
    preview_text: "Tampa, FL | Sep 23-25 | Be part of the biggest military creator event of the year",
    from_name: "MilCrunch Events",
    from_email: "events@milcrunch.com",
    html_content: "<h1>MIC 2026 is here.</h1><p>Join 450+ military creators, brands, and media in Tampa Bay.</p>",
    status: "sent",
    sent_at: "2026-01-15T10:00:00Z",
    stats: JSON.stringify({ sent: 2400, delivered: 2352, opened: 1008, clicked: 312, unsubscribed: 4 }),
  },
  {
    name: "Sponsor Prospectus Q1",
    subject: "Partner with MIC 2026 — Sponsorship Packages Now Available",
    preview_text: "Reach 50,000+ military-connected consumers through our creator network",
    from_name: "MilCrunch Partnerships",
    from_email: "partnerships@milcrunch.com",
    html_content: "<h1>Become a MIC 2026 Sponsor</h1><p>Platinum, Gold, and Silver tiers available.</p>",
    status: "sent",
    sent_at: "2026-01-22T14:00:00Z",
    stats: JSON.stringify({ sent: 180, delivered: 176, opened: 68, clicked: 24, unsubscribed: 1 }),
  },
  {
    name: "Creator Newsletter Feb",
    subject: "February Creator Roundup — New Features, Events & Collabs",
    preview_text: "Bio pages are live, plus 3 brand partnership opportunities this month",
    from_name: "MilCrunch",
    from_email: "creators@milcrunch.com",
    html_content: "<h1>Creator Update</h1><p>Your February roundup is here.</p>",
    status: "sent",
    sent_at: "2026-02-03T09:00:00Z",
    stats: JSON.stringify({ sent: 1800, delivered: 1764, opened: 630, clicked: 198, unsubscribed: 6 }),
  },
];

const emailResult = await supabase.from("email_campaigns").insert(emailCampaignsPayload).select();
log("Email campaigns", emailResult);

// ═══════════════════════════════════════════════════════
// 6. PODCAST + EPISODES (1 show, 5 episodes)
// ═══════════════════════════════════════════════════════
console.log("\n🎙️  Seeding podcast & episodes...");

const podcastPayload = {
  feed_url: "https://feeds.milcrunch.com/command-post",
  title: "The Command Post",
  description:
    "The official MilCrunch podcast. Conversations with military creators, veteran entrepreneurs, and the brands that back them.",
  author: "MilCrunch Media",
  artwork_url: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600",
  website_url: "https://milcrunch.com/podcasts",
  category: "Society & Culture",
  language: "en",
  episode_count: 5,
  last_episode_date: "2026-02-10T06:00:00Z",
  status: "active",
};

const podcastResult = await supabase.from("podcasts").insert(podcastPayload).select().single();
const podcastLogged = log("Podcast show", { data: podcastResult.data ? [podcastResult.data] : null, error: podcastResult.error });

let episodeCount = 0;
if (podcastResult.data) {
  const podId = podcastResult.data.id;
  const episodesPayload = [
    {
      podcast_id: podId,
      title: "From Barracks to Brand Deals — How Military Creators Are Rewriting the Playbook",
      description: "We sit down with three veteran creators pulling six figures from brand partnerships. They break down exactly how they pitch, negotiate, and deliver for sponsors.",
      audio_url: "https://feeds.milcrunch.com/command-post/ep5.mp3",
      duration: "48:32",
      published_at: "2026-02-10T06:00:00Z",
    },
    {
      podcast_id: podId,
      title: "Inside MIC 2025 — Lessons from Our First Military Creator Conference",
      description: "Andrew Appleton and Paul Majano break down what went right, what went sideways, and what we're changing for MIC 2026 in Tampa.",
      audio_url: "https://feeds.milcrunch.com/command-post/ep4.mp3",
      duration: "52:18",
      published_at: "2026-01-27T06:00:00Z",
    },
    {
      podcast_id: podId,
      title: "The Spouse Creator Economy — Why Military Spouses Are the Most Undervalued Influencers",
      description: "Military spouses have massive audiences and zero recognition from brands. Three MilSpouse creators share their frustrations and breakthroughs.",
      audio_url: "https://feeds.milcrunch.com/command-post/ep3.mp3",
      duration: "41:05",
      published_at: "2026-01-13T06:00:00Z",
    },
    {
      podcast_id: podId,
      title: "USAA x MilCrunch — What Real Military Sponsorship Looks Like",
      description: "Rachel Mitchell from USAA talks about why they're doubling down on creator partnerships and how MIC 2026 fits their strategy.",
      audio_url: "https://feeds.milcrunch.com/command-post/ep2.mp3",
      duration: "37:44",
      published_at: "2025-12-16T06:00:00Z",
    },
    {
      podcast_id: podId,
      title: "Pilot Episode — Why We Built MilCrunch",
      description: "Andrew Appleton explains the gap in the military creator space and why MilCrunch exists. Plus, a preview of what's coming in 2026.",
      audio_url: "https://feeds.milcrunch.com/command-post/ep1.mp3",
      duration: "29:15",
      published_at: "2025-12-02T06:00:00Z",
    },
  ];

  const episodesResult = await supabase.from("podcast_episodes").insert(episodesPayload).select();
  log("Podcast episodes", episodesResult);
  episodeCount = episodesResult.data?.length ?? 0;
}

// ═══════════════════════════════════════════════════════
// 7. EVENT AGENDA (sample schedule for MIC 2026)
// ═══════════════════════════════════════════════════════
console.log("\n🗓️  Seeding event agenda...");

const agendaPayload = [
  { event_id: mic2026.id, day_number: 1, start_time: "09:00", end_time: "09:30", title: "Registration & Check-In", description: "Pick up your badge, swag bag, and grab coffee.", location_room: "Main Lobby", session_type: "breakout", sort_order: 0 },
  { event_id: mic2026.id, day_number: 1, start_time: "09:30", end_time: "10:30", title: "Opening Keynote — The State of Military Creator Economy", description: "Andrew Appleton sets the stage for MIC 2026.", location_room: "Main Stage", session_type: "keynote", sort_order: 1 },
  { event_id: mic2026.id, day_number: 1, start_time: "11:00", end_time: "12:00", title: "Panel: From Service to Social — Building Your Creator Brand", description: "Four veteran creators share how they transitioned from uniform to content.", location_room: "Main Stage", session_type: "breakout", sort_order: 2 },
  { event_id: mic2026.id, day_number: 1, start_time: "14:00", end_time: "15:00", title: "Workshop: Pitch Perfect — Landing Brand Deals", description: "Hands-on session on media kits, rate cards, and outreach templates.", location_room: "Room 201", session_type: "breakout", sort_order: 3 },
  { event_id: mic2026.id, day_number: 1, start_time: "19:00", end_time: "22:00", title: "VIP Welcome Reception", description: "Rooftop networking with sponsors, speakers, and VIP badge holders.", location_room: "Rooftop Terrace", session_type: "breakout", sort_order: 4 },
  { event_id: mic2026.id, day_number: 2, start_time: "09:00", end_time: "10:00", title: "Keynote: USAA — Investing in Military Community", description: "USAA's head of partnerships on why military creators matter.", location_room: "Main Stage", session_type: "keynote", sort_order: 5 },
  { event_id: mic2026.id, day_number: 2, start_time: "10:30", end_time: "11:30", title: "Panel: The MilSpouse Creator Advantage", description: "Military spouses are an untapped force in influencer marketing.", location_room: "Main Stage", session_type: "breakout", sort_order: 6 },
  { event_id: mic2026.id, day_number: 2, start_time: "13:00", end_time: "14:00", title: "Live Podcast Recording — The Command Post", description: "Watch the MilCrunch podcast record live with surprise guests.", location_room: "Podcast Stage", session_type: "breakout", sort_order: 7 },
  { event_id: mic2026.id, day_number: 2, start_time: "15:00", end_time: "16:30", title: "Sponsor Speed Dating", description: "Creators get 5-minute one-on-ones with brand reps.", location_room: "Expo Hall", session_type: "breakout", sort_order: 8 },
  { event_id: mic2026.id, day_number: 3, start_time: "09:00", end_time: "10:00", title: "Masterclass: Short-Form Video for Military Storytelling", description: "TikTok and Reels strategies for military narratives.", location_room: "Room 201", session_type: "breakout", sort_order: 9 },
  { event_id: mic2026.id, day_number: 3, start_time: "11:00", end_time: "12:00", title: "Closing Keynote — What's Next for MilCrunch", description: "Product roadmap reveal, community announcements, MIC 2027 teaser.", location_room: "Main Stage", session_type: "keynote", sort_order: 10 },
];

const agendaResult = await supabase.from("event_agenda").insert(agendaPayload).select();
log("Agenda items", agendaResult);

// ═══════════════════════════════════════════════════════
// 8. EVENT SPEAKERS
// ═══════════════════════════════════════════════════════
console.log("\n🎤 Seeding speakers...");

const speakersPayload = [
  { event_id: mic2026.id, creator_name: "Andrew Appleton", role: "host", topic: "Opening & Closing Keynotes", bio: "Founder of MilCrunch. Building the operating system for military events and creator communities.", confirmed: true, sort_order: 0 },
  { event_id: mic2026.id, creator_name: "Rachel Mitchell", role: "presenter", topic: "USAA Keynote — Investing in Military Community", bio: "Head of Community Partnerships at USAA. 12 years driving military-focused brand strategy.", confirmed: true, sort_order: 1 },
  { event_id: mic2026.id, creator_name: "Marcus Williams", creator_handle: "marcuswilliams", role: "panelist", topic: "From Service to Social", bio: "Army veteran, CEO of VetMedia Group. 240K followers across platforms.", confirmed: true, sort_order: 2 },
  { event_id: mic2026.id, creator_name: "Keisha Thompson", creator_handle: "keishathompson", role: "panelist", topic: "The MilSpouse Creator Advantage", bio: "Host of GI Jill Podcast. Army veteran and advocate for military family creators.", confirmed: true, sort_order: 3 },
  { event_id: mic2026.id, creator_name: "Paul Majano", role: "presenter", topic: "Board Vision — MilCrunch 2027 and Beyond", bio: "Board Chairman of MilCrunch. Serial entrepreneur and military community strategist.", confirmed: true, sort_order: 4 },
];

const speakersResult = await supabase.from("event_speakers").insert(speakersPayload).select();
log("Speakers", speakersResult);

// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════");
console.log("  DEMO SEED COMPLETE");
console.log("═══════════════════════════════════════");
console.log(`  User:            ${DEMO_EMAIL} (${userId})`);
console.log(`  Events:          ${counts["Events"] ?? 0}`);
console.log(`  Event tickets:   ${counts["Event tickets"] ?? 0}`);
console.log(`  Registrations:   ${counts["Registrations"] ?? 0}`);
console.log(`  Event sponsors:  ${counts["Event sponsors"] ?? 0}`);
console.log(`  Global sponsors: ${counts["Global sponsors"] ?? 0}`);
console.log(`  365 Metrics:     ${counts["365 Insights metrics"] ?? 0}`);
console.log(`  Email campaigns: ${counts["Email campaigns"] ?? 0}`);
console.log(`  Podcast show:    ${counts["Podcast show"] ?? 0}`);
console.log(`  Podcast episodes:${counts["Podcast episodes"] ?? 0}`);
console.log(`  Agenda items:    ${counts["Agenda items"] ?? 0}`);
console.log(`  Speakers:        ${counts["Speakers"] ?? 0}`);
console.log("═══════════════════════════════════════\n");

await supabase.auth.signOut();
