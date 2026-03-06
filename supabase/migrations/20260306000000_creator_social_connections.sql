-- Creator social connections: persists connected social accounts locally
create table if not exists creator_social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  account_name text,
  account_avatar text,
  upload_post_account_id text,
  connected_at timestamptz default now(),
  unique(user_id, platform)
);

alter table creator_social_connections enable row level security;

-- Users can read/write their own rows
create policy "Users manage own social connections"
  on creator_social_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
