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
}

export type NotificationType = 
  | 'message' 
  | 'typing' 
  | 'follow' 
  | 'like' 
  | 'comment' 
  | 'post_published' 
  | 'mention'
  | 'application_approved'
  | 'application_rejected';

export interface MessageNotification extends BaseNotification {
  type: 'message';
  data: {
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    message_preview: string;
  };
}

export interface SocialNotification extends BaseNotification {
  type: 'follow' | 'like' | 'comment' | 'mention';
  data: {
    actor_id: string;
    actor_name: string;
    actor_avatar?: string;
    target_type: 'post' | 'comment' | 'user';
    target_id: string;
    target_title?: string;
  };
}

export interface ApplicationNotification extends BaseNotification {
  type: 'application_approved' | 'application_rejected';
  data: {
    application_id: string;
    new_role: string;
    message?: string;
  };
}

// Add to your types file
export type CustomNotificationType = 
  | 'message'
  | 'typing'
  | 'follow'
  | 'like'
  | 'comment'
  | 'post_published'
  | 'mention'
  | 'application_approved'
  | 'application_rejected'
  | 'custom_event'  // Add your custom types
  | 'system_alert';
