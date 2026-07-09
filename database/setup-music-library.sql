-- Reusable music library for podcast hosts (Voxra).
-- Songs are uploaded (compressed) to Cloudinary; this table stores the metadata
-- so a host can browse and pick from their library across sessions.
-- Run in the Supabase SQL editor.

create table if not exists music_tracks (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references users(id) on delete cascade,
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
