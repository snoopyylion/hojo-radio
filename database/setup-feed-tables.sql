-- Social feed tables for Voxra
-- Run in Supabase SQL editor.

create table if not exists feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references users(id) on delete cascade,
  caption text,
  -- JSON array of { url, type, width, height, thumbnail_url }
  media jsonb not null default '[]'::jsonb,
  -- 'text' | 'image' | 'video' | 'audio'
  post_type text not null default 'text',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists feed_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references feed_posts(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists feed_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references feed_posts(id) on delete cascade,
  author_id text not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_feed_posts_author on feed_posts(author_id);
create index if not exists idx_feed_posts_created on feed_posts(created_at desc);
create index if not exists idx_feed_post_likes_post on feed_post_likes(post_id);
create index if not exists idx_feed_post_likes_user on feed_post_likes(user_id);
create index if not exists idx_feed_post_comments_post on feed_post_comments(post_id);

-- Row Level Security
alter table feed_posts enable row level security;
alter table feed_post_likes enable row level security;
alter table feed_post_comments enable row level security;

-- Anyone (including unauthenticated) can read feed posts
create policy "Public read feed_posts"
  on feed_posts for select using (true);

-- Signed-in users can insert their own posts
create policy "Users insert own feed_posts"
  on feed_posts for insert
  with check (auth.uid()::text = author_id);

-- Users can update/delete their own posts
create policy "Users update own feed_posts"
  on feed_posts for update
  using (auth.uid()::text = author_id);

create policy "Users delete own feed_posts"
  on feed_posts for delete
  using (auth.uid()::text = author_id);

-- Likes
create policy "Public read feed_post_likes"
  on feed_post_likes for select using (true);

create policy "Users manage own likes"
  on feed_post_likes for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Comments
create policy "Public read feed_post_comments"
  on feed_post_comments for select using (true);

create policy "Users insert own comments"
  on feed_post_comments for insert
  with check (auth.uid()::text = author_id);

create policy "Users delete own comments"
  on feed_post_comments for delete
  using (auth.uid()::text = author_id);

-- Helper RPCs so API routes can atomically increment/decrement counters
-- without needing a separate SELECT + UPDATE round-trip.
create or replace function increment_feed_post_likes(post_id uuid)
returns void language sql security definer as $$
  update feed_posts set likes_count = likes_count + 1 where id = post_id;
$$;

create or replace function decrement_feed_post_likes(post_id uuid)
returns void language sql security definer as $$
  update feed_posts set likes_count = greatest(0, likes_count - 1) where id = post_id;
$$;

create or replace function increment_feed_post_comments(post_id uuid)
returns void language sql security definer as $$
  update feed_posts set comments_count = comments_count + 1 where id = post_id;
$$;
