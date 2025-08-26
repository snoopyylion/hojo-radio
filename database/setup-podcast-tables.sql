-- Database setup for podcast system
-- Run this in your Supabase SQL editor

-- Create podcast_sessions table
CREATE TABLE IF NOT EXISTS podcast_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL, -- Clerk user ID as text
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

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES podcast_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID as text
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create podcast_likes table
CREATE TABLE IF NOT EXISTS podcast_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES podcast_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID as text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create podcast_episodes table (for recorded content)
CREATE TABLE IF NOT EXISTS podcast_episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL, -- Clerk user ID as text
  username TEXT NOT NULL,
  audio_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0, -- in seconds
  file_size INTEGER DEFAULT 0, -- in bytes
  waveform_data INTEGER[], -- array of waveform values
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'published', 'archived')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create live_analytics table
CREATE TABLE IF NOT EXISTS live_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES podcast_sessions(id) ON DELETE CASCADE,
  listeners INTEGER DEFAULT 0,
  countries TEXT[] DEFAULT '{}',
  device_types JSONB DEFAULT '{"mobile": 0, "desktop": 0, "tablet": 0}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_youtube_tokens table
CREATE TABLE IF NOT EXISTS user_youtube_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE, -- Clerk user ID as text
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_podcast_stats table
CREATE TABLE IF NOT EXISTS user_podcast_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE, -- Clerk user ID as text
  total_sessions INTEGER DEFAULT 0,
  total_listeners INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0, -- in seconds
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_podcast_sessions_user_id ON podcast_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_sessions_status ON podcast_sessions(status);
CREATE INDEX IF NOT EXISTS idx_podcast_sessions_is_live ON podcast_sessions(is_live);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_session_id ON podcast_likes(session_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_user_id ON podcast_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_live_analytics_session_id ON live_analytics(session_id);

-- Create functions for incrementing/decrementing likes
CREATE OR REPLACE FUNCTION increment_session_likes(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE podcast_sessions 
  SET likes = likes + 1, updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_session_likes(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE podcast_sessions 
  SET likes = GREATEST(likes - 1, 0), updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies (if using Supabase)
-- Enable RLS
ALTER TABLE podcast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_youtube_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_podcast_stats ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for Clerk authentication
-- Note: These policies assume you're passing the user_id from Clerk in your API calls
-- You may need to adjust these based on your specific authentication setup

-- Allow users to view public podcast sessions
CREATE POLICY "Users can view public podcast sessions" ON podcast_sessions
  FOR SELECT USING (status = 'published' OR status = 'live');

-- Allow users to manage their own sessions
CREATE POLICY "Users can manage their own sessions" ON podcast_sessions
  FOR ALL USING (true); -- You'll handle user validation in your API routes

-- Allow users to view chat messages for public sessions
CREATE POLICY "Users can view chat messages for public sessions" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM podcast_sessions 
      WHERE id = session_id AND (status = 'published' OR status = 'live')
    )
  );

-- Allow users to insert chat messages
CREATE POLICY "Users can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Allow users to manage their own likes
CREATE POLICY "Users can manage their own likes" ON podcast_likes
  FOR ALL USING (true);

-- Allow users to view public episodes
CREATE POLICY "Users can view public episodes" ON podcast_episodes
  FOR SELECT USING (is_public = true AND status = 'published');

-- Allow users to manage their own episodes
CREATE POLICY "Users can manage their own episodes" ON podcast_episodes
  FOR ALL USING (true);

-- Allow users to view analytics for their own sessions
CREATE POLICY "Users can view analytics for their own sessions" ON live_analytics
  FOR SELECT USING (true);

-- Allow users to manage their own YouTube tokens
CREATE POLICY "Users can manage their own YouTube tokens" ON user_youtube_tokens
  FOR ALL USING (true);

-- Allow users to view their own stats
CREATE POLICY "Users can view their own stats" ON user_podcast_stats
  FOR SELECT USING (true);

-- Allow users to manage their own stats
CREATE POLICY "Users can manage their own stats" ON user_podcast_stats
  FOR ALL USING (true);
