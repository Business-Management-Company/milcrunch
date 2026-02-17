-- ============================================
-- Shop Feature: Merch Products & SWAG Packages
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Merch Products table
CREATE TABLE IF NOT EXISTS merch_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  compare_at_price numeric(10,2),
  category text NOT NULL DEFAULT 'Other',
  tags text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  variants jsonb DEFAULT '[]',
  total_inventory integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. SWAG Packages table
CREATE TABLE IF NOT EXISTS swag_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  image_url text,
  items jsonb DEFAULT '[]',
  max_claims integer NOT NULL DEFAULT 0,
  claimed_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. SWAG Claims table
CREATE TABLE IF NOT EXISTS swag_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES swag_packages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL DEFAULT '',
  user_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'claimed',
  claimed_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one claim per user per package
CREATE UNIQUE INDEX IF NOT EXISTS swag_claims_user_package_unique
  ON swag_claims(package_id, user_id);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE merch_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE swag_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE swag_claims ENABLE ROW LEVEL SECURITY;

-- merch_products: public read for published, full access for authenticated
CREATE POLICY "Anyone can view published merch" ON merch_products
  FOR SELECT USING (is_published = true);

CREATE POLICY "Authenticated users can manage merch" ON merch_products
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- swag_packages: public read for active, full access for authenticated
CREATE POLICY "Anyone can view active packages" ON swag_packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage packages" ON swag_packages
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- swag_claims: users can read own claims, insert own claims, admin full access
CREATE POLICY "Users can view own claims" ON swag_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims" ON swag_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage claims" ON swag_claims
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
