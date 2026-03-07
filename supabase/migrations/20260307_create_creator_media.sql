-- Create creator_media table for persistent media library
CREATE TABLE IF NOT EXISTS creator_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text,
  file_url text,
  file_type text,
  file_size bigint,
  cadence_tag text,
  campaign_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE creator_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own media" ON creator_media
  FOR ALL USING (auth.uid() = user_id);

-- Create storage bucket for master media library
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-media-library', 'creator-media-library', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to manage their own files in creator-media-library
CREATE POLICY "Users upload own media lib" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'creator-media-library'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own media lib" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'creator-media-library'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public read media lib" ON storage.objects
  FOR SELECT USING (bucket_id = 'creator-media-library');
