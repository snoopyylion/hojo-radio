// Enhanced Global Notifications Context
// context/EnhancedGlobalNotificationsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { BaseNotification, NotificationType } from '@/types/notifications';
import { Message, TypingUser, User } from '@/types/messaging';

interface GlobalNotificationsContextType {
  // Notification management
  notifications: BaseNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<BaseNotification, 'id' | 'created_at'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  
  // WebSocket management
  globalWs: WebSocket | null;
  isGlobalConnected: boolean;
  
  // Settings
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  notificationSettings: NotificationSettings;
  
  // Fetch notifications
  fetchNotifications: () => Promise<void>;
  isLoading: boolean;
}

interface NotificationSettings {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  showTypingNotifications: boolean;
  emailNotifications: boolean;
  notificationTypes: Record<NotificationType, boolean>;
  // Add this new property
  followedEntities: {
    users: string[]; // User IDs you want to follow
    tags: string[];  // Tags/categories you want to follow
    conversations: string[]; // Conversation IDs you want to follow
  };
}

const defaultNotificationSettings: NotificationSettings = {
  soundEnabled: true,
  browserNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  showTypingNotifications: true,
  emailNotifications: true,
  notificationTypes: {
    message: true,
    typing: true,
    follow: true,
    unfollow: true,
    like: true,
    unlike: true,
    comment: true,
    comment_reply: true,
    post_published: true,
    post_approved: true,
    post_rejected: true,
    mention: true,
    application_approved: true,
    application_rejected: true,
    login: true,
    login_alert: true,
    profile_update: true,
    bookmark: true,
    share: true,
    system_alert: true,
    welcome: true,
    achievement: true,
    milestone: true,
  },
  followedEntities: {
    users: [],
    tags: [],
    conversations: [],
  },
};


const GlobalNotificationsContext = createContext<GlobalNotificationsContextType | null>(null);

export const useGlobalNotifications = () => {
  const context = useContext(GlobalNotificationsContext);
  if (!context) {
    throw new Error('useGlobalNotifications must be used within GlobalNotificationsProvider');
  }
  return context;
};

