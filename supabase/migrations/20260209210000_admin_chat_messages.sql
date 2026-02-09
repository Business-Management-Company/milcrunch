-- Super Admin: chat history for AI assistant
CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin only" ON admin_chat_messages;
CREATE POLICY "Super admin only" ON admin_chat_messages FOR ALL USING (public.is_super_admin());
