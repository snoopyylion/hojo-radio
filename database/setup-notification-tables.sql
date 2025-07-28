-- Database setup for Enhanced Notification System
-- Run this script in your Supabase SQL editor

-- Create user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'followers_only')),
  category TEXT NOT NULL CHECK (category IN ('content', 'social', 'achievement', 'system')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(type);
CREATE INDEX IF NOT EXISTS idx_user_activities_category ON user_activities(category);
CREATE INDEX IF NOT EXISTS idx_user_activities_visibility ON user_activities(visibility);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activities (Clerk-based)
CREATE POLICY "Users can view own activities" ON user_activities
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can insert their own activities (Clerk-based)
CREATE POLICY "Users can insert own activities" ON user_activities
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can update their own activities (Clerk-based)
CREATE POLICY "Users can update own activities" ON user_activities
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can delete their own activities (Clerk-based)
CREATE POLICY "Users can delete own activities" ON user_activities
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Update existing notifications table to add new columns
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('social', 'messaging', 'content', 'system', 'achievement', 'security')),
ADD COLUMN IF NOT EXISTS group_id TEXT,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS action_text TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON notifications(group_id);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  categories JSONB DEFAULT '{}',
  types JSONB DEFAULT '{}',
  quiet_hours JSONB DEFAULT '{}',
  frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  batch_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own preferences (Clerk-based)
CREATE POLICY "Users can manage own preferences" ON notification_preferences
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Insert some sample activities for testing (optional)
-- Uncomment the following lines if you want to add sample data

/*
INSERT INTO user_activities (user_id, type, title, description, category, visibility, data) VALUES
('your-user-id', 'login', 'Login', 'You logged in from Chrome on Windows', 'system', 'private', '{"device_info": "Chrome on Windows", "location": "New York"}'),
('your-user-id', 'post_created', 'Post Created', 'You created a new post: "Sample Post"', 'content', 'public', '{"post_id": "sample-post-id", "post_title": "Sample Post"}'),
('your-user-id', 'achievement_earned', 'Achievement Earned', 'You earned: First Post', 'achievement', 'public', '{"achievement_type": "first_post", "achievement_title": "First Post"}');
*/ 