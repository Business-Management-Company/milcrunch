-- Update MIC 2026 event: new dates, venue, city
UPDATE events
SET
  start_date = '2026-09-23T09:00:00-04:00',
  end_date = '2026-09-26T17:00:00-04:00',
  venue = 'JW Marriott Tampa Water Street',
  city = 'Tampa',
  state = 'FL',
  description = 'THE premier event for THOSE WHO shape and support the military community. Four days of inspiration, innovation, and impact — featuring world-class speakers, 3000+ attendees, and $100K in cash & prizes.'
WHERE title = 'Military Influencer Conference 2026';
