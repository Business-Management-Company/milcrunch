-- Super Admin: project management tables (tasks, checklist, notes, deployments, prompts)

CREATE TABLE IF NOT EXISTS admin_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog',
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'feature',
  assignee TEXT DEFAULT 'Andrew',
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  related_prompt_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_task_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES admin_tasks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_task_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES admin_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commit_message TEXT,
  status TEXT DEFAULT 'success',
  vercel_url TEXT,
  notes TEXT,
  deployed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  task_id UUID REFERENCES admin_tasks(id),
  status TEXT DEFAULT 'not_sent',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: restrict to super_admin (user_metadata.role = 'super_admin')
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean AS $$
  SELECT coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin',
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin only" ON admin_tasks;
CREATE POLICY "Super admin only" ON admin_tasks FOR ALL USING (public.is_super_admin());

ALTER TABLE admin_task_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin only" ON admin_task_checklist;
CREATE POLICY "Super admin only" ON admin_task_checklist FOR ALL USING (public.is_super_admin());

ALTER TABLE admin_task_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin only" ON admin_task_notes;
CREATE POLICY "Super admin only" ON admin_task_notes FOR ALL USING (public.is_super_admin());

ALTER TABLE admin_deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin only" ON admin_deployments;
CREATE POLICY "Super admin only" ON admin_deployments FOR ALL USING (public.is_super_admin());

ALTER TABLE admin_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin only" ON admin_prompts;
CREATE POLICY "Super admin only" ON admin_prompts FOR ALL USING (public.is_super_admin());

-- Trigger to update updated_at on admin_tasks
CREATE OR REPLACE FUNCTION public.admin_tasks_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS admin_tasks_updated_at ON admin_tasks;
CREATE TRIGGER admin_tasks_updated_at
  BEFORE UPDATE ON admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.admin_tasks_updated_at();

-- Seed initial tasks (run once; safe to re-run - only inserts if table empty)
INSERT INTO admin_tasks (id, title, status, priority, category, assignee, sort_order)
SELECT * FROM (VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'Creator Login & Dashboard', 'backlog', 'high', 'feature', 'Andrew', 1),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'Upload-Post Integration', 'backlog', 'high', 'integration', 'Andrew', 2),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'CreatorPixel Tracking', 'backlog', 'high', 'feature', 'Andrew', 3),
  ('a1000000-0000-0000-0000-000000000004'::uuid, 'Komi-style Bio Pages', 'backlog', 'medium', 'feature', 'Andrew', 4),
  ('a1000000-0000-0000-0000-000000000005'::uuid, 'Brand Pixel Embed Script', 'backlog', 'medium', 'feature', 'Andrew', 5),
  ('a2000000-0000-0000-0000-000000000001'::uuid, 'Homepage Redesign', 'in_progress', 'high', 'ui', 'Andrew', 1),
  ('a2000000-0000-0000-0000-000000000002'::uuid, 'Discovery API Production Fix', 'in_progress', 'critical', 'bug', 'Andrew', 2),
  ('a2000000-0000-0000-0000-000000000003'::uuid, 'Verification Pipeline Fix', 'in_progress', 'critical', 'bug', 'Andrew', 3),
  ('a3000000-0000-0000-0000-000000000001'::uuid, 'Nav Cleanup', 'testing', 'medium', 'fix', 'Andrew', 1),
  ('a3000000-0000-0000-0000-000000000002'::uuid, 'Podcast RSS Import', 'testing', 'medium', 'bug', 'Andrew', 2),
  ('a4000000-0000-0000-0000-000000000001'::uuid, 'Vercel Deployment', 'done', 'high', 'feature', 'Andrew', 1),
  ('a4000000-0000-0000-0000-000000000002'::uuid, 'milcrunch.com Domain', 'done', 'high', 'feature', 'Andrew', 2),
  ('a4000000-0000-0000-0000-000000000003'::uuid, 'Enrichment API Fix', 'done', 'critical', 'bug', 'Andrew', 3),
  ('a5000000-0000-0000-0000-000000000001'::uuid, 'Supabase 401 on podcasts table', 'bugs', 'low', 'bug', 'Andrew', 1),
  ('a5000000-0000-0000-0000-000000000002'::uuid, 'Public podcast page shows empty skeleton cards', 'bugs', 'low', 'bug', 'Andrew', 2),
  ('a5000000-0000-0000-0000-000000000003'::uuid, 'Influencer Lists ALL CAPS font', 'bugs', 'low', 'bug', 'Andrew', 3)
) AS v(id, title, status, priority, category, assignee, sort_order)
WHERE (SELECT count(*) FROM admin_tasks) = 0;

