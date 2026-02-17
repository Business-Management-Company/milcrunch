-- Sponsor Management tables
-- sponsor_forms: Form configurations (fields stored as JSONB)
-- sponsor_form_submissions: Public form responses
-- sponsor_pages: Sponsor landing pages
-- sponsor_decks: Uploaded sponsorship deck PDFs

CREATE TABLE IF NOT EXISTS sponsor_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsor_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES sponsor_forms(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsor_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  tier text NOT NULL DEFAULT 'Gold',
  logo_url text,
  banner_url text,
  description text,
  website_url text,
  contact_email text,
  social_instagram text,
  social_twitter text,
  social_linkedin text,
  social_youtube text,
  content_blocks text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsor_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE sponsor_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_decks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage forms, pages, decks
CREATE POLICY "Authenticated users can manage sponsor_forms" ON sponsor_forms
  FOR ALL USING (auth.role() = 'authenticated');

-- Anyone can read active forms (for public apply page)
CREATE POLICY "Anyone can read active sponsor_forms" ON sponsor_forms
  FOR SELECT USING (is_active = true);

-- Anyone can insert submissions (public form)
CREATE POLICY "Anyone can insert sponsor_form_submissions" ON sponsor_form_submissions
  FOR INSERT WITH CHECK (true);

-- Authenticated users can read/update submissions
CREATE POLICY "Authenticated users can manage sponsor_form_submissions" ON sponsor_form_submissions
  FOR ALL USING (auth.role() = 'authenticated');

-- Authenticated users can manage sponsor pages
CREATE POLICY "Authenticated users can manage sponsor_pages" ON sponsor_pages
  FOR ALL USING (auth.role() = 'authenticated');

-- Anyone can read published sponsor pages
CREATE POLICY "Anyone can read published sponsor_pages" ON sponsor_pages
  FOR SELECT USING (published = true);

-- Authenticated users can manage decks
CREATE POLICY "Authenticated users can manage sponsor_decks" ON sponsor_decks
  FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sponsor_form_submissions_form_id ON sponsor_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_pages_slug ON sponsor_pages(slug);
CREATE INDEX IF NOT EXISTS idx_sponsor_pages_event_id ON sponsor_pages(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_decks_event_id ON sponsor_decks(event_id);
