-- Stories tables for Voxra (Instagram-style, 24-hour expiry)
-- Run in Supabase SQL editor.

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references users(id) on delete cascade,
  media_url text not null,
  -- 'photo' | 'video' | 'audio'
  media_type text not null,
  thumbnail_url text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  viewer_id text not null references users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (story_id, viewer_id)
);

-- Full index on author + time; RLS policy handles filtering expired stories.
-- (Partial indexes with now() fail — now() is volatile, not IMMUTABLE.)
create index if not exists idx_stories_author
  on stories(author_id, created_at desc);

-- Index for expiry-based cleanup queries
create index if not exists idx_stories_expires_at
  on stories(expires_at);

create index if not exists idx_story_views_story on story_views(story_id);

-- Row Level Security
alter table stories enable row level security;
alter table story_views enable row level security;

-- Only unexpired stories are visible to everyone
create policy "Public read active stories"
  on stories for select
  using (expires_at > now());

create policy "Users insert own stories"
  on stories for insert
  with check (auth.uid()::text = author_id);

create policy "Users delete own stories"
  on stories for delete
  using (auth.uid()::text = author_id);

-- Story views
create policy "Public read story_views"
  on story_views for select using (true);

create policy "Users insert own views"
  on story_views for insert
  with check (auth.uid()::text = viewer_id);
