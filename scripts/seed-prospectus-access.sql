CREATE TABLE IF NOT EXISTS prospectus_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Allow all authenticated users to read (for the gate check)
ALTER TABLE prospectus_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON prospectus_access
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON prospectus_access
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated delete" ON prospectus_access
  FOR DELETE TO authenticated USING (true);

-- Also allow anonymous reads so the /prospectus gate can check emails
CREATE POLICY "Allow anon read" ON prospectus_access
  FOR SELECT TO anon USING (true);

INSERT INTO prospectus_access (email) VALUES
  ('andrew@recurrentx.com'),
  ('paul@recurrentx.com'),
  ('kelly@recurrentx.com'),
  ('jamie@recurrentx.com')
ON CONFLICT (email) DO NOTHING;
