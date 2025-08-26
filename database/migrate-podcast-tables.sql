-- Migration script to update existing podcast_sessions table
-- Run this in your Supabase SQL editor if you get column errors
-- This assumes your user table has Clerk user IDs as 'id' text

-- First, let's check what columns currently exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'podcast_sessions' 
ORDER BY ordinal_position;

-- Check if the users table exists and has the right structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Add missing columns to podcast_sessions if they don't exist
DO $$ 
BEGIN
    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'title') THEN
        ALTER TABLE podcast_sessions ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Session';
        RAISE NOTICE 'Added title column to podcast_sessions';
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'description') THEN
        ALTER TABLE podcast_sessions ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to podcast_sessions';
    END IF;
    
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'user_id') THEN
        ALTER TABLE podcast_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'unknown';
        RAISE NOTICE 'Added user_id column to podcast_sessions';
    END IF;
    
    -- Add username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'username') THEN
        ALTER TABLE podcast_sessions ADD COLUMN username TEXT NOT NULL DEFAULT 'Anonymous';
        RAISE NOTICE 'Added username column to podcast_sessions';
    END IF;
    
    -- Add is_live column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'is_live') THEN
        ALTER TABLE podcast_sessions ADD COLUMN is_live BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_live column to podcast_sessions';
    END IF;
    
    -- Add start_time column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'start_time') THEN
        ALTER TABLE podcast_sessions ADD COLUMN start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added start_time column to podcast_sessions';
    END IF;
    
    -- Add end_time column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'end_time') THEN
        ALTER TABLE podcast_sessions ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added end_time column to podcast_sessions';
    END IF;
    
    -- Add duration column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'duration') THEN
        ALTER TABLE podcast_sessions ADD COLUMN duration INTEGER DEFAULT 0;
        RAISE NOTICE 'Added duration column to podcast_sessions';
    END IF;
    
    -- Add listeners column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'listeners') THEN
        ALTER TABLE podcast_sessions ADD COLUMN listeners INTEGER DEFAULT 0;
        RAISE NOTICE 'Added listeners column to podcast_sessions';
    END IF;
    
    -- Add likes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'likes') THEN
        ALTER TABLE podcast_sessions ADD COLUMN likes INTEGER DEFAULT 0;
        RAISE NOTICE 'Added likes column to podcast_sessions';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'status') THEN
        ALTER TABLE podcast_sessions ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'ended', 'published'));
        RAISE NOTICE 'Added status column to podcast_sessions';
    END IF;
    
    -- Add youtube_broadcast_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'youtube_broadcast_id') THEN
        ALTER TABLE podcast_sessions ADD COLUMN youtube_broadcast_id TEXT;
        RAISE NOTICE 'Added youtube_broadcast_id column to podcast_sessions';
    END IF;
    
    -- Add youtube_stream_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'youtube_stream_id') THEN
        ALTER TABLE podcast_sessions ADD COLUMN youtube_stream_id TEXT;
        RAISE NOTICE 'Added youtube_stream_id column to podcast_sessions';
    END IF;
    
    -- Add rtmp_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'rtmp_url') THEN
        ALTER TABLE podcast_sessions ADD COLUMN rtmp_url TEXT;
        RAISE NOTICE 'Added rtmp_url column to podcast_sessions';
    END IF;
    
    -- Add stream_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'stream_key') THEN
        ALTER TABLE podcast_sessions ADD COLUMN stream_key TEXT;
        RAISE NOTICE 'Added stream_key column to podcast_sessions';
    END IF;
    
    -- Add youtube_watch_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'youtube_watch_url') THEN
        ALTER TABLE podcast_sessions ADD COLUMN youtube_watch_url TEXT;
        RAISE NOTICE 'Added youtube_watch_url column to podcast_sessions';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'created_at') THEN
        ALTER TABLE podcast_sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to podcast_sessions';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'podcast_sessions' AND column_name = 'updated_at') THEN
        ALTER TABLE podcast_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to podcast_sessions';
    END IF;
    
END $$;

-- Verify the final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'podcast_sessions' 
ORDER BY ordinal_position;

-- Check if foreign key constraint exists for user_id
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

-- Add foreign key constraint to users table (Clerk user IDs as 'id' text)
-- This ensures referential integrity between podcast_sessions.user_id and users.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_podcast_sessions_user_id'
    ) THEN
        ALTER TABLE podcast_sessions ADD CONSTRAINT fk_podcast_sessions_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint fk_podcast_sessions_user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_podcast_sessions_user_id already exists';
    END IF;
END $$;
