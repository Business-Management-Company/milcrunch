-- ============================================
-- Merch Overrides: store admin edits for hardcoded products
-- + Storage bucket for product image uploads
-- ============================================

CREATE TABLE IF NOT EXISTS merch_overrides (
  product_id text PRIMARY KEY,
  image_url text,
  title text,
  description text,
  price numeric(10,2),
  compare_at_price numeric(10,2),
  category text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE merch_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view merch overrides" ON merch_overrides
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage merch overrides" ON merch_overrides
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket for merch product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('merch-images', 'merch-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view merch images" ON storage.objects
  FOR SELECT USING (bucket_id = 'merch-images');

CREATE POLICY "Authenticated users can upload merch images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'merch-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update merch images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'merch-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete merch images" ON storage.objects
  FOR DELETE USING (bucket_id = 'merch-images' AND auth.role() = 'authenticated');
