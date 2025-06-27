// hooks/useWebSocketConnection.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { Message, TypingUser } from '@/types/messaging';

interface UseWebSocketConnectionProps {
  conversationId: string;
  userId: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setConversations: React.Dispatch<React.SetStateAction<any[]>>;
  setTypingUsers: React.Dispatch<React.SetStateAction<Record<string, TypingUser[]>>>;
  setOnlineUsers: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const useWebSocketConnection = ({
  conversationId,
  userId,
  setMessages,
  setConversations,
  setTypingUsers,
  setOnlineUsers
}: UseWebSocketConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Clean up function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      
      // Remove event listeners before closing
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

  const connectWebSocket = useCallback(() => {
    // Don't connect if component is unmounted
    if (!mountedRef.current) return;

    // Clean up any existing connection
    cleanup();

    // Validate environment
    if (!process.env.NEXT_PUBLIC_WS_URL) {
      console.error('❌ WebSocket URL not configured');
      return;
    }

    // Validate required parameters
    if (!conversationId || !userId) {
      console.warn('⚠️ Missing conversationId or userId for WebSocket connection');
      return;
    }

    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/conversations/${conversationId}?userId=${userId}`;
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
        setWsConnection(ws);
      };

      ws.onmessage = async (event) => {
        if (!mountedRef.current) return;
        
        try {
          let messageData: string;
          
          // Handle different data types
          if (event.data instanceof Blob) {
            messageData = await event.data.text();
          } else if (typeof event.data === 'string') {
            messageData = event.data;
          } else {
            messageData = String(event.data);
          }
          
          console.log('📨 Raw WebSocket message:', messageData);
          
          const data = JSON.parse(messageData);
          console.log('📊 Parsed data:', data);

          switch (data.type) {
            case 'new_message':
              console.log('💬 New message received:', data.message);
              setMessages((prev) => {
                const exists = prev.some(msg => msg.id === data.message.id);
                if (exists) return prev;
                return [...prev, data.message];
              });
              
              setConversations((prev) =>
                prev.map((conv) =>
                  conv.id === data.message.conversation_id
                    ? { 
                        ...conv, 
                        last_message: data.message, 
                        last_message_at: data.message.created_at 
                      }
                    : conv
                )
              );
              break;

            case 'typing_update':
              console.log('⌨️ Typing update:', data);
              if (data.userId !== userId) {
                const typingUser = {
                  userId: data.userId,
                  username: data.username || 'Unknown User',
                  timestamp: Date.now()
                };

                setTypingUsers((prev) => {
                  const conversationTyping = prev[conversationId] || [];
                  if (data.isTyping) {
                    const filtered = conversationTyping.filter((u) => u.userId !== data.userId);
                    return {
                      ...prev,
                      [conversationId]: [...filtered, typingUser]
                    };
                  } else {
                    return {
                      ...prev,
                      [conversationId]: conversationTyping.filter((u) => u.userId !== data.userId)
                    };
                  }
                });
              }
              break;

            case 'user_presence':
              console.log('👤 User presence update:', data);
              setOnlineUsers(prev => {
                const newSet = new Set(prev);
                if (data.isOnline) {
                  newSet.add(data.userId);
                } else {
                  newSet.delete(data.userId);
                }
                return newSet;
              });
              break;

            default:
              console.log('❓ Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('Raw event data:', event.data);
          console.error('Event data type:', typeof event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        
        if (!mountedRef.current) return;
        
        setIsConnected(false);
        setWsConnection(null);
        wsRef.current = null;
        
        // Only reconnect if it wasn't a clean close and component is still mounted
        if (event.code !== 1000 && event.code !== 1001 && mountedRef.current) {
          console.log('🔄 Attempting to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connectWebSocket();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket error details:', {
          url: ws.url,
          readyState: ws.readyState,
          protocol: ws.protocol
        });
        
        if (!mountedRef.current) return;
        
        setIsConnected(false);
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [conversationId, userId, setMessages, setConversations, setTypingUsers, setOnlineUsers, cleanup]);

  // Effect to handle connection
  useEffect(() => {
    mountedRef.current = true;
    
    // Add a small delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && conversationId && userId) {
        connectWebSocket();
      }
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      cleanup();
    };
  }, [conversationId, userId, connectWebSocket, cleanup]);

  // Memoized send functions to prevent unnecessary re-renders
  const sendTypingUpdate = useCallback((isTyping: boolean) => {
    if (!mountedRef.current) return;
    
    try {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
          type: 'typing_update',
          conversationId,
          userId,
          username: 'Current User',
          isTyping
        };
        
        console.log('📤 Sending typing update:', message);
        ws.send(JSON.stringify(message));
      } else {
        console.log('❌ Cannot send typing update - WebSocket not ready');
      }
    } catch (error) {
      console.error('❌ Error sending typing indicator:', error);
    }
  }, [conversationId, userId]);

  const sendMessage = useCallback((message: any) => {
    if (!mountedRef.current) return;
    
    try {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        const wsMessage = {
          type: 'new_message',
          message
        };
        
        console.log('📤 Sending new message via WebSocket:', wsMessage);
        ws.send(JSON.stringify(wsMessage));
      } else {
        console.log('❌ Cannot send message - WebSocket not ready');
      }
    } catch (error) {
      console.error('❌ Error sending message via WebSocket:', error);
    }
  }, []);

  return {
    isConnected,
    wsConnection,
    sendTypingUpdate,
    sendMessage
  };
};