-- Database setup for Enhanced Notification System (Clerk-based)
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

-- Create index for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Insert some sample activities for testing (optional)
-- Replace 'your-actual-user-id' with a real user ID from your users table
/*
INSERT INTO user_activities (user_id, type, title, description, category, visibility, data) VALUES
('your-actual-user-id', 'login', 'Login', 'You logged in from Chrome on Windows', 'system', 'private', '{"device_info": "Chrome on Windows", "location": "New York"}'),
('your-actual-user-id', 'post_created', 'Post Created', 'You created a new post: "Sample Post"', 'content', 'public', '{"post_id": "sample-post-id", "post_title": "Sample Post"}'),
('your-actual-user-id', 'achievement_earned', 'Achievement Earned', 'You earned: First Post', 'achievement', 'public', '{"achievement_type": "first_post", "achievement_title": "First Post"}');
*/ 