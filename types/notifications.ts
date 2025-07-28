// types/notifications.ts
export interface BaseNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
  expires_at?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: NotificationCategory;
  group_id?: string; // For grouping related notifications
  action_url?: string; // Direct link for the notification
  action_text?: string; // Text for the action button
}

export type NotificationType = 
  | 'message' 
  | 'typing' 
  | 'follow' 
  | 'unfollow'
  | 'like' 
  | 'unlike'
  | 'comment' 
  | 'comment_reply'
  | 'post_published' 
  | 'post_approved'
  | 'post_rejected'
  | 'mention'
  | 'application_approved'
  | 'application_rejected'
  | 'login'
  | 'login_alert'
  | 'profile_update'
  | 'bookmark'
  | 'share'
  | 'system_alert'
  | 'welcome'
  | 'achievement'
  | 'milestone';

export type NotificationCategory = 
  | 'social'      // follow, like, comment, mention
  | 'messaging'   // messages, typing
  | 'content'     // posts, bookmarks, shares
  | 'system'      // login, alerts, system messages
  | 'achievement' // milestones, achievements
  | 'security';   // login alerts, security notices

export interface MessageNotification extends BaseNotification {
  type: 'message';
  category: 'messaging';
  data: {
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    message_preview: string;
    message_id: string;
  };
}

export interface SocialNotification extends BaseNotification {
  type: 'follow' | 'unfollow' | 'like' | 'unlike' | 'comment' | 'comment_reply' | 'mention';
  category: 'social';
  data: {
    actor_id: string;
    actor_name: string;
    actor_avatar?: string;
    target_type: 'post' | 'comment' | 'user';
    target_id: string;
    target_title?: string;
    target_url?: string;
    content_preview?: string; // For comments
  };
}

export interface ContentNotification extends BaseNotification {
  type: 'post_published' | 'post_approved' | 'post_rejected' | 'bookmark' | 'share';
  category: 'content';
  data: {
    post_id: string;
    post_title: string;
    post_url?: string;
    author_id?: string;
    author_name?: string;
    reason?: string; // For rejections
  };
}

export interface SystemNotification extends BaseNotification {
  type: 'login' | 'login_alert' | 'profile_update' | 'system_alert' | 'welcome';
  category: 'system' | 'security';
  data: {
    device_info?: string;
    location?: string;
    ip_address?: string;
    user_agent?: string;
    timestamp: string;
  };
}

export interface AchievementNotification extends BaseNotification {
  type: 'achievement' | 'milestone';
  category: 'achievement';
  data: {
    achievement_type: string;
    achievement_title: string;
    achievement_description: string;
    badge_url?: string;
    points?: number;
  };
}

// User Activity Types
export interface UserActivity {
  id: string;
  user_id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  data?: Record<string, any>;
  visibility: 'public' | 'private' | 'followers_only';
  category: ActivityCategory;
}

export type ActivityType = 
  | 'post_created'
  | 'post_liked'
  | 'post_commented'
  | 'post_shared'
  | 'post_bookmarked'
  | 'user_followed'
  | 'user_unfollowed'
  | 'comment_liked'
  | 'comment_replied'
  | 'message_sent'
  | 'message_received'
  | 'profile_updated'
  | 'login'
  | 'achievement_earned'
  | 'milestone_reached'
  | 'verification_submitted'
  | 'verification_approved';

export type ActivityCategory = 
  | 'content'
  | 'social'
  | 'achievement'
  | 'system';

// Notification Preferences
export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  sound_enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  types: Record<NotificationType, boolean>;
  quiet_hours: {
    enabled: boolean;
    start_time: string; // HH:mm format
    end_time: string;   // HH:mm format
    timezone: string;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  batch_notifications: boolean;
}

// Notification Group
export interface NotificationGroup {
  id: string;
  user_id: string;
  type: NotificationType;
  category: NotificationCategory;
  notifications: BaseNotification[];
  unread_count: number;
  latest_notification: BaseNotification;
  created_at: string;
  updated_at: string;
}

// Add to your types file
export type CustomNotificationType = 
  | 'message'
  | 'typing'
  | 'follow'
  | 'unfollow'
  | 'like'
  | 'unlike'
  | 'comment'
  | 'comment_reply'
  | 'post_published'
  | 'post_approved'
  | 'post_rejected'
  | 'mention'
  | 'application_approved'
  | 'application_rejected'
  | 'login'
  | 'login_alert'
  | 'profile_update'
  | 'bookmark'
  | 'share'
  | 'system_alert'
  | 'welcome'
  | 'achievement'
  | 'milestone'
  | 'custom_event'
  | 'system_alert';
