import { useEffect, useState, useCallback, useRef } from 'react';
import { Message, TypingUser } from '@/types/messaging';
import { useGlobalNotifications } from '@/context/GlobalNotificationsContext';
import { useGlobalTyping } from '@/context/GlobalTypingContext';

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
  const reconnectDelay = useRef(1000); // Start with 1 second

  const { 
    state: globalState, 
    isGlobalConnected, 
    sendGlobalTypingUpdate, 
    setTypingInConversation,
    addMessageNotification,
  } = useGlobalNotifications();

  // Add connection state tracking
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
        // Add or update typing user
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
        // Remove typing user
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

  // Handle follow notifications
  const handleFollowNotification = useCallback((data: FollowNotification) => {
    if (!mountedRef.current || !userId) return;
  
    // Only show notification if the current user is being followed
    if (data.followedId !== userId) return;
  
    const isFollow = data.action === 'follow';
    
    if (isFollow) {
      // Create a mock message for the follow notification
      const mockMessage: Message = {
        id: `follow-${data.followerId}-${data.timestamp}`,
        content: `${data.followerName || 'Someone'} started following you!`,
        sender_id: data.followerId,
        conversation_id: 'system-follow', // Use a special system conversation ID
        created_at: new Date(data.timestamp).toISOString(),
        message_type: 'system', // If your Message type supports this
        // Add other required Message properties with default values
        updated_at: new Date(data.timestamp).toISOString(),
        read_by: [],
        reactions: [],
        // ... add any other required properties
      };
  
      // Use the existing addMessageNotification function
      addMessageNotification(mockMessage);
  
      // Handle browser notification directly
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Follower', {
          body: `${data.followerName || 'Someone'} started following you!`,
          icon: data.followerImage || '/default-avatar.png',
          tag: `follow-${data.followerId}`,
        });
      }
  
      console.log('🔔 New follower notification:', data);
    }
  }, [userId, addMessageNotification]);

  // Process any pending read operations when connection is established
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

    // Attempt reconnect only if this isn't the global connection
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

    if (isGlobalConnected && globalState.globalWs) {
      console.log('🌐 Using global WebSocket connection');
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

    if (!conversationId || !userId) {
      console.warn('Missing conversationId or userId for WebSocket connection');
      setIsConnecting(false);
      return;
    }

    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/conversations/${conversationId}?userId=${userId}`;
      console.log('🔌 Connecting to Conversation WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        console.log('🔌 Conversation WebSocket connected successfully');
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
                    // Only increment unread count if message is not from current user
                    // and we're not currently viewing this conversation
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

            // Handle follow notifications
            case 'follow':
              handleFollowNotification(data as FollowNotification);
              break;

            // Handle global typing updates
            case 'global_typing_update':
              if (data.conversationId !== conversationId) {
                handleTypingUpdate(data);
              }
              break;

            default:
              console.log('Received unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        setWsConnection(null);
        wsRef.current = null;

        if (event.code !== 1000 && event.code !== 1001 && mountedRef.current) {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log(`Attempting reconnect in ${reconnectDelay.current}ms`);
              connectWebSocket();
            }
          }, reconnectDelay.current);
        }
      };

      ws.onerror = handleWebSocketError;

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
      setIsConnecting(false);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log(`Attempting reconnect in ${reconnectDelay.current}ms`);
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
    processPendingReadOperations
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

  // Send follow event via WebSocket
  const sendFollowEvent = useCallback((followedId: string, action: 'follow' | 'unfollow') => {
    if (!mountedRef.current || !userId) return false;

    if (!canSendMessages()) {
      console.error('Cannot send follow event - no active WebSocket connection');
      return false;
    }

    try {
      const ws = wsRef.current || globalState.globalWs;
      const message = {
        type: 'follow',
        followerId: userId,
        followedId,
        action,
        timestamp: Date.now()
      };

      ws?.send(JSON.stringify(message));
      console.log('📤 Sent follow event:', message);
      return true;
    } catch (error) {
      console.error('Error sending follow event:', error);
      return false;
    }
  }, [userId, globalState.globalWs, canSendMessages]);

  useEffect(() => {
    mountedRef.current = true;
    const connect = () => {
      if (mountedRef.current && conversationId && userId) {
        connectWebSocket();
      }
    };

    const timeoutId = setTimeout(connect, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      cleanup();
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [conversationId, userId, connectWebSocket, cleanup]);

  // Clean up pending operations on unmount
  useEffect(() => {
    return () => {
      pendingReadOperations.current = [];
    };
  }, []);

  useEffect(() => {
    console.log('WebSocket connection state changed:', {
      isConnected,
      readyState: wsRef.current?.readyState,
      globalReadyState: globalState.globalWs?.readyState
    });
  }, [isConnected, globalState.globalWs]);

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
        username: 'Current User', // Replace with actual username
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

  return {
    isConnected,
    wsConnection,
    sendTypingUpdate,
    sendMessage,
    markMessageAsRead,
    sendFollowEvent, // New function to send follow events
    isGlobalConnected,
    isConnecting
  };
};