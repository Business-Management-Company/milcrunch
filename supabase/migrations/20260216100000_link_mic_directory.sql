-- Link MIC 2026 event to its Military Creator Network directory
-- The directory_id column already exists on events (added in 20260215200000_events_system.sql)

DO $$
DECLARE
  v_dir_id UUID;
BEGIN
  SELECT id INTO v_dir_id FROM directories WHERE name ILIKE '%Military Creator%' LIMIT 1;

  IF v_dir_id IS NOT NULL THEN
    UPDATE events
    SET directory_id = v_dir_id
    WHERE title = 'Military Influencer Conference 2026';
  END IF;
END $$;
