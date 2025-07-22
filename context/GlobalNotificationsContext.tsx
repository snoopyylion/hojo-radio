// context/GlobalNotificationsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Message, TypingUser, Conversation, User } from '@/types/messaging';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationContainer } from '@/components/messaging/InAppNotification';
import { BaseNotification } from '@/types/notifications';

// Types
type State = {
  inAppNotifications: InAppNotification[];
  typingUsers: Record<string, TypingUser[]>;
  onlineUsers: Set<string>;
  conversations: Conversation[];
  notificationSettings: NotificationSettings;
  globalWs: WebSocket | null;
  isGlobalConnected: boolean;
};

type Action =
  | { type: 'ADD_NOTIFICATION'; payload: InAppNotification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'REMOVE_NOTIFICATIONS'; payload: string[] }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_TYPING_USERS'; payload: Record<string, TypingUser[]> }
  | { type: 'UPDATE_TYPING_USERS'; payload: { conversationId: string; typingUsers: TypingUser[] } }
  | { type: 'SET_ONLINE_USERS'; payload: Set<string> }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'UPDATE_NOTIFICATION_SETTINGS'; payload: Partial<NotificationSettings> }
  | { type: 'SET_WS_CONNECTION'; payload: { ws: WebSocket | null; isConnected: boolean } };

interface GlobalNotificationsContextType {
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  followConversation: (conversationId: string) => Promise<void>;
  unfollowConversation: (conversationId: string) => Promise<void>;
  followTag: (tag: string) => Promise<void>;
  unfollowTag: (tag: string) => Promise<void>;
  isFollowing: (type: 'user' | 'conversation' | 'tag', id: string) => boolean;
  setTypingInConversation: (conversationId: string, users: TypingUser[]) => void;
  sendGlobalTypingUpdate: (
    conversationId: string,
    userId: string,
    username: string,
    isTyping: boolean
  ) => void;
  // State
  state: State;

  // Actions
  dispatch: React.Dispatch<Action>;

  // Notification management
  addMessageNotification: (message: Message, conversation?: Conversation, users?: User[]) => void;
  addTypingNotification: (typingUsers: TypingUser[], conversationId: string, conversation?: Conversation, users?: User[]) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;

  addNotification: (notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    userId?: string;
    userImage?: string;
  }) => void;

  showBrowserNotification: (
    title: string,
    body: string,
    options?: NotificationOptions
  ) => void;

  // WebSocket management
  connectGlobalWebSocket: () => void;

  // Utility functions
  getCurrentConversationId: () => string | null;

  // Connection status
  isGlobalConnected: boolean;

  // Typing users getter for specific conversation
  getTypingUsersForConversation: (conversationId: string) => TypingUser[];

  // Additional state setters for compatibility
  setTypingUsers: (typingUsers: Record<string, TypingUser[]> | ((prev: Record<string, TypingUser[]>) => Record<string, TypingUser[]>)) => void;
  setOnlineUsers: (users: Set<string> | ((prev: Set<string>) => Set<string>)) => void;

  notifications: BaseNotification[];
  isLoading: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  fetchNotifications: () => Promise<void>;
}

interface NotificationSettings {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  showTypingNotifications: boolean;
}

interface InAppNotification {
  id: string;
  type: 'message' | 'typing';
  message?: Message;
  typingUsers?: TypingUser[];
  users?: User[];
  conversationName?: string;
  conversationId?: string;
  onClick?: () => void;
  createdAt: number;
}

// Initial state
const initialState: State = {
  inAppNotifications: [],
  typingUsers: {},
  onlineUsers: new Set(),
  conversations: [],
  notificationSettings: {
    soundEnabled: true,
    browserNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    showTypingNotifications: true,
  },
  globalWs: null,
  isGlobalConnected: false,
};

