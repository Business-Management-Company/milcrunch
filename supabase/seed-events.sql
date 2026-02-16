-- Seed Events with City Images
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This bypasses RLS policies.

-- Update existing Washington DC event
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80'
WHERE title ILIKE '%Washington%' OR city ILIKE '%Washington%';

-- Update any events matching city names
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1548260868-c952ab638430?w=800&q=80' WHERE title ILIKE '%San Antonio%' OR city ILIKE '%San Antonio%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800&q=80' WHERE title ILIKE '%Fort Campbell%' OR city ILIKE '%Fort Campbell%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1580752300992-559f8e0734e0?w=800&q=80' WHERE title ILIKE '%Fort Benning%' OR city ILIKE '%Fort Benning%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&q=80' WHERE title ILIKE '%Colorado Springs%' OR city ILIKE '%Colorado Springs%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1538964173425-93884e1dc85f?w=800&q=80' WHERE title ILIKE '%San Diego%' OR city ILIKE '%San Diego%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1569171083498-a0e6c1e63060?w=800&q=80' WHERE title ILIKE '%Norfolk%' OR city ILIKE '%Norfolk%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1513622470380-eb4f8918be84?w=800&q=80' WHERE title ILIKE '%San Juan%' OR city ILIKE '%San Juan%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80' WHERE title ILIKE '%Osan%' OR city ILIKE '%Osan%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80' WHERE title ILIKE '%Humphreys%' OR city ILIKE '%Humphreys%';
UPDATE events SET cover_image_url = 'https://images.unsplash.com/photo-1564357645071-9726b526a8f0?w=800&q=80' WHERE title ILIKE '%Tampa%' OR city ILIKE '%Tampa%';

-- Insert demo events (skip if already exist)
INSERT INTO events (title, slug, event_type, city, state, venue, start_date, end_date, is_published, brand_id, organization_id, cover_image_url, description)
SELECT * FROM (VALUES
  ('MIC San Antonio 2025', 'mic-san-antonio-2025', 'hybrid'::event_type, 'San Antonio', 'TX', 'Henry B. Gonzalez Convention Center', '2025-06-20T09:00:00Z'::timestamptz, '2025-06-22T17:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1548260868-c952ab638430?w=800&q=80', 'Military Influencer Conference bringing together top military creators in San Antonio.'),
  ('MilSpouseFest Fort Campbell', 'milspousefest-fort-campbell', 'live'::event_type, 'Fort Campbell', 'KY', 'Fort Campbell MWR', '2025-05-10T10:00:00Z'::timestamptz, '2025-05-10T16:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800&q=80', 'Military spouse community meetup at Fort Campbell.'),
  ('MilSpouseFest Fort Benning', 'milspousefest-fort-benning', 'live'::event_type, 'Fort Benning', 'GA', 'Fort Benning Community Center', '2025-04-15T10:00:00Z'::timestamptz, '2025-04-15T16:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1580752300992-559f8e0734e0?w=800&q=80', 'Military spouse community meetup at Fort Benning.'),
  ('PDX Live Colorado Springs', 'pdx-live-colorado-springs', 'hybrid'::event_type, 'Colorado Springs', 'CO', 'Olympic Training Center', '2025-07-04T18:00:00Z'::timestamptz, '2025-07-04T22:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&q=80', 'PDX live streaming experience from Colorado Springs.'),
  ('PDX Live San Diego', 'pdx-live-san-diego', 'hybrid'::event_type, 'San Diego', 'CA', 'Camp Pendleton', '2025-08-15T18:00:00Z'::timestamptz, '2025-08-15T22:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1538964173425-93884e1dc85f?w=800&q=80', 'PDX live streaming experience from San Diego.'),
  ('MilSpouseFest Norfolk', 'milspousefest-norfolk', 'live'::event_type, 'Norfolk', 'VA', 'Naval Station Norfolk', '2025-09-20T10:00:00Z'::timestamptz, '2025-09-20T16:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1569171083498-a0e6c1e63060?w=800&q=80', 'Military spouse community meetup at Naval Station Norfolk.'),
  ('PDX Live San Juan', 'pdx-live-san-juan', 'hybrid'::event_type, 'San Juan', 'PR', 'Fort Buchanan', '2025-10-10T18:00:00Z'::timestamptz, '2025-10-10T22:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1513622470380-eb4f8918be84?w=800&q=80', 'PDX live streaming experience from San Juan, Puerto Rico.'),
  ('MIC Osan Air Base', 'mic-osan-air-base', 'hybrid'::event_type, 'Osan', '', 'Osan Air Base', '2025-11-05T09:00:00Z'::timestamptz, '2025-11-06T17:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80', 'Military Influencer Conference at Osan Air Base, South Korea.'),
  ('MIC Camp Humphreys', 'mic-camp-humphreys', 'hybrid'::event_type, 'Humphreys', '', 'Camp Humphreys', '2025-11-08T09:00:00Z'::timestamptz, '2025-11-09T17:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80', 'Military Influencer Conference at Camp Humphreys, South Korea.'),
  ('MilSpouseFest Tampa', 'milspousefest-tampa', 'live'::event_type, 'Tampa', 'FL', 'MacDill Air Force Base', '2025-12-01T10:00:00Z'::timestamptz, '2025-12-01T16:00:00Z'::timestamptz, true, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'https://images.unsplash.com/photo-1564357645071-9726b526a8f0?w=800&q=80', 'Military spouse community meetup at MacDill Air Force Base, Tampa.')
) AS v(title, slug, event_type, city, state, venue, start_date, end_date, is_published, brand_id, organization_id, cover_image_url, description)
WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.slug = v.slug);
