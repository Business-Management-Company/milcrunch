-- ============================================
-- Community, Networking & Notifications Tables
-- ============================================

-- Attendee Connections
CREATE TABLE IF NOT EXISTS attendee_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  requester_name text,
  recipient_name text,
  event_id uuid NOT NULL,
  status text DEFAULT 'pending', -- pending, accepted, declined
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendee_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read connections" ON attendee_connections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert connections" ON attendee_connections
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update connections" ON attendee_connections
  FOR UPDATE TO authenticated USING (true);

-- Event Notifications
CREATE TABLE IF NOT EXISTS event_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text DEFAULT 'announcement', -- announcement, schedule, connection, community, reminder
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read notifications" ON event_notifications
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated read notifications" ON event_notifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert notifications" ON event_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Notification Reads (per-user read tracking)
CREATE TABLE IF NOT EXISTS notification_reads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read notification_reads" ON notification_reads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert notification_reads" ON notification_reads
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable Realtime for event_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE event_notifications;

-- ============================================
-- Seed Community Posts for MIC 2026
-- ============================================
-- Note: These posts use the event_community_posts table which should already exist.
-- If not, run scripts/create-attendee-tables.sql first.
--
-- To seed, find your MIC 2026 event ID and replace the placeholder below:
-- UPDATE: Run this after creating the event, replacing EVENT_ID with the actual UUID.

-- Example seed (uncomment and replace EVENT_ID):
/*
INSERT INTO event_community_posts (event_id, author_name, author_avatar_url, content, post_type, image_url, is_pinned, likes_count, replies_count, created_at)
VALUES
  -- Announcements (2)
  ('EVENT_ID', 'MIC 2026 Team', NULL,
   'Welcome to the Military Influencer Conference 2026 community! 🎉 Start connecting with fellow attendees, check out the agenda, and register for workshops — they fill up fast! This community stays active year-round.',
   'announcement', NULL, true, 89, 23, NOW() - INTERVAL '15 days'),

  ('EVENT_ID', 'MIC 2026 Team', NULL,
   '📢 Reminder: Early bird pricing ends March 31! Lock in your tickets now. VIP passes include access to the speaker lounge and exclusive networking dinner.',
   'announcement', NULL, true, 45, 8, NOW() - INTERVAL '10 days'),

  -- Introductions (4, different branches)
  ('EVENT_ID', 'Johnny Marines', NULL,
   'Hey everyone! Johnny Marines here — 168K on Instagram. First time at MIC and I''m pumped to connect with fellow military creators. Who else is doing content creation full-time? 🇺🇸',
   'introduction', NULL, false, 45, 12, NOW() - INTERVAL '2 hours'),

  ('EVENT_ID', 'SGT Sarah Mitchell', NULL,
   'Active duty Army, 12 years in. Started my milspouse lifestyle blog 2 years ago and now I''m at 85K followers. Can''t wait to learn from everyone at MIC! Looking for collab partners. 💪',
   'introduction', NULL, false, 67, 15, NOW() - INTERVAL '1 day 4 hours'),

  ('EVENT_ID', 'Jessica Dee Bruden', NULL,
   'Navy veteran & photographer here! 📸 234K on TikTok. I document military life through a creative lens. This will be my third MIC — the networking alone is worth the trip!',
   'introduction', NULL, false, 78, 10, NOW() - INTERVAL '2 days 6 hours'),

  ('EVENT_ID', 'Ranger Fitness', NULL,
   'What''s up MIC community! 120K on IG, Army veteran, fitness content creator. Looking to connect with brands in the health & wellness space. Hit me up if you want to grab coffee at the conference! 💪',
   'introduction', NULL, false, 52, 9, NOW() - INTERVAL '2 days 8 hours'),

  -- Questions (3)
  ('EVENT_ID', 'Air Force Amanda', NULL,
   'Anyone know if there''s a dedicated space for content creation/filming at the venue? Want to plan some collabs during breaks! 🎬',
   'question', NULL, false, 23, 8, NOW() - INTERVAL '1 day 3 hours'),

  ('EVENT_ID', 'SGM (Ret) Jackson', NULL,
   'For those who''ve attended before — is parking included with the ticket or do we need to pay separately? Also, any rideshare recommendations for downtown? 🚗',
   'question', NULL, false, 34, 19, NOW() - INTERVAL '3 days 9 hours'),

  ('EVENT_ID', 'VetBiz Daily', NULL,
   'Which networking session are you most excited about? I''m torn between the Brand Deals 101 workshop and the Creator Economy panel. Both at 2pm on Day 1 😫',
   'question', NULL, false, 42, 28, NOW() - INTERVAL '4 days 2 hours'),

  -- Photos (2)
  ('EVENT_ID', 'Dave Bray USA', NULL,
   'Throwback to MIC 2025! Can''t wait to perform again this year. New patriotic anthem dropping at the ceremony 🎸🇺🇸',
   'photo', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop', false, 234, 45, NOW() - INTERVAL '3 days 1 hour'),

  ('EVENT_ID', 'Military Connect', NULL,
   'Sneak peek of our networking lounge design for MIC 2026! Can''t wait for you all to see it in person. 🔥',
   'photo', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', false, 156, 12, NOW() - INTERVAL '5 days 3 hours');
*/
