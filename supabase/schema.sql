create table if not exists likes (
  id uuid default gen_random_uuid() primary key,
  idea_key text not null,
  visitor_id text not null,
  created_at timestamptz default now(),
  unique(idea_key, visitor_id)
);
create index if not exists likes_idea_key_idx on likes(idea_key);

-- Anonymous likes: the site uses the public anon key with a random visitor_id
-- (no auth), so allow public read/insert/delete. The unique(idea_key,visitor_id)
-- constraint still prevents a visitor from liking the same idea twice.
alter table likes enable row level security;

drop policy if exists likes_select on likes;
create policy likes_select on likes for select using (true);

drop policy if exists likes_insert on likes;
create policy likes_insert on likes for insert with check (true);

drop policy if exists likes_delete on likes;
create policy likes_delete on likes for delete using (true);
