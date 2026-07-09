-- Reusable music library for podcast hosts (Voxra).
-- Songs are uploaded (compressed) to Cloudinary; this table stores the metadata
-- so a host can browse and pick from their library across sessions.
-- Run in the Supabase SQL editor.

-- gen_random_uuid() lives in pgcrypto on some Postgres setups.
create extension if not exists pgcrypto;

create table if not exists music_tracks (
  id uuid primary key default gen_random_uuid(),
  -- Clerk user id (text). No hard FK so this runs regardless of the users
  -- table's PK type; author_id is always set from the authenticated session.
  author_id text not null,
  title text not null,
  artist text,
  url text not null,            -- Cloudinary secure_url (compressed)
  public_id text,               -- Cloudinary public_id (for deletion)
  duration numeric,             -- seconds
  file_size bigint,             -- bytes (compressed)
  format text,                  -- e.g. mp3, m4a
  created_at timestamptz not null default now()
);

create index if not exists music_tracks_author_idx on music_tracks (author_id);
create index if not exists music_tracks_created_idx on music_tracks (created_at desc);

-- Optional: if your `users` table has a text `id` (Clerk ids), you can add
-- referential integrity with:
--   alter table music_tracks
--     add constraint music_tracks_author_fk
--     foreign key (author_id) references users(id) on delete cascade;
