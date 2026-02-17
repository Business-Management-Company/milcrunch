import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load env
const envText = readFileSync(new URL("../.env", import.meta.url), "utf-8");
const env = Object.fromEntries(
  envText.split("\n").filter((l) => l && !l.startsWith("#")).map((l) => {
    const [k, ...v] = l.split("=");
    return [k.trim(), v.join("=").trim()];
  })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function main() {
  // Step 1: Find ALL events
  console.log("Looking for events...");
  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id, title, slug, start_date, end_date")
    .order("created_at", { ascending: false })
    .limit(20);

  if (evErr) {
    console.error("Error querying events:", evErr.message);
    process.exit(1);
  }

  if (!events || events.length === 0) {
    console.log("No events found. Please create a MIC 2026 event in the admin dashboard first.");
    process.exit(1);
  }

  console.log("\nFound events:");
  events.forEach((e) => {
    console.log(`  - ${e.title} (id: ${e.id}, slug: ${e.slug || "none"}, dates: ${e.start_date || "none"} to ${e.end_date || "none"})`);
  });

  // Find MIC event or use first event
  let event = events.find((e) =>
    e.title?.toLowerCase().includes("military influencer") ||
    e.title?.toLowerCase().includes("mic") ||
    e.slug === "mic-2026"
  );

  if (!event) {
    event = events[0];
    console.log(`\nNo MIC event found, using: ${event.title}`);
  } else {
    console.log(`\nUsing MIC event: ${event.title}`);
  }

  const eventId = event.id;

  // Set slug if not set
  if (!event.slug) {
    const { error: slugErr } = await supabase.from("events").update({ slug: "mic-2026" }).eq("id", eventId);
    if (slugErr) {
      console.log("Could not set slug (RLS). The event can still be accessed by ID.");
    } else {
      console.log("Set slug to mic-2026");
    }
  }

  // Step 2: Clear existing agenda for this event
  console.log("\nClearing existing agenda...");
  const { error: delErr } = await supabase.from("event_agenda").delete().eq("event_id", eventId);
  if (delErr) {
    console.log("Note: Could not clear agenda:", delErr.message);
  }

  // Step 3: Insert sessions
  console.log("Inserting MIC 2026 agenda...");

  const sessions = [
    // ===== DAY 1 =====
    { day: 1, start: "08:00", end: "09:00", title: "Registration & Breakfast", type: "meal", room: "Grand Foyer", order: 1 },
    { day: 1, start: "09:00", end: "09:15", title: "Opening Ceremony", type: "ceremony", room: "Main Stage", order: 2, featured: true, desc: "Welcome to MIC 2026! Opening remarks and color guard presentation." },
    { day: 1, start: "09:15", end: "10:15", title: 'Opening Keynote: "The Future of Military Content"', type: "keynote", room: "Main Stage", order: 3, featured: true, desc: "Explore how military creators are shaping narratives and building communities in the digital age." },
    { day: 1, start: "10:15", end: "10:30", title: "Break", type: "break", room: "Grand Foyer", order: 4 },
    { day: 1, start: "10:30", end: "11:30", title: 'Panel: "Building Your Brand After Service"', type: "panel", room: "Main Stage", order: 5, desc: "Veterans share how they transitioned from military service to becoming successful content creators." },
    { day: 1, start: "10:30", end: "11:30", title: 'Workshop: "TikTok for Military Creators"', type: "workshop", room: "Breakout Room A", order: 6, desc: "Hands-on workshop covering TikTok algorithm, content hooks, and growth strategies.", capacity: 50 },
    { day: 1, start: "11:30", end: "12:30", title: "Networking Lunch", type: "meal", room: "Ballroom", order: 7 },
    { day: 1, start: "12:30", end: "13:30", title: 'Panel: "Sponsors & Creators: The Partnership Model"', type: "panel", room: "Main Stage", order: 8, desc: "Brand reps and creators discuss what makes a great partnership and how to negotiate." },
    { day: 1, start: "13:30", end: "14:30", title: 'Workshop: "Podcasting 101 for Veterans"', type: "workshop", room: "Breakout Room A", order: 9, desc: "From equipment selection to distribution strategy, learn how to launch a military podcast.", capacity: 50 },
    { day: 1, start: "14:30", end: "15:00", title: "Break", type: "break", room: "Grand Foyer", order: 10 },
    { day: 1, start: "15:00", end: "16:00", title: 'Keynote: "From Battlefield to Boardroom"', type: "keynote", room: "Main Stage", order: 11, featured: true, desc: "How military leadership skills translate to business success." },
    { day: 1, start: "16:00", end: "17:00", title: "Sponsor Showcase", type: "networking", room: "Exhibit Hall", order: 12, desc: "Visit sponsor booths and connect with brands." },
    { day: 1, start: "18:00", end: "20:00", title: "VIP Reception", type: "networking", room: "Rooftop Terrace", order: 13, desc: "Exclusive networking event for VIP ticket holders.", capacity: 200 },

    // ===== DAY 2 =====
    { day: 2, start: "08:00", end: "09:00", title: "Breakfast", type: "meal", room: "Grand Foyer", order: 1 },
    { day: 2, start: "09:00", end: "10:00", title: 'Keynote: "Social Media & National Security"', type: "keynote", room: "Main Stage", order: 2, featured: true, desc: "Exploring the intersection of social media and national security." },
    { day: 2, start: "10:00", end: "11:00", title: 'Panel: "MilSpouse Entrepreneurs"', type: "panel", room: "Main Stage", order: 3, desc: "Military spouses share their journeys building businesses." },
    { day: 2, start: "10:00", end: "11:00", title: 'Workshop: "YouTube Monetization Masterclass"', type: "workshop", room: "Breakout Room A", order: 4, desc: "Deep dive into YouTube revenue streams.", capacity: 50 },
    { day: 2, start: "11:00", end: "11:30", title: "Break", type: "break", room: "Grand Foyer", order: 5 },
    { day: 2, start: "11:30", end: "12:30", title: 'Panel: "AI in Military Content Creation"', type: "panel", room: "Main Stage", order: 6, desc: "How AI tools are transforming content creation for military influencers." },
    { day: 2, start: "12:30", end: "13:30", title: "Networking Lunch", type: "meal", room: "Ballroom", order: 7 },
    { day: 2, start: "13:30", end: "14:30", title: 'Fireside Chat: "Medal of Honor Recipients on Leadership"', type: "keynote", room: "Main Stage", order: 8, featured: true, desc: "An intimate conversation with Medal of Honor recipients about leadership and sacrifice." },
    { day: 2, start: "14:30", end: "15:30", title: 'Workshop: "Instagram Reels That Convert"', type: "workshop", room: "Breakout Room A", order: 9, desc: "Master short-form video content on Instagram.", capacity: 50 },
    { day: 2, start: "15:30", end: "16:30", title: "Sponsor Speed Networking", type: "networking", room: "Exhibit Hall", order: 10, desc: "Structured speed-networking sessions with event sponsors." },
    { day: 2, start: "19:00", end: "22:00", title: "MIC Awards Ceremony & Entertainment", type: "ceremony", room: "Main Ballroom", order: 11, featured: true, desc: "Celebrating the best military content creators!" },

    // ===== DAY 3 =====
    { day: 3, start: "08:00", end: "09:00", title: "Breakfast", type: "meal", room: "Grand Foyer", order: 1 },
    { day: 3, start: "09:00", end: "10:00", title: 'Panel: "The Business of Military Events"', type: "panel", room: "Main Stage", order: 2, desc: "Behind the scenes of planning and executing military community events." },
    { day: 3, start: "10:00", end: "11:00", title: 'Workshop: "Pitching Brands as a Creator"', type: "workshop", room: "Breakout Room A", order: 3, desc: "Learn how to craft compelling pitch decks and set your rates.", capacity: 50 },
    { day: 3, start: "11:00", end: "12:00", title: 'Closing Keynote: "365 Days of Impact"', type: "keynote", room: "Main Stage", order: 4, featured: true, desc: "Building year-round community impact with RecurrentX." },
    { day: 3, start: "12:00", end: "12:30", title: "Closing Ceremony & Announcements", type: "ceremony", room: "Main Stage", order: 5, desc: "Closing remarks and announcements for the coming year." },
  ];

  const rows = sessions.map((s) => ({
    event_id: eventId,
    day_number: s.day,
    start_time: s.start,
    end_time: s.end,
    title: s.title,
    session_type: s.type,
    location_room: s.room,
    sort_order: s.order,
    description: s.desc || null,
    speaker_names: s.speakers || null,
    is_featured: s.featured || false,
    capacity: s.capacity || null,
  }));

  const { error: insertErr } = await supabase
    .from("event_agenda")
    .insert(rows);

  if (insertErr) {
    console.error("Error inserting sessions:", insertErr.message);

    if (insertErr.message.includes("column") || insertErr.message.includes("does not exist")) {
      console.log("\n⚠️  Missing columns on event_agenda. Run this SQL in Supabase SQL editor:");
      console.log(`
ALTER TABLE event_agenda
  ADD COLUMN IF NOT EXISTS speaker_names text,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS capacity integer;
      `);
    }
    process.exit(1);
  }

  console.log(`✅ Inserted ${rows.length} sessions for MIC 2026!`);

  // Step 4: Create tickets if none exist
  console.log("\nChecking event tickets...");
  const { data: existingTickets } = await supabase
    .from("event_tickets")
    .select("id")
    .eq("event_id", eventId);

  if (!existingTickets || existingTickets.length === 0) {
    console.log("Creating tickets...");
    const { error: ticketErr } = await supabase.from("event_tickets").insert([
      { event_id: eventId, name: "General Admission", description: "Full 3-day access to all keynotes, panels, and networking events", price: 0, quantity: 1500, sold: 0, is_active: true, sort_order: 1 },
      { event_id: eventId, name: "VIP", description: "Everything in General plus VIP Reception, priority seating, and swag bag", price: 199, quantity: 200, sold: 0, is_active: true, sort_order: 2 },
      { event_id: eventId, name: "Creator Pass", description: "General Admission + workshop access + brand matchmaking session", price: 99, quantity: 300, sold: 0, is_active: true, sort_order: 3 },
    ]);
    if (ticketErr) {
      console.error("Error creating tickets:", ticketErr.message);
    } else {
      console.log("✅ Created 3 ticket types");
    }
  } else {
    console.log(`✅ ${existingTickets.length} tickets already exist`);
  }

  // Step 5: Check for personal_schedule table
  console.log("\nChecking personal_schedule table...");
  const { error: psErr } = await supabase.from("personal_schedule").select("id").limit(1);
  if (psErr) {
    console.log("⚠️  personal_schedule table may not exist. Run this SQL in Supabase:");
    console.log(`
CREATE TABLE IF NOT EXISTS personal_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id, session_id)
);
ALTER TABLE personal_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own schedule" ON personal_schedule FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    `);
  } else {
    console.log("✅ personal_schedule table exists");
  }

  console.log("\n🎉 Done! Test URL: http://localhost:5173/attend/" + (event.slug || eventId));
}

main().catch(console.error);