// Reducer function
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        inAppNotifications: [...state.inAppNotifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        inAppNotifications: state.inAppNotifications.filter(n => n.id !== action.payload),
      };
    case 'REMOVE_NOTIFICATIONS':
      return {
        ...state,
        inAppNotifications: state.inAppNotifications.filter(
          n => !action.payload.includes(n.id)
        ),
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        inAppNotifications: [],
      };
    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: action.payload,
      };
    case 'UPDATE_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.conversationId]: action.payload.typingUsers
        }
      };
    case 'SET_ONLINE_USERS':
      return {
        ...state,
        onlineUsers: action.payload,
      };
    case 'SET_CONVERSATIONS':
      return {
        ...state,
        conversations: action.payload,
      };
    case 'UPDATE_NOTIFICATION_SETTINGS':
      return {
        ...state,
        notificationSettings: {
          ...state.notificationSettings,
          ...action.payload,
        },
      };
    case 'SET_WS_CONNECTION':
      return {
        ...state,
        globalWs: action.payload.ws,
        isGlobalConnected: action.payload.isConnected,
      };
    default:
      return state;
  }
};

const GlobalNotificationsContext = createContext<GlobalNotificationsContextType | null>(null);

export const useGlobalNotifications = () => {
  const context = useContext(GlobalNotificationsContext);
  if (!context) {
    throw new Error('useGlobalNotifications must be used within GlobalNotificationsProvider');
  }
  return context;
};

