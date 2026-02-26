-- GTM Planner demo results persistence
-- Stores saved scan results so demo URLs open with pre-populated data

CREATE TABLE IF NOT EXISTS gtm_demo_results (
  event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  conflicts JSONB,
  gtm_plan TEXT,
  summary TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE gtm_demo_results ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for demo URLs)
CREATE POLICY "Public read gtm_demo_results" ON gtm_demo_results
  FOR SELECT USING (true);

-- Authenticated users can manage
CREATE POLICY "Auth manage gtm_demo_results" ON gtm_demo_results
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
