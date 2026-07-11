create table if not exists likes (
  id uuid default gen_random_uuid() primary key,
  idea_key text not null,
  visitor_id text not null,
  created_at timestamptz default now(),
  unique(idea_key, visitor_id)
);
create index if not exists likes_idea_key_idx on likes(idea_key);

-- Voters: one row per participant. visitor_id is the SHA-256 hash of the
-- voter's email (or a random per-device id if they skipped the email prompt).
-- We store the hash only — never the raw email — so we can count/share results
-- with participants without holding any personal data.
create table if not exists voters (
  id uuid default gen_random_uuid() primary key,
  visitor_id text not null unique,
  created_at timestamptz default now()
);

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

-- Voters uses the same public anon key. Allow public insert/select; the
-- unique(visitor_id) constraint keeps one row per participant.
alter table voters enable row level security;

drop policy if exists voters_select on voters;
create policy voters_select on voters for select using (true);

drop policy if exists voters_insert on voters;
create policy voters_insert on voters for insert with check (true);
