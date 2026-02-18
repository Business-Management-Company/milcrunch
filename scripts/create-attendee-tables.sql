-- ============================================
-- MilCrunch Attendee Experience - Database Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- ============================================

-- 1. Create event_agenda table (session schedule)
CREATE TABLE IF NOT EXISTS event_agenda (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  day_number integer NOT NULL DEFAULT 1,
  start_time text NOT NULL,
  end_time text NOT NULL,
  title text NOT NULL,
  description text,
  location_room text,
  session_type text NOT NULL DEFAULT 'panel',
  sort_order integer DEFAULT 0,
  speaker_names text,
  is_featured boolean DEFAULT false,
  capacity integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE event_agenda ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the agenda
CREATE POLICY "Anyone can read event agenda"
  ON event_agenda FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update/delete (for admin)
CREATE POLICY "Authenticated users can manage event agenda"
  ON event_agenda FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- 2. Create personal_schedule table (bookmarked sessions)
CREATE TABLE IF NOT EXISTS personal_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id, session_id)
);

ALTER TABLE personal_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own personal schedule"
  ON personal_schedule FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. Create event_speakers table (if not exists)
CREATE TABLE IF NOT EXISTS event_speakers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  creator_name text NOT NULL,
  creator_handle text,
  avatar_url text,
  role text,
  topic text,
  bio text,
  confirmed boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  social_instagram text,
  social_twitter text,
  social_linkedin text,
  military_branch text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_speakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event speakers"
  ON event_speakers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage event speakers"
  ON event_speakers FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- 4. Create event_sponsors table (if not exists)
CREATE TABLE IF NOT EXISTS event_sponsors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  sponsor_name text NOT NULL,
  logo_url text,
  website_url text,
  tier text DEFAULT 'partner',
  description text,
  sort_order integer DEFAULT 0,
  booth_location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event sponsors"
  ON event_sponsors FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage event sponsors"
  ON event_sponsors FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- 5. Create event_registrations table (if not exists)
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  ticket_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  title text,
  military_branch text,
  military_status text,
  dietary_restrictions text,
  special_requests text,
  registration_code text,
  qr_code_data text,
  status text DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read registrations"
  ON event_registrations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create registrations"
  ON event_registrations FOR INSERT
  WITH CHECK (true);


-- 6. Create event_tickets table (if not exists)
CREATE TABLE IF NOT EXISTS event_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  quantity integer,
  sold integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event tickets"
  ON event_tickets FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage event tickets"
  ON event_tickets FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- 7. Create event_community_posts table (if not exists)
CREATE TABLE IF NOT EXISTS event_community_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  author_avatar_url text,
  content text NOT NULL,
  post_type text DEFAULT 'discussion',
  image_url text,
  is_pinned boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE event_community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community posts"
  ON event_community_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create community posts"
  ON event_community_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update community posts"
  ON event_community_posts FOR UPDATE
  USING (auth.uid() IS NOT NULL);


-- 8. Create event_community_replies table (if not exists)
CREATE TABLE IF NOT EXISTS event_community_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES event_community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  author_avatar_url text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_community_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community replies"
  ON event_community_replies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create community replies"
  ON event_community_replies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- 9. Add slug column to events if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'slug'
  ) THEN
    ALTER TABLE events ADD COLUMN slug text UNIQUE;
  END IF;
END $$;


-- ============================================
-- SEED DATA: MIC 2026 Event + Agenda
-- ============================================

