-- =============================================
-- Event Tickets & Registrations
-- =============================================

-- 1. EVENT_TICKETS TABLE
CREATE TABLE IF NOT EXISTS event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  quantity INTEGER,
  sold INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EVENT_REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES event_tickets(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  title TEXT,
  military_branch TEXT,
  military_status TEXT,
  dietary_restrictions TEXT,
  special_requests TEXT,
  registration_code TEXT UNIQUE,
  status TEXT DEFAULT 'confirmed',
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can read active tickets
CREATE POLICY "Public read event_tickets" ON event_tickets FOR SELECT
  USING (is_active = true);

-- Authenticated can manage tickets
CREATE POLICY "Auth manage event_tickets" ON event_tickets FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Anyone can register (insert)
CREATE POLICY "Public insert event_registrations" ON event_registrations FOR INSERT
  WITH CHECK (true);

-- Anyone can read their own registration by email (for confirmation page)
CREATE POLICY "Public read own registration" ON event_registrations FOR SELECT
  USING (true);

-- Authenticated can manage all registrations
CREATE POLICY "Auth manage event_registrations" ON event_registrations FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. SEED TICKETS FOR MIC 2026
DO $$
DECLARE
  v_event_id UUID;
BEGIN
  SELECT id INTO v_event_id FROM events WHERE title = 'Military Influencer Conference 2026' LIMIT 1;

  IF v_event_id IS NOT NULL THEN
    INSERT INTO event_tickets (event_id, name, description, price, quantity, sort_order) VALUES
      (v_event_id, 'General Admission', 'Access to all sessions, panels, and networking events.', 0, 300, 1),
      (v_event_id, 'Creator Pass', 'Everything in General Admission plus exclusive creator networking sessions, content workshops, and brand meetups.', 0, 150, 2),
      (v_event_id, 'VIP Experience', 'The full RecurrentX experience — all sessions, VIP dinner with speakers, exclusive swag bag, and priority seating.', 199, 50, 3);
  END IF;
END $$;