-- Seed checklist items (only when checklist table is empty)
INSERT INTO admin_task_checklist (task_id, label, is_checked, sort_order)
SELECT task_id, label, false, ord FROM (VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'Signup page', 1),
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'Login page', 2),
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'Role-based routing', 3),
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'Onboarding flow', 4),
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'Creator sidebar nav', 5),
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'Creator dashboard', 6),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'Service file', 1),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'Creator onboarding connect', 2),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'Bio page data', 3),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'Content scheduling', 4),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'Event auto-post', 5),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'Tracking script', 1),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'Visitor fingerprinting', 2),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'Link click tracking', 3),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'Creator analytics dashboard', 4),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'Brand pixel embed', 5),
  ('a1000000-0000-0000-0000-000000000004'::uuid, '3 image formats', 1),
  ('a1000000-0000-0000-0000-000000000004'::uuid, 'Full-bleed landscape mobile', 2),
  ('a1000000-0000-0000-0000-000000000004'::uuid, 'Background blur effect', 3),
  ('a1000000-0000-0000-0000-000000000004'::uuid, 'Tab system', 4),
  ('a1000000-0000-0000-0000-000000000004'::uuid, 'Link styling', 5),
  ('a1000000-0000-0000-0000-000000000005'::uuid, 'Generate script', 1),
  ('a1000000-0000-0000-0000-000000000005'::uuid, 'Attribution tracking', 2),
  ('a1000000-0000-0000-0000-000000000005'::uuid, 'Brand analytics dashboard', 3),
  ('a2000000-0000-0000-0000-000000000001'::uuid, 'Hero background image', 1),
  ('a2000000-0000-0000-0000-000000000001'::uuid, 'New tagline', 2),
  ('a2000000-0000-0000-0000-000000000001'::uuid, 'Grid Coordinates-style cards', 3),
  ('a2000000-0000-0000-0000-000000000001'::uuid, 'FOR section cleanup', 4),
  ('a2000000-0000-0000-0000-000000000001'::uuid, 'Category images', 5),
  ('a2000000-0000-0000-0000-000000000002'::uuid, 'Add API keys to fetch headers', 1),
  ('a2000000-0000-0000-0000-000000000002'::uuid, 'Test on milcrunch.com', 2),
  ('a2000000-0000-0000-0000-000000000003'::uuid, 'safeString helper', 1),
  ('a2000000-0000-0000-0000-000000000003'::uuid, 'Phase 3 non-blocking', 2),
  ('a2000000-0000-0000-0000-000000000003'::uuid, 'API keys in headers', 3),
  ('a2000000-0000-0000-0000-000000000003'::uuid, 'Mixed operator fix', 4),
  ('a3000000-0000-0000-0000-000000000001'::uuid, 'Remove duplicate Podcasts', 1),
  ('a3000000-0000-0000-0000-000000000001'::uuid, 'Wire up Settings', 2),
  ('a3000000-0000-0000-0000-000000000001'::uuid, 'Wire up Sign Out', 3),
  ('a3000000-0000-0000-0000-000000000001'::uuid, 'Fix dropdown links', 4),
  ('a3000000-0000-0000-0000-000000000002'::uuid, 'CORS proxy for RSS fetch', 1),
  ('a3000000-0000-0000-0000-000000000002'::uuid, 'CSV import processing', 2),
  ('a3000000-0000-0000-0000-000000000002'::uuid, 'RLS policies', 3),
  ('a4000000-0000-0000-0000-000000000001'::uuid, 'vercel.json', 1),
  ('a4000000-0000-0000-0000-000000000001'::uuid, 'env vars', 2),
  ('a4000000-0000-0000-0000-000000000001'::uuid, 'domain config', 3),
  ('a4000000-0000-0000-0000-000000000001'::uuid, 'Git push', 4),
  ('a4000000-0000-0000-0000-000000000002'::uuid, 'DNS A record', 1),
  ('a4000000-0000-0000-0000-000000000002'::uuid, 'CNAME record', 2),
  ('a4000000-0000-0000-0000-000000000002'::uuid, 'Vercel domain assignment', 3),
  ('a4000000-0000-0000-0000-000000000003'::uuid, 'Field mapping', 1),
  ('a4000000-0000-0000-0000-000000000003'::uuid, 'Profile modal', 2),
  ('a4000000-0000-0000-0000-000000000003'::uuid, 'UI wiring', 3),
  ('a5000000-0000-0000-0000-000000000001'::uuid, 'Add RLS policy for public read', 1),
  ('a5000000-0000-0000-0000-000000000002'::uuid, 'Show empty state when 0 podcasts', 1),
  ('a5000000-0000-0000-0000-000000000003'::uuid, 'Title case, font-semibold, text-lg', 1)
) AS v(task_id, label, ord)
WHERE (SELECT count(*) FROM admin_task_checklist) = 0;
