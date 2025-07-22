//hojo/hooks/useWebSocketConnection.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { Message, TypingUser } from '@/types/messaging';
import { useGlobalNotifications } from '@/context/GlobalNotificationsContext';
import { useGlobalTyping } from '@/context/GlobalTypingContext';
import toast from 'react-hot-toast';

interface UseWebSocketConnectionProps {
  conversationId: string;
  userId: string;
  isViewingConversation?: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setConversations: React.Dispatch<React.SetStateAction<any[]>>;
  setTypingUsers: React.Dispatch<React.SetStateAction<Record<string, TypingUser[]>>>;
  setOnlineUsers: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface FollowNotification {
  type: 'follow';
  followerId: string;
  followedId: string;
  action: 'follow' | 'unfollow';
  timestamp: number;
  followerName?: string;
  followerImage?: string;
}

export const useWebSocketConnection = ({
  conversationId,
  userId,
  setMessages,
  isViewingConversation = false,
  setConversations,
  setOnlineUsers,
}: UseWebSocketConnectionProps) => {
  const { setTypingUsers } = useGlobalTyping();
  const [isConnected, setIsConnected] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const reconnectDelay = useRef(1000);
  const processedFollowNotifications = useRef<Set<string>>(new Set());

  const { 
    state: globalState, 
    isGlobalConnected, 
    sendGlobalTypingUpdate, 
    setTypingInConversation,
    addMessageNotification,
    showBrowserNotification,
    addNotification,
    fetchNotifications,
  } = useGlobalNotifications();

  const [isConnecting, setIsConnecting] = useState(false);
  const pendingReadOperations = useRef<{ messageId: string, timestamp: number }[]>([]);

  // Validate environment variables at startup
  if (!process.env.NEXT_PUBLIC_WS_URL) {
    console.error('NEXT_PUBLIC_WS_URL environment variable is not set');
  }

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;

      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Component cleanup');
      }
    }

    setWsConnection(null);
    setIsConnected(false);
  }, []);

  const parseMessageData = useCallback(async (data: string | Blob) => {
    return data instanceof Blob ? await data.text() : String(data);
  }, []);

  const handleTypingUpdate = useCallback((data: {
    conversationId: string;
    userId: string;
    username: string;
    isTyping: boolean;
    timestamp: number;
  }) => {
    if (!mountedRef.current || !userId) return;

    // Skip current user's typing indicators
    if (data.userId === userId) return;

    setTypingUsers(prev => {
      const conversationTyping = prev[data.conversationId] || [];
      const existingUserIndex = conversationTyping.findIndex(u => u.userId === data.userId);

      if (data.isTyping) {
        if (existingUserIndex >= 0) {
          const updated = [...conversationTyping];
          updated[existingUserIndex] = {
            userId: data.userId,
            username: data.username,
            timestamp: data.timestamp
          };
          return { ...prev, [data.conversationId]: updated };
        } else {
          return {
            ...prev,
            [data.conversationId]: [
              ...conversationTyping,
              {
                userId: data.userId,
                username: data.username,
                timestamp: data.timestamp
              }
            ]
          };
        }
      } else {
        return {
          ...prev,
          [data.conversationId]: conversationTyping.filter(u => u.userId !== data.userId)
        };
      }
    });

    if (setTypingInConversation) {
      setTypingInConversation(data.conversationId,
        data.isTyping
          ? [{ userId: data.userId, username: data.username, timestamp: data.timestamp }]
          : []
      );
    }
  }, [userId, setTypingUsers, setTypingInConversation]);

  // Enhanced follow notification handler
  const handleFollowNotification = useCallback((data: FollowNotification) => {
    if (!mountedRef.current || !userId) return;

    // Create unique ID for this notification to prevent duplicates
    const notificationId = `follow-${data.followerId}-${data.followedId}-${data.action}-${data.timestamp}`;
    
    // Check if we've already processed this exact notification
    if (processedFollowNotifications.current.has(notificationId)) {
      console.log('⚠️ Duplicate follow notification ignored:', notificationId);
      return;
    }
    
    // Mark as processed
    processedFollowNotifications.current.add(notificationId);

    // Clean up old processed notifications (keep last 100)
    if (processedFollowNotifications.current.size > 100) {
      const oldEntries = Array.from(processedFollowNotifications.current).slice(0, -50);
      oldEntries.forEach(entry => processedFollowNotifications.current.delete(entry));
    }

    // Only show notification if the current user is being followed/unfollowed
    if (data.followedId !== userId) {
      console.log('📤 Follow notification not for current user, ignoring');
      return;
    }

    const isFollow = data.action === 'follow';
    const notificationTitle = isFollow ? 'New Follower' : 'Unfollowed';
    const notificationMessage = isFollow 
      ? `${data.followerName || 'Someone'} started following you!`
      : `${data.followerName || 'Someone'} unfollowed you`;

    console.log('🔔 Processing follow notification:', {
      action: data.action,
      followerId: data.followerId,
      followedId: data.followedId,
      timestamp: data.timestamp
    });

    // Add to global notifications using the existing system
    if (addNotification) {
      addNotification({
        id: notificationId,
        type: 'follow',
        title: notificationTitle,
        message: notificationMessage,
        timestamp: data.timestamp,
        read: false,
        userId: data.followerId,
        userImage: data.followerImage
      });
    }

    // Show browser notification if enabled and permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      showBrowserNotification(notificationTitle, notificationMessage, {
        icon: data.followerImage || '/default-avatar.png',
        tag: notificationId,
        requireInteraction: false,
        silent: false
      });
    }

    console.log('✅ Follow notification processed successfully:', notificationTitle);
  }, [userId, addNotification, showBrowserNotification]);

  const processPendingReadOperations = useCallback(() => {
    if (!mountedRef.current) return;

    const ws = wsRef.current || globalState.globalWs;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    while (pendingReadOperations.current.length > 0) {
      const operation = pendingReadOperations.current.shift();
      if (operation) {
        try {
          const message = {
            type: 'mark_read',
            messageId: operation.messageId,
            userId,
            conversationId
          };
          ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error processing pending read operation:', error);
        }
      }
    }
  }, [userId, conversationId, globalState.globalWs]);

  const handleWebSocketError = useCallback((error: Event) => {
    if (!mountedRef.current) return;

    console.error('WebSocket error details:', {
      type: error.type,
      url: wsRef.current?.url,
      readyState: wsRef.current?.readyState,
      timestamp: Date.now(),
      isGlobalConnection: wsRef.current === globalState.globalWs,
      conversationId,
      userId
    });

    setIsConnected(false);
    setWsConnection(null);

    if (wsRef.current !== globalState.globalWs) {
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log(`Attempting reconnect in ${reconnectDelay.current}ms`);
          connectWebSocket();
        }
      }, reconnectDelay.current);
    }
  }, [conversationId, userId, globalState.globalWs]);

  const connectWebSocket = useCallback(() => {
    if (!mountedRef.current) return;

    setIsConnecting(true);

    // Prefer global connection for better follow notification handling
    if (isGlobalConnected && globalState.globalWs) {
      console.log('🌐 Using global WebSocket connection for follow notifications');
      setIsConnected(true);
      setIsConnecting(false);
      setWsConnection(globalState.globalWs);
      processPendingReadOperations();
      return;
    }

    cleanup();

    if (!process.env.NEXT_PUBLIC_WS_URL) {
      console.error('WebSocket URL not configured');
      setIsConnecting(false);
      return;
    }

    if (!userId) {
      console.warn('Missing userId for WebSocket connection');
      setIsConnecting(false);
      return;
    }

    try {
      // Use global connection endpoint if no specific conversation
      const wsUrl = conversationId 
        ? `${process.env.NEXT_PUBLIC_WS_URL}/conversations/${conversationId}?userId=${userId}`
        : `${process.env.NEXT_PUBLIC_WS_URL}/global?userId=${userId}`;
        
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        console.log('🔌 WebSocket connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        setWsConnection(ws);
        reconnectDelay.current = 1000;
        processPendingReadOperations();
      };

      ws.onmessage = async (event) => {
        if (!mountedRef.current) return;

        try {
          const messageData = await parseMessageData(event.data);
          const data = JSON.parse(messageData);

          console.log('📨 WebSocket message received:', data.type, data);

          switch (data.type) {
            case 'new_message':
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === data.message.id);
                return exists ? prev : [...prev, data.message];
              });

              setConversations(prev => prev.map(conv =>
                conv.id === data.message.conversation_id
                  ? {
                    ...conv,
                    last_message: data.message,
                    last_message_at: data.message.created_at,
                    unread_count: data.message.sender_id !== userId && !isViewingConversation
                      ? (conv.unread_count || 0) + 1
                      : conv.unread_count || 0
                  }
                  : conv
              ));
              break;

            case 'typing_update':
              handleTypingUpdate(data);
              break;

            case 'user_presence':
              setOnlineUsers(prev => {
                const newSet = new Set(prev);
                data.isOnline ? newSet.add(data.userId) : newSet.delete(data.userId);
                return newSet;
              });
              break;

            case 'message_read':
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === data.messageId
                    ? { ...msg, read_by: [...(msg.read_by || []), data.readBy] }
                    : msg
                )
              );
              break;

            case 'message_reaction':
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === data.messageId
                    ? { ...msg, reactions: data.reactions }
                    : msg
                )
              );
              break;

            case 'follow':
              console.log('📩 Received follow notification:', data);
              handleFollowNotification(data as FollowNotification);
              break;

            case 'global_typing_update':
              if (data.conversationId !== conversationId) {
                handleTypingUpdate(data);
              }
              break;

            case 'follow_notification':
              toast.success(`${data.followerName || 'Someone'} just followed you!`);
              break;

            case 'new_message':
              toast(`New message from ${data.senderName}: ${data.content}`, { icon: '💬' });
              break;

            default:
              console.log('❓ Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        setWsConnection(null);
        wsRef.current = null;

        if (event.code !== 1000 && event.code !== 1001 && mountedRef.current) {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log(`🔄 Attempting reconnect in ${reconnectDelay.current}ms`);
              connectWebSocket();
            }
          }, reconnectDelay.current);
        }
      };

      ws.onerror = handleWebSocketError;

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setIsConnected(false);
      setIsConnecting(false);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log(`🔄 Attempting reconnect in ${reconnectDelay.current}ms`);
          connectWebSocket();
        }
      }, reconnectDelay.current);
    }
  }, [
    isGlobalConnected,
    globalState.globalWs,
    conversationId,
    userId,
    cleanup,
    handleTypingUpdate,
    handleFollowNotification,
    parseMessageData,
    handleWebSocketError,
    processPendingReadOperations,
    isViewingConversation,
    setMessages,
    setConversations,
    setOnlineUsers
  ]);

  const canSendMessages = useCallback(() => {
    return mountedRef.current &&
      (wsRef.current?.readyState === WebSocket.OPEN ||
        (isGlobalConnected && globalState.globalWs?.readyState === WebSocket.OPEN));
  }, [isGlobalConnected, globalState.globalWs]);

  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unread_count: 0 }
        : conv
    ));
  }, []);

  // Enhanced follow event sender with better error handling
  const sendFollowEvent = useCallback((followedId: string, action: 'follow' | 'unfollow') => {
    if (!mountedRef.current || !userId) {
      console.error('❌ Cannot send follow event - missing userId or component unmounted');
      return false;
    }

    if (!canSendMessages()) {
      console.error('❌ Cannot send follow event - no active WebSocket connection');
      return false;
    }

    try {
      const ws = wsRef.current || globalState.globalWs;
      if (!ws) {
        console.error('❌ No WebSocket connection available');
        return false;
      }

      const message = {
        type: 'follow',
        followerId: userId,
        followedId,
        action,
        timestamp: Date.now()
      };

      ws.send(JSON.stringify(message));
      console.log('📤 Follow event sent successfully:', message);
      return true;
    } catch (error) {
      console.error('❌ Error sending follow event:', error);
      return false;
    }
  }, [userId, globalState.globalWs, canSendMessages]);

  // Initialize connection
  useEffect(() => {
    mountedRef.current = true;
    
    const connect = () => {
      if (mountedRef.current && userId) {
        connectWebSocket();
      }
    };

    const timeoutId = setTimeout(connect, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      cleanup();
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      processedFollowNotifications.current.clear();
    };
  }, [userId, connectWebSocket, cleanup]);

  // Clean up pending operations on unmount
  useEffect(() => {
    return () => {
      pendingReadOperations.current = [];
    };
  }, []);

  // Debug connection state
  useEffect(() => {
    console.log('🔍 WebSocket connection state:', {
      isConnected,
      isConnecting,
      wsReadyState: wsRef.current?.readyState,
      globalReadyState: globalState.globalWs?.readyState,
      conversationId,
      userId
    });
  }, [isConnected, isConnecting, globalState.globalWs, conversationId, userId]);

  const sendTypingUpdate = useCallback((isTyping: boolean) => {
    if (!mountedRef.current || !userId) return false;

    if (!canSendMessages()) {
      console.error('Cannot send typing update - no active WebSocket connection');
      return false;
    }

    try {
      const ws = wsRef.current || globalState.globalWs;
      const message = {
        type: 'typing_update',
        conversationId,
        userId,
        username: 'Current User',
        isTyping,
        timestamp: Date.now()
      };

      ws?.send(JSON.stringify(message));

      if (sendGlobalTypingUpdate) {
        sendGlobalTypingUpdate(conversationId, userId, 'Current User', isTyping);
      }
      return true;
    } catch (error) {
      console.error('Error sending typing indicator:', error);
      return false;
    }
  }, [conversationId, userId, globalState.globalWs, sendGlobalTypingUpdate, canSendMessages]);

  const sendMessage = useCallback((message: Message) => {
    if (!mountedRef.current) return false;

    if (!canSendMessages()) {
      console.error('Cannot send message - no active WebSocket connection');
      return false;
    }

    try {
      const ws = wsRef.current || globalState.globalWs;
      const wsMessage = {
        type: 'new_message',
        message
      };
      ws?.send(JSON.stringify(wsMessage));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [globalState.globalWs, canSendMessages]);

  const markMessageAsRead = useCallback((messageId: string) => {
    if (!mountedRef.current) return false;

    if (!canSendMessages()) {
      pendingReadOperations.current.push({
        messageId,
        timestamp: Date.now()
      });

      if (!isConnecting) {
        connectWebSocket();
      }

      console.warn('Queued read operation - no active WebSocket connection');
      return false;
    }

    try {
      const ws = wsRef.current || globalState.globalWs;
      const message = {
        type: 'mark_read',
        messageId,
        userId,
        conversationId
      };
      ws?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }, [userId, conversationId, globalState.globalWs, canSendMessages, isConnecting, connectWebSocket]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    isConnected,
    wsConnection,
    sendTypingUpdate,
    sendMessage,
    markMessageAsRead,
    sendFollowEvent,
    isGlobalConnected,
    isConnecting,
    markConversationAsRead
  };
};