-- Create or update MIC 2026 event
INSERT INTO events (title, slug, description, event_type, start_date, end_date, venue, city, state, timezone, capacity, is_published)
VALUES (
  'Military Influencer Conference 2026',
  'mic-2026',
  'The premier gathering of military creators, influencers, and brands. Three days of panels, workshops, keynotes, and networking in Washington, D.C.',
  'live',
  '2026-09-15T08:00:00-04:00',
  '2026-09-17T18:00:00-04:00',
  'Walter E. Washington Convention Center',
  'Washington',
  'DC',
  'America/New_York',
  2000,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  venue = EXCLUDED.venue,
  city = EXCLUDED.city,
  state = EXCLUDED.state;

-- Get the event ID for seeding
DO $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM events WHERE slug = 'mic-2026';

  -- Clear existing agenda
  DELETE FROM event_agenda WHERE event_id = v_event_id;

  -- DAY 1 - September 15
  INSERT INTO event_agenda (event_id, day_number, start_time, end_time, title, session_type, location_room, sort_order, description, is_featured) VALUES
  (v_event_id, 1, '08:00', '09:00', 'Registration & Breakfast', 'meal', 'Grand Foyer', 1, NULL, false),
  (v_event_id, 1, '09:00', '09:15', 'Opening Ceremony', 'ceremony', 'Main Stage', 2, 'Welcome to MIC 2026! Opening remarks and color guard presentation.', true),
  (v_event_id, 1, '09:15', '10:15', 'Opening Keynote: "The Future of Military Content"', 'keynote', 'Main Stage', 3, 'Explore how military creators are shaping narratives and building communities in the digital age.', true),
  (v_event_id, 1, '10:15', '10:30', 'Break', 'break', 'Grand Foyer', 4, NULL, false),
  (v_event_id, 1, '10:30', '11:30', 'Panel: "Building Your Brand After Service"', 'panel', 'Main Stage', 5, 'Veterans share how they transitioned from military service to becoming successful content creators.', false),
  (v_event_id, 1, '10:30', '11:30', 'Workshop: "TikTok for Military Creators"', 'workshop', 'Breakout Room A', 6, 'Hands-on workshop covering TikTok algorithm, content hooks, and growth strategies.', false),
  (v_event_id, 1, '11:30', '12:30', 'Networking Lunch', 'meal', 'Ballroom', 7, 'Enjoy lunch while networking with fellow creators, brands, and sponsors.', false),
  (v_event_id, 1, '12:30', '13:30', 'Panel: "Sponsors & Creators: The Partnership Model"', 'panel', 'Main Stage', 8, 'Brand reps and creators discuss what makes a great partnership.', false),
  (v_event_id, 1, '13:30', '14:30', 'Workshop: "Podcasting 101 for Veterans"', 'workshop', 'Breakout Room A', 9, 'From equipment selection to distribution strategy, learn how to launch a military podcast.', false),
  (v_event_id, 1, '14:30', '15:00', 'Break', 'break', 'Grand Foyer', 10, NULL, false),
  (v_event_id, 1, '15:00', '16:00', 'Keynote: "From Battlefield to Boardroom"', 'keynote', 'Main Stage', 11, 'How military leadership skills translate to business success.', true),
  (v_event_id, 1, '16:00', '17:00', 'Sponsor Showcase', 'networking', 'Exhibit Hall', 12, 'Visit sponsor booths and connect with brands looking to partner with military influencers.', false),
  (v_event_id, 1, '18:00', '20:00', 'VIP Reception', 'networking', 'Rooftop Terrace', 13, 'Exclusive networking event for VIP ticket holders.', false);

  -- DAY 2 - September 16
  INSERT INTO event_agenda (event_id, day_number, start_time, end_time, title, session_type, location_room, sort_order, description, is_featured) VALUES
  (v_event_id, 2, '08:00', '09:00', 'Breakfast', 'meal', 'Grand Foyer', 1, NULL, false),
  (v_event_id, 2, '09:00', '10:00', 'Keynote: "Social Media & National Security"', 'keynote', 'Main Stage', 2, 'Exploring the intersection of social media and national security.', true),
  (v_event_id, 2, '10:00', '11:00', 'Panel: "MilSpouse Entrepreneurs"', 'panel', 'Main Stage', 3, 'Military spouses share their journeys building businesses.', false),
  (v_event_id, 2, '10:00', '11:00', 'Workshop: "YouTube Monetization Masterclass"', 'workshop', 'Breakout Room A', 4, 'Deep dive into YouTube revenue streams.', false),
  (v_event_id, 2, '11:00', '11:30', 'Break', 'break', 'Grand Foyer', 5, NULL, false),
  (v_event_id, 2, '11:30', '12:30', 'Panel: "AI in Military Content Creation"', 'panel', 'Main Stage', 6, 'How AI tools are transforming content creation for military influencers.', false),
  (v_event_id, 2, '12:30', '13:30', 'Networking Lunch', 'meal', 'Ballroom', 7, NULL, false),
  (v_event_id, 2, '13:30', '14:30', 'Fireside Chat: "Medal of Honor Recipients on Leadership"', 'keynote', 'Main Stage', 8, 'An intimate conversation with Medal of Honor recipients about leadership and sacrifice.', true),
  (v_event_id, 2, '14:30', '15:30', 'Workshop: "Instagram Reels That Convert"', 'workshop', 'Breakout Room A', 9, 'Master short-form video content on Instagram.', false),
  (v_event_id, 2, '15:30', '16:30', 'Sponsor Speed Networking', 'networking', 'Exhibit Hall', 10, 'Structured speed-networking sessions with event sponsors.', false),
  (v_event_id, 2, '19:00', '22:00', 'MIC Awards Ceremony & Entertainment', 'ceremony', 'Main Ballroom', 11, 'Celebrating the best military content creators!', true);

  -- DAY 3 - September 17
  INSERT INTO event_agenda (event_id, day_number, start_time, end_time, title, session_type, location_room, sort_order, description, is_featured) VALUES
  (v_event_id, 3, '08:00', '09:00', 'Breakfast', 'meal', 'Grand Foyer', 1, NULL, false),
  (v_event_id, 3, '09:00', '10:00', 'Panel: "The Business of Military Events"', 'panel', 'Main Stage', 2, 'Behind the scenes of planning and executing military community events.', false),
  (v_event_id, 3, '10:00', '11:00', 'Workshop: "Pitching Brands as a Creator"', 'workshop', 'Breakout Room A', 3, 'Learn how to craft compelling pitch decks and set your rates.', false),
  (v_event_id, 3, '11:00', '12:00', 'Closing Keynote: "365 Days of Impact"', 'keynote', 'Main Stage', 4, 'Building year-round community impact with MilCrunch.', true),
  (v_event_id, 3, '12:00', '12:30', 'Closing Ceremony & Announcements', 'ceremony', 'Main Stage', 5, 'Closing remarks and announcements for the coming year.', false);

  -- Create tickets
  DELETE FROM event_tickets WHERE event_id = v_event_id;
  INSERT INTO event_tickets (event_id, name, description, price, quantity, sold, is_active, sort_order) VALUES
  (v_event_id, 'General Admission', 'Full 3-day access to all keynotes, panels, and networking events', 0, 1500, 0, true, 1),
  (v_event_id, 'VIP', 'Everything in General plus VIP Reception, priority seating, and swag bag', 199, 200, 0, true, 2),
  (v_event_id, 'Creator Pass', 'General Admission + workshop access + brand matchmaking session', 99, 300, 0, true, 3);

  -- Create sample speakers
  DELETE FROM event_speakers WHERE event_id = v_event_id;
  INSERT INTO event_speakers (event_id, creator_name, role, topic, bio, confirmed, sort_order, military_branch) VALUES
  (v_event_id, 'Andrew Appleton', 'Founder, MilCrunch', '365 Days of Impact', 'Founder and CEO of MilCrunch. Building the infrastructure for military creator economy.', true, 1, 'Army'),
  (v_event_id, 'Paul Majano', 'Board Chairman, MilCrunch', 'From Battlefield to Boardroom', 'Board Chairman at MilCrunch. Veteran entrepreneur and military community leader.', true, 2, 'Marines'),
  (v_event_id, 'Sarah Mitchell', 'MilSpouse Creator', 'MilSpouse Entrepreneurs Panel', 'Military spouse, entrepreneur, and social media creator with 500K+ followers.', true, 3, NULL),
  (v_event_id, 'Marcus Johnson', 'Veteran YouTuber', 'YouTube Monetization Masterclass', 'Army veteran turned full-time YouTuber with 1M+ subscribers. Expert in video monetization.', true, 4, 'Army'),
  (v_event_id, 'Jessica Torres', 'TikTok Creator', 'TikTok for Military Creators', 'Air Force veteran and TikTok creator with 2M+ followers. Specializes in military humor and advocacy.', true, 5, 'Air Force'),
  (v_event_id, 'David Kim', 'Podcast Host', 'Podcasting 101 for Veterans', 'Navy veteran and host of the award-winning "Mission After Service" podcast.', true, 6, 'Navy'),
  (v_event_id, 'Rachel Adams', 'Brand Partnerships Lead', 'Sponsors & Creators Panel', 'Head of Military Partnerships at a Fortune 500 company. Expert in creator-brand relationships.', true, 7, NULL),
  (v_event_id, 'Mike Rodriguez', 'Cybersecurity Expert', 'Social Media & National Security', 'Former intelligence officer turned cybersecurity consultant. Speaks on OPSEC and social media.', true, 8, 'Army');

  -- Create sample sponsors
  DELETE FROM event_sponsors WHERE event_id = v_event_id;
  INSERT INTO event_sponsors (event_id, sponsor_name, tier, description, sort_order, booth_location) VALUES
  (v_event_id, 'USAA', 'presenting', 'Proudly serving those who serve. Banking, insurance, and investment solutions for the military community.', 1, 'Booth A1'),
  (v_event_id, 'Lockheed Martin', 'diamond', 'A global security and aerospace company principally engaged in defense and technology.', 2, 'Booth A2'),
  (v_event_id, 'GovX', 'platinum', 'The leading online shopping site exclusively for current and former military members.', 3, 'Booth B1'),
  (v_event_id, 'Grunt Style', 'gold', 'Veteran-owned apparel company celebrating the military lifestyle.', 4, 'Booth B2'),
  (v_event_id, 'Black Rifle Coffee Company', 'gold', 'Premium small-batch coffee roasted in the USA. Veteran-owned and operated.', 5, 'Booth B3'),
  (v_event_id, 'Raytheon Technologies', 'platinum', 'One of the largest aerospace and defense manufacturers in the world.', 6, 'Booth A3'),
  (v_event_id, 'CreatorPixel', 'silver', 'First-party data platform for creators. Build your bio page and own your audience data.', 7, 'Booth C1'),
  (v_event_id, 'VetTech Alliance', 'silver', 'Connecting veterans with opportunities in the tech industry.', 8, 'Booth C2');

  RAISE NOTICE 'MIC 2026 seeded successfully! Event ID: %', v_event_id;
END $$;
