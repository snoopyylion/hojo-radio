-- Nuclear option: Recreate podcast_sessions table from scratch
-- Use this ONLY if the migration script doesn't work
-- WARNING: This will DELETE all existing data in the table
-- This script assumes your users table has Clerk user IDs as 'id' text

-- First, let's check your existing users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Drop the existing table if it exists
DROP TABLE IF EXISTS podcast_sessions CASCADE;

-- Create podcast_sessions table with all required columns
CREATE TABLE podcast_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL, -- Clerk user ID as text, references users(id)
  username TEXT NOT NULL,
  is_live BOOLEAN DEFAULT false,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0, -- in seconds
  listeners INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'ended', 'published')),
  youtube_broadcast_id TEXT,
  youtube_stream_id TEXT,
  rtmp_url TEXT,
  stream_key TEXT,
  youtube_watch_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_podcast_sessions_user_id ON podcast_sessions(user_id);
CREATE INDEX idx_podcast_sessions_status ON podcast_sessions(status);
CREATE INDEX idx_podcast_sessions_is_live ON podcast_sessions(is_live);
CREATE INDEX idx_podcast_sessions_created_at ON podcast_sessions(created_at);

-- Add foreign key constraint to users table (Clerk user IDs as 'id' text)
-- This ensures referential integrity between podcast_sessions.user_id and users.id
ALTER TABLE podcast_sessions ADD CONSTRAINT fk_podcast_sessions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'podcast_sessions' 
ORDER BY ordinal_position;

-- Verify the foreign key constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='podcast_sessions' 
    AND kcu.column_name = 'user_id';