export const GlobalChatNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, isLoaded } = useAuth();
  const pathname = usePathname();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Refs
  const globalWsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const activeTypingNotifications = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const followingRef = useRef<{
    users: Set<string>;
    conversations: Set<string>;
    tags: Set<string>;
  }>({
    users: new Set(),
    conversations: new Set(),
    tags: new Set()
  });

  // Get current conversation ID from pathname - memoize to prevent infinite loops
  const getCurrentConversationId = useCallback(() => {
    const match = pathname.match(/\/messages\/([^\/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Memoize derived values to prevent unnecessary re-renders
  const isInMessagesApp = useMemo(() => pathname.startsWith('/messages'), [pathname]);
  const currentConversationId = useMemo(() => getCurrentConversationId(), [getCurrentConversationId]);

  // Custom notifications hook - pass stable dependencies
  const conversationsForNotifications = useMemo(() => state.conversations, [state.conversations]);

  const {
    permissionState,
    requestNotificationPermission,
    notifyNewMessage,
    notifyTyping,
    clearAllNotifications: clearBrowserNotifications
  } = useNotifications({
    currentUserId: userId!,
    isWindowFocused: state.notificationSettings.inAppNotificationsEnabled,
    conversations: conversationsForNotifications
  });

  // Follow/unfollow functions
  const followUser = useCallback(async (userId: string) => {
    followingRef.current.users.add(userId);
    // Here you would typically make an API call to follow the user
  }, []);

  const unfollowUser = useCallback(async (userId: string) => {
    followingRef.current.users.delete(userId);
    // Here you would typically make an API call to unfollow the user
  }, []);

  const followConversation = useCallback(async (conversationId: string) => {
    followingRef.current.conversations.add(conversationId);
    // Here you would typically make an API call to follow the conversation
  }, []);

  const unfollowConversation = useCallback(async (conversationId: string) => {
    followingRef.current.conversations.delete(conversationId);
    // Here you would typically make an API call to unfollow the conversation
  }, []);

  const followTag = useCallback(async (tag: string) => {
    followingRef.current.tags.add(tag);
    // Here you would typically make an API call to follow the tag
  }, []);

  const unfollowTag = useCallback(async (tag: string) => {
    followingRef.current.tags.delete(tag);
    // Here you would typically make an API call to unfollow the tag
  }, []);

  const isFollowing = useCallback((type: 'user' | 'conversation' | 'tag', id: string) => {
    switch (type) {
      case 'user':
        return followingRef.current.users.has(id);
      case 'conversation':
        return followingRef.current.conversations.has(id);
      case 'tag':
        return followingRef.current.tags.has(id);
      default:
        return false;
    }
  }, []);

  const addNotification = useCallback((notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    userId?: string;
    userImage?: string;
  }) => {
    // Convert the generic notification to InAppNotification format
    const inAppNotification: InAppNotification = {
      id: notification.id,
      type: 'message', // or determine based on notification.type
      conversationId: 'system', // or extract from notification
      createdAt: notification.timestamp,
    };
    
    dispatch({ type: 'ADD_NOTIFICATION', payload: inAppNotification });
  }, []);
  
  const showBrowserNotification = useCallback((
    title: string,
    body: string,
    options?: NotificationOptions
  ) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        ...options
      });
    }
  }, []);

  // Window focus tracking - use stable dependencies
  useEffect(() => {
    const handleFocus = () => {
      // Clear notifications for current conversation when window gets focus
      if (currentConversationId) {
        dispatch({
          type: 'REMOVE_NOTIFICATIONS',
          payload: state.inAppNotifications
            .filter(n => n.conversationId === currentConversationId)
            .map(n => n.id)
        });
      }
      clearBrowserNotifications();
    };

    const handleBlur = () => { };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [currentConversationId, clearBrowserNotifications]);

  // Global WebSocket connection - memoized to prevent reconnections
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
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/global?userId=${userId}`;
      console.log('🌐 Connecting to Global WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      globalWsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        console.log('🌐 Global WebSocket connected');
        dispatch({
          type: 'SET_WS_CONNECTION',
          payload: { ws, isConnected: true }
        });
      };

      ws.onmessage = async (event) => {
        if (!mountedRef.current) return;

        try {
          let messageData: string;

          if (event.data instanceof Blob) {
            messageData = await event.data.text();
          } else {
            messageData = String(event.data);
          }

          const data = JSON.parse(messageData);
          console.log('🌐 Global WebSocket message:', data);

          switch (data.type) {
            case 'new_message':
              handleGlobalMessage(data.message, data.conversation, data.users);
              break;

            case 'typing_update':
              handleGlobalTyping(data.typingUsers, data.conversationId, data.conversation, data.users);
              break;

            case 'conversations_update':
              dispatch({ type: 'SET_CONVERSATIONS', payload: data.conversations || [] });
              break;

            default:
              console.log('❓ Unknown global message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing global WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🌐 Global WebSocket disconnected:', event.code, event.reason);
        dispatch({
          type: 'SET_WS_CONNECTION',
          payload: { ws: null, isConnected: false }
        });
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
        console.error('❌ Global WebSocket error:', error);
        dispatch({
          type: 'SET_WS_CONNECTION',
          payload: { ws: null, isConnected: false }
        });
      };

    } catch (error) {
      console.error('❌ Error creating global WebSocket connection:', error);
      dispatch({
        type: 'SET_WS_CONNECTION',
        payload: { ws: null, isConnected: false }
      });
    }
  }, [userId, isLoaded]);

  const handleGlobalMessage = useCallback((message: Message, conversation?: Conversation, users: User[] = []) => {
    // Skip if from current user or already processed
    if (message.sender_id === userId || processedMessageIds.current.has(message.id)) return;
    processedMessageIds.current.add(message.id);

    // Check if user is viewing this conversation
    const isViewingConv = window.location.pathname.includes(`/messages/${message.conversation_id}`);

    // Only notify if not viewing the conversation
    if (!isViewingConv) {
      const conversationName = conversation?.name ||
        (conversation?.participants?.length === 2 ?
          users.find(u => u.id !== userId)?.username || 'Direct Message' :
          'Group Chat');

      // Compile complete notification data
      const notificationData: InAppNotification = {
        id: `msg-${message.id}-${Date.now()}`,
        type: 'message',
        message,
        users,
        conversationName,
        conversationId: message.conversation_id,
        createdAt: Date.now(),
        onClick: () => {
          window.location.href = `/messages/${message.conversation_id}`;
        }
      };

      // Send to notification system
      dispatch({ type: 'ADD_NOTIFICATION', payload: notificationData });

      // Optionally show browser notification using the existing notifyNewMessage function
      if (state.notificationSettings.browserNotificationsEnabled) {
        notifyNewMessage(message, users, () => {
          window.focus();
          window.location.href = `/messages/${message.conversation_id}`;
        });
      }
    }
  }, [userId, state.notificationSettings, notifyNewMessage]);

  const handleGlobalTyping = useCallback((
    typingUsers: TypingUser[],
    conversationId: string,
    conversation?: Conversation,
    users: User[] = []
  ) => {
    // Always update the typing state
    dispatch({
      type: 'UPDATE_TYPING_USERS',
      payload: {
        conversationId,
        typingUsers: typingUsers.filter(tu => tu.userId !== userId) // Filter out self
      }
    });

    // Update conversations list to show typing in sidebar
    dispatch({
      type: 'SET_CONVERSATIONS',
      payload: state.conversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            typingUsers: typingUsers.filter(tu => tu.userId !== userId)
          };
        }
        return conv;
      })
    });
  }, [userId, state.conversations]);

  // Initialize global WebSocket
  useEffect(() => {
    if (isLoaded && userId) {
      connectGlobalWebSocket();
    }

    return () => {
      mountedRef.current = false;
      if (globalWsRef.current) {
        globalWsRef.current.close();
      }
    };
  }, [isLoaded, userId, connectGlobalWebSocket]);

  // Clean up old typing users
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const updatedTypingUsers: Record<string, TypingUser[]> = {};
      let hasChanges = false;

      Object.entries(state.typingUsers).forEach(([convId, users]) => {
        const activeUsers = users.filter(user => now - user.timestamp < 5000);
        if (activeUsers.length !== users.length) {
          hasChanges = true;
        }
        updatedTypingUsers[convId] = activeUsers;
      });

      if (hasChanges) {
        dispatch({
          type: 'SET_TYPING_USERS',
          payload: updatedTypingUsers
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.typingUsers]);

  // Clean up old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const notificationsToRemove: string[] = [];

      state.inAppNotifications.forEach(notification => {
        if (notification.type === 'message') {
          if (now - notification.createdAt >= 30000) {
            notificationsToRemove.push(notification.id);
          }
        } else if (notification.type === 'typing' && notification.typingUsers) {
          if (notification.typingUsers.every(tu => now - tu.timestamp >= 5000)) {
            notificationsToRemove.push(notification.id);
          }
        }
      });

      if (notificationsToRemove.length > 0) {
        dispatch({
          type: 'REMOVE_NOTIFICATIONS',
          payload: notificationsToRemove
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.inAppNotifications]);

  // Clear notifications when user navigates to the specific conversation
  useEffect(() => {
    if (isInMessagesApp && currentConversationId && state.notificationSettings.inAppNotificationsEnabled) {
      const notificationsToRemove = state.inAppNotifications
        .filter(n => n.conversationId === currentConversationId)
        .map(n => n.id);

      if (notificationsToRemove.length > 0) {
        dispatch({
          type: 'REMOVE_NOTIFICATIONS',
          payload: notificationsToRemove
        });
      }
    }
  }, [currentConversationId, isInMessagesApp, state.notificationSettings.inAppNotificationsEnabled, state.inAppNotifications]);

  // Notification management functions
  const addMessageNotification = useCallback((message: Message, conversation?: Conversation, users: User[] = []) => {
    const notificationId = `message-${message.id}-${Date.now()}`;
    const conversationName = conversation?.name ||
      (conversation?.participants?.length === 2 ?
        users.find(u => u.id !== userId)?.username || 'Direct Message' :
        'Group Chat');

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: notificationId,
        type: 'message',
        message,
        users,
        conversationName,
        conversationId: message.conversation_id,
        createdAt: Date.now(),
        onClick: () => {
          window.location.href = `/messages/${message.conversation_id}`;
        }
      }
    });
  }, [userId]);

  const addTypingNotification = useCallback((
    typingUsers: TypingUser[],
    conversationId: string,
    conversation?: Conversation,
    users: User[] = []
  ) => {
    const notificationId = `typing-${conversationId}`;
    const conversationName = conversation?.name ||
      (conversation?.participants?.length === 2 ?
        users.find(u => u.id !== userId)?.username || 'Direct Message' :
        'Group Chat');

    // Clear existing timeout for this conversation
    const existingTimeout = activeTypingNotifications.current.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to remove typing notification
    const timeout = setTimeout(() => {
      removeNotification(notificationId);
      activeTypingNotifications.current.delete(conversationId);
    }, 5000);

    activeTypingNotifications.current.set(conversationId, timeout);

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: notificationId,
        type: 'typing',
        typingUsers,
        users,
        conversationName,
        conversationId,
        createdAt: Date.now()
      }
    });
  }, [userId]);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    processedMessageIds.current.clear();
    activeTypingNotifications.current.forEach(timeout => clearTimeout(timeout));
    activeTypingNotifications.current.clear();
    clearBrowserNotifications();
  }, [clearBrowserNotifications]);

  // Helper function to get typing users for a specific conversation
  const getTypingUsersForConversation = useCallback((conversationId: string) => {
    return state.typingUsers[conversationId] || [];
  }, [state.typingUsers]);

  // Additional state setters for compatibility
  const setTypingUsers = useCallback((value: Record<string, TypingUser[]> | ((prev: Record<string, TypingUser[]>) => Record<string, TypingUser[]>)) => {
    if (typeof value === 'function') {
      dispatch({ type: 'SET_TYPING_USERS', payload: value(state.typingUsers) });
    } else {
      dispatch({ type: 'SET_TYPING_USERS', payload: value });
    }
  }, [state.typingUsers]);

  const setOnlineUsers = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (typeof value === 'function') {
      dispatch({ type: 'SET_ONLINE_USERS', payload: value(state.onlineUsers) });
    } else {
      dispatch({ type: 'SET_ONLINE_USERS', payload: value });
    }
  }, [state.onlineUsers]);

  const setTypingInConversation = useCallback((conversationId: string, users: TypingUser[]) => {
    dispatch({
      type: 'UPDATE_TYPING_USERS',
      payload: { conversationId, typingUsers: users }
    });
  }, []);

  const sendGlobalTypingUpdate = useCallback((
    conversationId: string,
    userId: string,
    username: string,
    isTyping: boolean
  ) => {
    if (!state.globalWs || state.globalWs.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'typing_update',
      conversationId,
      userId,
      username,
      isTyping,
      timestamp: Date.now()
    };

    state.globalWs.send(JSON.stringify(message));
  }, [state.globalWs]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    followUser,
    unfollowUser,
    followConversation,
    unfollowConversation,
    followTag,
    unfollowTag,
    isFollowing,
    state,
    dispatch,
    addMessageNotification,
    addTypingNotification,
    removeNotification,
    clearAllNotifications,
    connectGlobalWebSocket,
    getCurrentConversationId,
    isGlobalConnected: state.isGlobalConnected,
    getTypingUsersForConversation,
    setTypingUsers,
    setOnlineUsers,
    setTypingInConversation,
    sendGlobalTypingUpdate,
    addNotification,
    showBrowserNotification,
    notifications: [],
    isLoading: false,
    markAsRead: () => {},
    markAllAsRead: () => {},
    fetchNotifications: async () => {}
  }), [
    followUser,
    unfollowUser,
    followConversation,
    unfollowConversation,
    followTag,
    unfollowTag,
    isFollowing,
    state,
    addMessageNotification,
    addTypingNotification,
    removeNotification,
    clearAllNotifications,
    connectGlobalWebSocket,
    getCurrentConversationId,
    getTypingUsersForConversation,
    setTypingUsers,
    setOnlineUsers,
    setTypingInConversation,
    sendGlobalTypingUpdate,
    addNotification,
    showBrowserNotification,
  ]);

  // Determine when to show the global notification container
  const shouldShowGlobalNotifications = useMemo(() =>
    !isInMessagesApp || (isInMessagesApp && !currentConversationId),
    [isInMessagesApp, currentConversationId]
  );

  return (
    <GlobalNotificationsContext.Provider value={contextValue}>
      {children}

      {/* Global notification container */}
      {shouldShowGlobalNotifications && (
        <NotificationContainer
          notifications={state.inAppNotifications}
          onRemoveNotification={removeNotification}
        />
      )}
    </GlobalNotificationsContext.Provider>
  );
};