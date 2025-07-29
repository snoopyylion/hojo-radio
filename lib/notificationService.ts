// lib/notificationService.ts
import { 
  BaseNotification, 
  UserActivity,
  ActivityType,
  ActivityCategory,
  NotificationPreferences,
  NotificationGroup
} from '@/types/notifications';

export class NotificationService {
  private static instance: NotificationService;
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create notification with proper categorization
  async createNotification(notification: Omit<BaseNotification, 'id' | 'created_at'>): Promise<BaseNotification> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      const data = await response.json();
      return data.notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create user activity entry
  async createUserActivity(activity: Omit<UserActivity, 'id' | 'timestamp'>): Promise<UserActivity> {
    try {
      const response = await fetch('/api/user-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activity)
      });

      if (!response.ok) {
        throw new Error('Failed to create user activity');
      }

      const data = await response.json();
      return data.activity;
    } catch (error) {
      console.error('Error creating user activity:', error);
      throw error;
    }
  }

  // Social notifications
  async createFollowNotification(followerId: string, followedId: string, followerName: string): Promise<void> {
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: followedId,
      type: 'follow',
      category: 'social',
      title: 'New Follower',
      message: `${followerName} followed you`,
      priority: 'medium',
      data: {
        actor_id: followerId,
        actor_name: followerName,
        target_type: 'user',
        target_id: followedId,
        action_url: `/user/${followerId}`,
        action_text: 'View Profile'
      },
      read: false
    };

    await this.createNotification(notification);
  }

  async createLikeNotification(
    likerId: string, 
    postOwnerId: string, 
    likerName: string, 
    postId: string, 
    postTitle: string
  ): Promise<void> {
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: postOwnerId,
      type: 'like',
      category: 'social',
      title: 'New Like',
      message: `${likerName} liked your post "${postTitle}"`,
      priority: 'low',
      data: {
        actor_id: likerId,
        actor_name: likerName,
        target_type: 'post',
        target_id: postId,
        target_title: postTitle,
        target_url: `/posts/${postId}`,
        action_url: `/posts/${postId}`,
        action_text: 'View Post'
      },
      read: false
    };

    await this.createNotification(notification);
  }

  async createCommentNotification(
    commenterId: string,
    postOwnerId: string,
    commenterName: string,
    postId: string,
    postTitle: string,
    commentContent: string
  ): Promise<void> {
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: postOwnerId,
      type: 'comment',
      category: 'social',
      title: 'New Comment',
      message: `${commenterName} commented on your post "${postTitle}"`,
      priority: 'medium',
      data: {
        actor_id: commenterId,
        actor_name: commenterName,
        target_type: 'post',
        target_id: postId,
        target_title: postTitle,
        content_preview: commentContent,
        target_url: `/posts/${postId}`,
        action_url: `/posts/${postId}`,
        action_text: 'View Comment'
      },
      read: false
    };

    await this.createNotification(notification);
  }

  // Message notifications
  async createMessageNotification(
    senderId: string,
    receiverId: string,
    senderName: string,
    conversationId: string,
    messageContent: string,
    messageId: string,
    messageType?: string,
    imageUrl?: string
  ): Promise<void> {
    const isImageMessage = messageType === 'image';
    const displayContent = isImageMessage 
      ? '📷 Sent an image' 
      : (messageContent.length > 100 
        ? `${messageContent.substring(0, 100)}...` 
        : messageContent);

    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: receiverId,
      type: 'message',
      category: 'messaging',
      title: `New message from ${senderName}`,
      message: displayContent,
      priority: 'high',
      data: {
        conversation_id: conversationId,
        sender_id: senderId,
        sender_name: senderName,
        message_preview: messageContent,
        message_id: messageId,
        message_type: messageType,
        image_url: imageUrl
      },
      action_url: `/messages/${conversationId}`,
      action_text: 'Reply',
      read: false
    };

    await this.createNotification(notification);
  }

  // System notifications
  async createLoginNotification(
    userId: string,
    deviceInfo: string,
    location?: string,
    ipAddress?: string
  ): Promise<void> {
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: userId,
      type: 'login',
      category: 'system',
      title: 'New Login',
      message: `New login detected from ${deviceInfo}${location ? ` in ${location}` : ''}`,
      priority: 'medium',
      data: {
        device_info: deviceInfo,
        location: location,
        ip_address: ipAddress,
        timestamp: new Date().toISOString()
      },
      read: false
    };

    await this.createNotification(notification);
  }

  async createLoginAlertNotification(
    userId: string,
    deviceInfo: string,
    location: string,
    ipAddress: string
  ): Promise<void> {
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: userId,
      type: 'login_alert',
      category: 'security',
      title: 'Suspicious Login Detected',
      message: `Unusual login activity detected from ${deviceInfo} in ${location}`,
      priority: 'urgent',
      data: {
        device_info: deviceInfo,
        location: location,
        ip_address: ipAddress,
        timestamp: new Date().toISOString()
      },
      action_url: '/hashedpage/settings',
      action_text: 'Review Security',
      read: false
    };

    await this.createNotification(notification);
  }

  // Content notifications
  async createPostApprovedNotification(
    userId: string,
    postId: string,
    postTitle: string
  ): Promise<void> {
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: userId,
      type: 'post_approved',
      category: 'content',
      title: 'Post Approved',
      message: `Your post "${postTitle}" has been approved and published!`,
      priority: 'medium',
      data: {
        post_id: postId,
        post_title: postTitle,
        post_url: `/posts/${postId}`,
        action_url: `/posts/${postId}`,
        action_text: 'View Post'
      },
      read: false
    };

    await this.createNotification(notification);
  }

  async createPostRejectedNotification(
    userId: string,
    postId: string,
    postTitle: string,
    reason: string
  ): Promise<void> {
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: userId,
      type: 'post_rejected',
      category: 'content',
      title: 'Post Rejected',
      message: `Your post "${postTitle}" was not approved. Reason: ${reason}`,
      priority: 'medium',
      data: {
        post_id: postId,
        post_title: postTitle,
        reason: reason,
        action_url: `/post/create-post`,
        action_text: 'Create New Post'
      },
      read: false
    };

    await this.createNotification(notification);
  }

  // Achievement notifications
  async createAchievementNotification(
    userId: string,
    achievementType: string,
    achievementTitle: string,
    achievementDescription: string,
    badgeUrl?: string,
    points?: number
  ): Promise<void> {
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: userId,
      type: 'achievement',
      category: 'achievement',
      title: `Achievement Unlocked: ${achievementTitle}`,
      message: achievementDescription,
      priority: 'high',
      data: {
        achievement_type: achievementType,
        achievement_title: achievementTitle,
        achievement_description: achievementDescription,
        badge_url: badgeUrl,
        points: points
      },
      action_url: '/hashedpage',
      action_text: 'View Profile',
      read: false
    };

    await this.createNotification(notification);
  }

  // User activity tracking
  async trackUserActivity(
    userId: string,
    activityType: ActivityType,
    title: string,
    description: string,
    category: ActivityCategory,
    visibility: 'public' | 'private' | 'followers_only' = 'public',
    data?: Record<string, unknown>
  ): Promise<void> {
    const activity: Omit<UserActivity, 'id' | 'timestamp'> = {
      user_id: userId,
      type: activityType,
      title,
      description,
      category,
      visibility,
      data
    };

    await this.createUserActivity(activity);
  }

  // Batch notifications for multiple users
  async createBatchNotifications(
    userIds: string[],
    notificationTemplate: Omit<BaseNotification, 'id' | 'created_at' | 'user_id'>
  ): Promise<void> {
    const promises = userIds.map(userId => 
      this.createNotification({
        ...notificationTemplate,
        user_id: userId
      })
    );

    await Promise.allSettled(promises);
  }

  // Get grouped notifications
  async getGroupedNotifications(userId: string): Promise<NotificationGroup[]> {
    try {
      const response = await fetch(`/api/notifications/grouped?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch grouped notifications');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching grouped notifications:', error);
      return [];
    }
  }

  // Get user activity feed
  async getUserActivityFeed(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<UserActivity[]> {
    try {
      const response = await fetch(`/api/user-activity?userId=${userId}&limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user activity');
      }
      const data = await response.json();
      
      // Handle the case where the API returns activities array directly or wrapped in an object
      if (Array.isArray(data)) {
        return data;
      } else if (data.activities && Array.isArray(data.activities)) {
        return data.activities;
      } else {
        console.warn('Unexpected response format from user activity API:', data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, ...preferences })
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Mark notifications as read
  async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_ids: notificationIds })
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // Delete notifications
  async deleteNotifications(notificationIds: string[]): Promise<void> {
    try {
      const response = await fetch('/api/notifications/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_ids: notificationIds })
      });

      if (!response.ok) {
        throw new Error('Failed to delete notifications');
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      throw error;
    }
  }

  // WebSocket connection management
  connectWebSocket(userId: string, onMessage: (data: unknown) => void): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.close();
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/notifications?userId=${userId}`;
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onopen = () => {
      console.log('🔔 Notification WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.wsConnection.onclose = () => {
      console.log('🔔 Notification WebSocket disconnected');
      this.attemptReconnect(userId, onMessage);
    };

    this.wsConnection.onerror = (error) => {
      console.error('🔔 Notification WebSocket error:', error);
    };
  }

  private attemptReconnect(userId: string, onMessage: (data: unknown) => void): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        this.connectWebSocket(userId, onMessage);
      }, delay);
    }
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 