-- CreatorPixel: first-party tracking for creator bio pages.

-- Creator profiles: add public handle for bio page URL (e.g. /c/ssgtnichols).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_profiles' AND column_name = 'handle') THEN
    ALTER TABLE creator_profiles ADD COLUMN handle TEXT UNIQUE;
  END IF;
END $$;

-- Visitor fingerprints and identity (return visits, attribution).
CREATE TABLE IF NOT EXISTS pixel_visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  visit_count INTEGER DEFAULT 1,
  first_referral_source TEXT,
  first_creator_handle TEXT,
  first_utm_source TEXT,
  is_identified BOOLEAN DEFAULT false,
  identified_at TIMESTAMPTZ,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  language TEXT,
  approximate_city TEXT,
  approximate_state TEXT,
  approximate_country TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pixel_visitors_visitor_id ON pixel_visitors(visitor_id);

-- All tracking events.
CREATE TABLE IF NOT EXISTS pixel_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  creator_handle TEXT,
  event_type TEXT NOT NULL,
  referral_source TEXT,
  utm_source TEXT,
  campaign_id TEXT,
  event_slug TEXT,
  link_url TEXT,
  link_label TEXT,
  time_on_page_seconds INTEGER,
  scroll_depth_percent INTEGER,
  links_clicked_count INTEGER,
  brand_id TEXT,
  event_value NUMERIC(10,2),
  page_url TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pixel_events_creator ON pixel_events(creator_handle, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_events_visitor ON pixel_events(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_events_type ON pixel_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_events_brand ON pixel_events(brand_id, created_at DESC);

-- Brand pixel configurations (embeddable script).
CREATE TABLE IF NOT EXISTS brand_pixels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT UNIQUE NOT NULL,
  brand_name TEXT NOT NULL,
  website_url TEXT,
  pixel_script TEXT,
  is_active BOOLEAN DEFAULT true,
  conversion_events TEXT[] DEFAULT '{"page_view","purchase"}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Creator smart links (platform/campaign/event).
CREATE TABLE IF NOT EXISTS smart_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  link_type TEXT DEFAULT 'bio',
  slug TEXT,
  event_id UUID,
  campaign_id TEXT,
  destination_url TEXT,
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(handle, slug)
);

CREATE INDEX IF NOT EXISTS idx_smart_links_handle ON smart_links(handle);

-- Allow anonymous insert for pixel_events (from bio page visitors).
ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixel_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert pixel_events"
  ON pixel_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Creators can read own pixel_events"
  ON pixel_events FOR SELECT
  USING (
    creator_handle IN (SELECT handle FROM creator_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Allow insert pixel_visitors"
  ON pixel_visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update pixel_visitors"
  ON pixel_visitors FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Creators can read pixel_visitors with own events"
  ON pixel_visitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pixel_events e
      WHERE e.visitor_id = pixel_visitors.visitor_id
        AND e.creator_handle IN (SELECT handle FROM creator_profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE pixel_visitors IS 'CreatorPixel: visitor fingerprints and identity resolution.';
COMMENT ON TABLE pixel_events IS 'CreatorPixel: page_view, link_click, page_exit, brand_visit, etc.';
