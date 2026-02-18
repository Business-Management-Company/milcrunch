-- Sponsor Lead Retrieval table
CREATE TABLE IF NOT EXISTS sponsor_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id),
  sponsor_id uuid,
  attendee_registration_id uuid REFERENCES event_registrations(id),
  manual_name text,
  manual_title text,
  manual_company text,
  manual_email text,
  manual_phone text,
  notes text,
  scanned_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE sponsor_leads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write sponsor leads
CREATE POLICY "Allow authenticated users to manage sponsor leads"
  ON sponsor_leads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
