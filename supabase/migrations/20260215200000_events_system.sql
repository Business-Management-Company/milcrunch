-- =============================================
-- MilCrunch Events System Migration
-- Tables: events (ALTER), event_speakers, event_agenda, event_sponsors
-- =============================================

-- 1. UPDATE EVENTS TABLE
-- Make brand_id, organization_id, slug nullable for simplified event creation
ALTER TABLE events ALTER COLUMN brand_id DROP NOT NULL;
ALTER TABLE events ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE events ALTER COLUMN slug DROP NOT NULL;

-- Convert event_type from enum to TEXT for flexibility
ALTER TABLE events ALTER COLUMN event_type TYPE TEXT USING event_type::TEXT;
ALTER TABLE events ALTER COLUMN event_type SET DEFAULT 'conference';

-- Add new columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE events ADD COLUMN IF NOT EXISTS directory_id UUID REFERENCES directories(id);

-- 2. CREATE EVENT_SPEAKERS TABLE
CREATE TABLE IF NOT EXISTS event_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  creator_handle TEXT,
  creator_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'presenter',
  topic TEXT,
  bio TEXT,
  sort_order INTEGER DEFAULT 0,
  confirmed BOOLEAN DEFAULT false,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CREATE EVENT_AGENDA TABLE
CREATE TABLE IF NOT EXISTS event_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day_number INTEGER DEFAULT 1,
  start_time TIME,
  end_time TIME,
  title TEXT NOT NULL,
  description TEXT,
  location_room TEXT,
  speaker_ids UUID[],
  session_type TEXT DEFAULT 'breakout',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CREATE EVENT_SPONSORS TABLE
CREATE TABLE IF NOT EXISTS event_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sponsor_name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT DEFAULT 'community',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS POLICIES
ALTER TABLE event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sponsors ENABLE ROW LEVEL SECURITY;

-- Public read for published events
CREATE POLICY "Public read event_speakers" ON event_speakers FOR SELECT
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_speakers.event_id AND events.is_published = true));
CREATE POLICY "Public read event_agenda" ON event_agenda FOR SELECT
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_agenda.event_id AND events.is_published = true));
CREATE POLICY "Public read event_sponsors" ON event_sponsors FOR SELECT
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_sponsors.event_id AND events.is_published = true));

-- Authenticated users full CRUD
CREATE POLICY "Auth manage event_speakers" ON event_speakers FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth manage event_agenda" ON event_agenda FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth manage event_sponsors" ON event_sponsors FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Ensure authenticated users can manage events
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth manage events' AND tablename = 'events') THEN
    CREATE POLICY "Auth manage events" ON events FOR ALL
      USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- 6. SEED DATA: Military Influencer Conference 2026
INSERT INTO events (title, description, event_type, start_date, end_date, venue, city, state, status, is_published, capacity)
VALUES (
  'Military Influencer Conference 2026',
  'The premier gathering for military influencers, content creators, and brands. Three days of panels, networking, and live experiences in the nation''s capital.',
  'conference',
  '2026-09-15T09:00:00-04:00',
  '2026-09-17T17:00:00-04:00',
  'Washington Convention Center',
  'Washington',
  'DC',
  'published',
  true,
  500
);

DO $$
DECLARE
  v_event_id UUID;
BEGIN
  SELECT id INTO v_event_id FROM events WHERE title = 'Military Influencer Conference 2026' LIMIT 1;

  IF v_event_id IS NOT NULL THEN
    -- Speakers
    INSERT INTO event_speakers (event_id, creator_name, creator_handle, role, topic, bio, sort_order, confirmed) VALUES
      (v_event_id, 'Marcus Thompson', 'marcus_vet', 'keynote', 'The Future of Military Creator Economy', 'Army veteran, 500K+ followers, fitness & motivation creator.', 1, true),
      (v_event_id, 'Sarah Martinez', 'sarah_milspouse', 'panelist', 'Building Brand Partnerships as a Mil-Spouse Creator', 'Military spouse advocate, lifestyle creator with 200K+ community.', 2, true);

    -- Agenda
    INSERT INTO event_agenda (event_id, day_number, start_time, end_time, title, description, location_room, session_type, sort_order) VALUES
      (v_event_id, 1, '09:00', '10:00', 'Opening Keynote: The Future of Military Creator Economy', 'Marcus Thompson shares insights on how military creators are reshaping brand partnerships.', 'Main Ballroom', 'keynote', 1),
      (v_event_id, 1, '10:30', '11:30', 'Panel: Building Brand Partnerships', 'Learn how to land and manage sponsorships as a military-connected creator.', 'Room 201', 'panel', 2),
      (v_event_id, 1, '12:00', '13:00', 'Networking Lunch', 'Connect with fellow creators and brand representatives over lunch.', 'Grand Hall', 'meal', 3);

    -- Sponsors
    INSERT INTO event_sponsors (event_id, sponsor_name, website_url, tier, description, sort_order) VALUES
      (v_event_id, 'USAA', 'https://usaa.com', 'title', 'Proud supporter of military families and creators.', 1),
      (v_event_id, 'Grunt Style', 'https://gruntstyle.com', 'gold', 'Veteran-owned apparel brand celebrating military culture.', 2);
  END IF;
END $$;
