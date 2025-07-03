// hooks/useInstantNotifications.ts - Fixed version with proper conversation loading
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGlobalNotifications } from '@/context/GlobalNotificationsContext';
import { useAppContext } from '@/context/AppContext';

export interface NotificationState {
    hasNewMessages: boolean;
    unreadCount: number;
    lastMessageTime: number;
    conversations: Array<{
        id: string;
        hasNewMessage: boolean;
        unreadCount: number;
        lastMessageTime: number;
    }>;
}

export const useInstantNotifications = () => {
    const { state } = useGlobalNotifications();
    const { user } = useAppContext();
    const [notificationState, setNotificationState] = useState<NotificationState>({
        hasNewMessages: false,
        unreadCount: 0,
        lastMessageTime: 0,
        conversations: []
    });

    // Use ref to track if component is mounted
    const mountedRef = useRef(true);

    // Track when user last viewed messages to determine "new" messages
    const [lastViewedTime, setLastViewedTime] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('lastViewedMessages');
            return stored ? parseInt(stored) : Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago as default
        }
        return Date.now() - 24 * 60 * 60 * 1000;
    });

    // Load conversations when user is available
    useEffect(() => {
        const loadConversations = async () => {
  if (!user || !user.id) {
    console.log('🔔 No user available, skipping conversation load');
    return;
  }

  try {
    // Get the auth token from your auth provider (Clerk in this case)
    const token = await window.Clerk.session?.getToken(); // For Clerk.js
    // OR if using another auth system:
    // const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    console.log('🔔 Loading conversations with token:', token);
    
    const response = await fetch(`/api/conversations?userId=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status}`);
    }

    const data = await response.json();
    console.log('🔔 Loaded conversations:', data);
    
    // Process the data here
  } catch (error) {
    console.error('🔔 Error loading conversations:', error);
    // Consider setting an error state that you can display to the user
  }
};

        loadConversations();
    }, [user?.id]);

    // Update notification state when conversations change
    useEffect(() => {
        if (!mountedRef.current) return;

        console.log('🔔 Processing conversations for notifications:', {
            conversationCount: state.conversations.length,
            conversations: state.conversations.map(c => ({
                id: c.id,
                unread_count: c.unread_count,
                last_message_at: c.last_message_at,
                last_message: c.last_message
            })),
            lastViewedTime: new Date(lastViewedTime).toISOString()
        });

        // If no conversations, set empty state
        if (state.conversations.length === 0) {
            console.log('🔔 No conversations available');
            setNotificationState({
                hasNewMessages: false,
                unreadCount: 0,
                lastMessageTime: 0,
                conversations: []
            });
            return;
        }

        // Calculate total unread count
        const totalUnreadCount = state.conversations.reduce((total, conv) => {
            const unreadCount = conv.unread_count || 0;
            console.log(`📊 Conversation ${conv.id}: ${unreadCount} unread messages`);
            return total + unreadCount;
        }, 0);

        // Get the most recent message time across all conversations
        const mostRecentMessageTime = state.conversations.reduce((latest, conv) => {
            const convTime = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0;
            return Math.max(latest, convTime);
        }, 0);

        // Determine if there are new messages
        // A message is "new" if:
        // 1. There are unread messages AND
        // 2. The most recent message is after the last viewed time
        const hasNewMessages = totalUnreadCount > 0 && mostRecentMessageTime > lastViewedTime;

        // Map conversations with their notification status
        const conversationNotifications = state.conversations.map(conv => {
            const convLastMessageTime = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0;
            const convUnreadCount = conv.unread_count || 0;
            const convHasNewMessage = convUnreadCount > 0 && convLastMessageTime > lastViewedTime;

            return {
                id: conv.id,
                hasNewMessage: convHasNewMessage,
                unreadCount: convUnreadCount,
                lastMessageTime: convLastMessageTime
            };
        });

        const newState = {
            hasNewMessages,
            unreadCount: totalUnreadCount,
            lastMessageTime: mostRecentMessageTime,
            conversations: conversationNotifications
        };

        setNotificationState(newState);

        console.log('🔔 Notification state updated:', {
            totalUnreadCount,
            hasNewMessages,
            mostRecentMessageTime: new Date(mostRecentMessageTime).toISOString(),
            conversationsWithUnread: conversationNotifications.filter(c => c.unreadCount > 0),
            conversationsWithNew: conversationNotifications.filter(c => c.hasNewMessage),
            lastViewedTime: new Date(lastViewedTime).toISOString(),
            timeSinceLastViewed: Date.now() - lastViewedTime,
            newState
        });

        // Additional debug: Check if there should be notifications
        if (totalUnreadCount > 0) {
            console.log('🔔 SHOULD HAVE NOTIFICATIONS:', {
                unreadCount: totalUnreadCount,
                hasNewMessages,
                reason: hasNewMessages ? 'Has new messages' : 'Messages are old (viewed already)'
            });
        } else {
            console.log('🔔 NO NOTIFICATIONS: No unread messages');
        }

    }, [state.conversations, lastViewedTime]);

    // Function to mark messages as viewed
    const markAsViewed = useCallback(() => {
        if (!mountedRef.current) return;

        const now = Date.now();
        setLastViewedTime(now);

        if (typeof window !== 'undefined') {
            localStorage.setItem('lastViewedMessages', now.toString());
        }

        console.log('📖 Messages marked as viewed at:', new Date(now).toISOString());

        // Force update notification state to reflect viewed status
        setNotificationState(prev => ({
            ...prev,
            hasNewMessages: false,
            conversations: prev.conversations.map(conv => ({
                ...conv,
                hasNewMessage: false
            }))
        }));
    }, []);

    // Function to check if a specific conversation has new messages
    const hasNewMessagesInConversation = useCallback((conversationId: string) => {
        const conv = notificationState.conversations.find(c => c.id === conversationId);
        return conv?.hasNewMessage || false;
    }, [notificationState.conversations]);

    // Function to get unread count for a specific conversation
    const getUnreadCountForConversation = useCallback((conversationId: string) => {
        const conv = notificationState.conversations.find(c => c.id === conversationId);
        return conv?.unreadCount || 0;
    }, [notificationState.conversations]);

    // Debug function to reset viewed time (for testing)
    const resetViewedTime = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('lastViewedMessages');
            setLastViewedTime(Date.now() - 24 * 60 * 60 * 1000);
            console.log('🔔 Reset viewed time for testing');
        }
    }, []);

    // Debug function to simulate unread messages
    const simulateUnreadMessages = useCallback(() => {
        console.log('🔔 Simulating unread messages for testing');
        const mockConversations = [
            {
                id: 'test-conv-1',
                hasNewMessage: true,
                unreadCount: 3,
                lastMessageTime: Date.now()
            },
            {
                id: 'test-conv-2',
                hasNewMessage: true,
                unreadCount: 1,
                lastMessageTime: Date.now() - 5000
            }
        ];

        setNotificationState({
            hasNewMessages: true,
            unreadCount: 4,
            lastMessageTime: Date.now(),
            conversations: mockConversations
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Debug: Log the final state being returned
    console.log('🔔 useInstantNotifications returning:', {
        hasNewMessages: notificationState.hasNewMessages,
        unreadCount: notificationState.unreadCount,
        conversationCount: notificationState.conversations.length,
        timestamp: new Date().toISOString()
    });

    return {
        hasNewMessages: notificationState.hasNewMessages,
        unreadCount: notificationState.unreadCount,
        conversations: notificationState.conversations,
        markAsViewed,
        hasNewMessagesInConversation,
        getUnreadCountForConversation,
        lastViewedTime,
        resetViewedTime, // Added for debugging
        simulateUnreadMessages // Added for debugging
    };
};