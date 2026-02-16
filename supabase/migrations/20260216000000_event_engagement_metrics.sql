-- 365-Day Engagement Metrics for Events
-- Stores time-series engagement data per event per metric type

CREATE TABLE IF NOT EXISTS event_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'sponsor_impressions',
    'community_growth',
    'creator_engagement',
    'content_performance',
    'revenue_attribution'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_engagement_metrics_event_id ON event_engagement_metrics(event_id);
CREATE INDEX idx_engagement_metrics_type ON event_engagement_metrics(metric_type);
CREATE INDEX idx_engagement_metrics_period ON event_engagement_metrics(period_start, period_end);
CREATE INDEX idx_engagement_metrics_composite ON event_engagement_metrics(event_id, metric_type, period_start);

-- RLS
ALTER TABLE event_engagement_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read engagement metrics" ON event_engagement_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Auth manage engagement metrics" ON event_engagement_metrics
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Seed demo data for MIC 2026 and MilSpouseFest San Antonio
-- ============================================================

DO $$
DECLARE
  v_mic_id UUID;
  v_msf_id UUID;
  v_usaa_id UUID;
  v_grunt_id UUID;
  v_month DATE;
  i INT;
  -- MIC 2026 monthly values (Jan-Dec, event in Sep = index 8)
  -- Sponsor impressions (per sponsor, will be doubled for 2 sponsors)
  mic_sponsor_vals NUMERIC[] := ARRAY[22000, 25000, 28000, 32000, 38000, 45000, 55000, 68000, 105000, 48000, 35000, 28000];
  mic_sponsor2_vals NUMERIC[] := ARRAY[15000, 17000, 19000, 22000, 26000, 30000, 38000, 48000, 72000, 33000, 24000, 19000];
  -- Community growth (cumulative members)
  mic_community_vals NUMERIC[] := ARRAY[520, 580, 650, 740, 850, 980, 1150, 1400, 1900, 2100, 2250, 2400];
  -- Creator engagement (posts/month)
  mic_creator_vals NUMERIC[] := ARRAY[820, 850, 900, 950, 1000, 1100, 1200, 1500, 3200, 1400, 1100, 950];
  -- Content performance (views/month)
  mic_content_vals NUMERIC[] := ARRAY[8500, 9200, 10000, 11500, 13000, 15000, 18000, 25000, 52000, 18000, 12000, 9000];
  -- Revenue attribution (dollars/month)
  mic_revenue_vals NUMERIC[] := ARRAY[4200, 4800, 5500, 6200, 8000, 12000, 18000, 25000, 65000, 22000, 12000, 8000];

  -- MilSpouseFest San Antonio (event in Jun = index 5, different pattern)
  msf_sponsor_vals NUMERIC[] := ARRAY[8000, 10000, 14000, 20000, 28000, 45000, 18000, 12000, 10000, 8500, 7500, 7000];
  msf_sponsor2_vals NUMERIC[] := ARRAY[5000, 6500, 9000, 13000, 18000, 30000, 12000, 8000, 6500, 5500, 5000, 4500];
  msf_community_vals NUMERIC[] := ARRAY[200, 250, 340, 480, 650, 1100, 1200, 1250, 1280, 1300, 1320, 1350];
  msf_creator_vals NUMERIC[] := ARRAY[300, 350, 420, 550, 700, 1800, 600, 450, 380, 350, 320, 300];
  msf_content_vals NUMERIC[] := ARRAY[3000, 3500, 5000, 8000, 12000, 35000, 8000, 5000, 4000, 3500, 3200, 3000];
  msf_revenue_vals NUMERIC[] := ARRAY[2000, 2500, 3500, 5000, 8000, 32000, 6000, 3500, 2800, 2500, 2200, 2000];
BEGIN
  -- Find MIC 2026 event
  SELECT id INTO v_mic_id FROM events WHERE title = 'Military Influencer Conference 2026' LIMIT 1;
  -- Find MilSpouseFest San Antonio (MIC San Antonio 2025 from seed-events.sql)
  SELECT id INTO v_msf_id FROM events WHERE slug = 'mic-san-antonio-2025' LIMIT 1;

  -- ---- MIC 2026 ----
  IF v_mic_id IS NOT NULL THEN
    -- Get sponsor IDs
    SELECT id INTO v_usaa_id FROM event_sponsors WHERE event_id = v_mic_id AND sponsor_name = 'USAA' LIMIT 1;
    SELECT id INTO v_grunt_id FROM event_sponsors WHERE event_id = v_mic_id AND sponsor_name = 'Grunt Style' LIMIT 1;

    FOR i IN 1..12 LOOP
      v_month := ('2026-01-01'::date + ((i - 1) || ' months')::interval)::date;

      -- Sponsor impressions (USAA)
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_mic_id, 'sponsor_impressions', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              mic_sponsor_vals[i] + (random() * 3000 - 1500),
              jsonb_build_object('sponsor_id', COALESCE(v_usaa_id::text, 'usaa'), 'sponsor_name', 'USAA'));

      -- Sponsor impressions (Grunt Style)
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_mic_id, 'sponsor_impressions', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              mic_sponsor2_vals[i] + (random() * 2000 - 1000),
              jsonb_build_object('sponsor_id', COALESCE(v_grunt_id::text, 'grunt-style'), 'sponsor_name', 'Grunt Style'));

      -- Community growth
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_mic_id, 'community_growth', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              mic_community_vals[i], '{}');

      -- Creator engagement
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_mic_id, 'creator_engagement', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              mic_creator_vals[i] + (random() * 100 - 50), '{}');

      -- Content performance
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_mic_id, 'content_performance', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              mic_content_vals[i] + (random() * 1000 - 500), '{}');

      -- Revenue attribution
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_mic_id, 'revenue_attribution', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              mic_revenue_vals[i] + (random() * 500 - 250), '{}');
    END LOOP;
  END IF;

  -- ---- MilSpouseFest San Antonio ----
  IF v_msf_id IS NOT NULL THEN
    FOR i IN 1..12 LOOP
      v_month := ('2025-01-01'::date + ((i - 1) || ' months')::interval)::date;

      -- Sponsor impressions (aggregate — no per-sponsor breakdown for this event)
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_msf_id, 'sponsor_impressions', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              msf_sponsor_vals[i] + msf_sponsor2_vals[i] + (random() * 2000 - 1000), '{}');

      -- Community growth
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_msf_id, 'community_growth', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              msf_community_vals[i], '{}');

      -- Creator engagement
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_msf_id, 'creator_engagement', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              msf_creator_vals[i] + (random() * 60 - 30), '{}');

      -- Content performance
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_msf_id, 'content_performance', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              msf_content_vals[i] + (random() * 500 - 250), '{}');

      -- Revenue attribution
      INSERT INTO event_engagement_metrics (event_id, metric_type, period_start, period_end, value, metadata)
      VALUES (v_msf_id, 'revenue_attribution', v_month, (v_month + interval '1 month' - interval '1 day')::date,
              msf_revenue_vals[i] + (random() * 300 - 150), '{}');
    END LOOP;
  END IF;
END $$;