export const GlobalNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, isLoaded } = useAuth();
  const pathname = usePathname();
  
  // State
  const [notifications, setNotifications] = useState<BaseNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalWs, setGlobalWs] = useState<WebSocket | null>(null);
  const [isGlobalConnected, setIsGlobalConnected] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);

  // Refs
  const globalWsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  // Computed values
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!userId || !isLoaded) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoaded]);

  // Global WebSocket connection
  const connectGlobalWebSocket = useCallback(() => {
    if (!userId || !isLoaded || !mountedRef.current) return;
    
    // Clean up existing connection
    if (globalWsRef.current) {
      globalWsRef.current.close();
      globalWsRef.current = null;
    }

    if (!process.env.NEXT_PUBLIC_WS_URL) {
      console.error('❌ WebSocket URL not configured');
      return;
    }

    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/notifications?userId=${userId}`;
      console.log('🌐 Connecting to Global Notifications WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      globalWsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        console.log('🌐 Global Notifications WebSocket connected');
        setIsGlobalConnected(true);
        setGlobalWs(ws);
      };

      ws.onmessage = async (event) => {
        if (!mountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          console.log('🌐 Global Notification WebSocket message:', data);

          switch (data.type) {
            case 'new_notification':
              handleNewNotification(data.notification);
              break;
              
            case 'notification_read':
              handleNotificationRead(data.notificationId);
              break;
              
            case 'notification_removed':
              handleNotificationRemoved(data.notificationId);
              break;
              
            // Legacy message support
            case 'new_message':
              handleNewMessage(data.message, data.conversation, data.users);
              break;
              
            case 'typing_update':
              handleTypingUpdate(data.typingUsers, data.conversationId);
              break;
              
            default:
              console.log('❓ Unknown global notification type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing global notification WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🌐 Global Notifications WebSocket disconnected:', event.code, event.reason);
        setIsGlobalConnected(false);
        setGlobalWs(null);
        globalWsRef.current = null;
        
        // Reconnect if not a clean close
        if (event.code !== 1000 && event.code !== 1001 && mountedRef.current) {
          setTimeout(() => {
            if (mountedRef.current) {
              connectGlobalWebSocket();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Global Notifications WebSocket error:', error);
        setIsGlobalConnected(false);
      };

    } catch (error) {
      console.error('❌ Error creating global notifications WebSocket connection:', error);
      setIsGlobalConnected(false);
    }
  }, [userId, isLoaded]);

  // Notification handlers
  const handleNewNotification = useCallback((notification: BaseNotification) => {
    console.log('🔔 New notification received:', notification);
    
    // Check if notification type is enabled
    if (!notificationSettings.notificationTypes[notification.type]) {
      return;
    }

    // Add to state
    setNotifications(prev => {
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;
      return [notification, ...prev];
    });

    // Show browser notification if enabled and window not focused
    if (notificationSettings.browserNotificationsEnabled && document.hidden) {
      showBrowserNotification(notification);
    }

    // Play sound if enabled
    if (notificationSettings.soundEnabled) {
      playNotificationSound(notification.type);
    }
  }, [notificationSettings]);

  const handleNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  const handleNotificationRemoved = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Legacy message handler (for backwards compatibility)
  const handleNewMessage = useCallback((message: Message, conversation: any, users: User[]) => {
    if (message.sender_id === userId) return;
    
    const senderName = users.find(u => u.id === message.sender_id)?.username || 'Unknown User';
    const isImageMessage = message.message_type === 'image';
    const displayContent = isImageMessage 
      ? '📷 Sent an image' 
      : (message.content.length > 100 
        ? `${message.content.substring(0, 100)}...` 
        : message.content);
    
    const notification: Omit<BaseNotification, 'id' | 'created_at'> = {
      user_id: userId!,
      type: 'message',
      title: `New message from ${senderName}`,
      message: displayContent,
      data: {
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        sender_name: senderName,
        message_preview: message.content,
        message_type: message.message_type,
        image_url: isImageMessage ? message.content : undefined
      },
      read: false
    };
    
    addNotification(notification);
  }, [userId]);

  const handleTypingUpdate = useCallback((typingUsers: TypingUser[], conversationId: string) => {
    // Handle typing notifications if needed
    // This could be temporary notifications that don't persist
    console.log('⌨️ Typing update:', typingUsers, conversationId);
  }, []);

  // Utility functions
  // Fixed showBrowserNotification function
const showBrowserNotification = useCallback((notification: BaseNotification) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/icons/notification-icon.png',
      tag: notification.id,
      // Remove onclick from here - it's not a valid property
    });

    // Add click handler separately
    browserNotification.addEventListener('click', () => {
      window.focus();
      // Navigate based on notification type
      navigateToNotification(notification);
      browserNotification.close();
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      browserNotification.close();
    }, 5000);
  }
}, []);

  const playNotificationSound = useCallback((type: NotificationType) => {
    try {
      const audio = new Audio(`/sounds/${type}-notification.mp3`);
      audio.volume = 0.5;
      audio.play().catch(e => console.warn('Could not play notification sound:', e));
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }, []);

  const navigateToNotification = useCallback((notification: BaseNotification) => {
    switch (notification.type) {
      case 'message':
        if (notification.data?.conversation_id) {
          window.location.href = `/messages/${notification.data.conversation_id}`;
        }
        break;
      case 'follow':
      case 'like':
      case 'comment':
      case 'mention':
        if (notification.data?.target_type === 'post' && notification.data?.target_id) {
          window.location.href = `/posts/${notification.data.target_id}`;
        }
        break;
      case 'application_approved':
      case 'application_rejected':
        window.location.href = '/studio';
        break;
      default:
        window.location.href = '/notifications';
    }
  }, []);

  // Notification management functions
  const addNotification = useCallback((notification: Omit<BaseNotification, 'id' | 'created_at'>) => {
    const newNotification: BaseNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Optionally sync to server
    syncNotificationToServer(newNotification);
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    
    // Sync to server
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [userId]);

  const removeNotification = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }, [userId]);

  const clearAllNotifications = useCallback(async () => {
    setNotifications([]);
    
    try {
      await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }, [userId]);

  const syncNotificationToServer = useCallback(async (notification: BaseNotification) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.error('Error syncing notification to server:', error);
    }
  }, []);

  const updateNotificationSettings = useCallback((settings: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...settings }));
    
    // Sync to server/localStorage
    try {
      localStorage.setItem('notificationSettings', JSON.stringify({ ...notificationSettings, ...settings }));
    } catch (error) {
      console.warn('Could not save notification settings:', error);
    }
  }, [notificationSettings]);

  // Initialize
  useEffect(() => {
    if (isLoaded && userId) {
      fetchNotifications();
      connectGlobalWebSocket();
      
      // Load settings from localStorage
      try {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
          setNotificationSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.warn('Could not load notification settings:', error);
      }
    }

    return () => {
      mountedRef.current = false;
      if (globalWsRef.current) {
        globalWsRef.current.close();
      }
    };
  }, [isLoaded, userId]);

  const contextValue: GlobalNotificationsContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    globalWs,
    isGlobalConnected,
    updateNotificationSettings,
    notificationSettings,
    fetchNotifications,
    isLoading
  };

  return (
    <GlobalNotificationsContext.Provider value={contextValue}>
      {children}
    </GlobalNotificationsContext.Provider>
  );
};