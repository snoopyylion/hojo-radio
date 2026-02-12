// hooks/useRealTimeMessaging.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { Message, Conversation, TypingUser } from '@/types/messaging';
import { useGlobalTyping } from '@/context/GlobalTypingContext';

interface UseRealtimeMessagingReturn {
  messages: Message[];
  conversations: Conversation[];
  typingUsers: Record<string, TypingUser[]>;
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, type?: string) => Promise<Message | null>;
  sendTypingIndicator: (isTyping: boolean) => void;
  reactToMessage: (messageId: string, emoji: string) => Promise<{ id: string; message_id: string; user_id: string; emoji: string } | null>;
  loadMessages: (limit?: number, before?: string) => Promise<Message[]>;
  loadConversations: () => Promise<Conversation[]>;
  setError: (err: string | null) => void;
  isSupabaseReady: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setTypingUsers: React.Dispatch<React.SetStateAction<Record<string, TypingUser[]>>>;
}

// Make conversationId optional with a default value
export function useRealtimeMessaging(conversationId?: string): UseRealtimeMessagingReturn {
  const { user } = useUser();
  const { userId, isLoaded, isSignedIn } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { typingUsers, setTypingUsers } = useGlobalTyping();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  // Enhanced function to fetch user data from Clerk
  const fetchUserData = useCallback(async (userIds: string[]) => {
    if (!userIds.length) return {};
    
    try {
      const response = await fetch('/api/users/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds })
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch user data:', response.status);
        return {};
      }
      
      const { users } = await response.json();
      if (!Array.isArray(users)) return {};
      
      type UserObj = {
        id: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        imageUrl?: string;
        email?: string;
        fullName?: string;
        [key: string]: unknown;
      };
      
      return users.reduce((acc: Record<string, UserObj>, user: unknown) => {
        if (user && typeof user === 'object' && 'id' in user) {
          const u = user as UserObj;
          if (typeof u.id === 'string') {
            acc[u.id] = u;
          }
        }
        return acc;
      }, {} as Record<string, UserObj>);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      return {};
    }
  }, []);

  // Helper function to get current user data
  const getCurrentUserData = useCallback(() => {
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      imageUrl: user.imageUrl || '',
      email: user.emailAddresses?.[0]?.emailAddress || '',
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown'
    };
  }, [user]);

  // Enhanced load messages with user data - only load if conversationId is provided
  const loadMessages = useCallback(async (limit = 50, before?: string) => {
    if (!conversationId) return [];
    setLoading(true);
    try {
      const params = new URLSearchParams({
        conversation_id: conversationId,
        limit: limit.toString(),
        ...(before && { before })
      });
      
      const res = await fetch(`/api/messages?${params}`);
      if (!res.ok) {
        throw new Error(`Failed to load messages: ${res.status}`);
      }
      
      const { messages: newMessages } = await res.json();
      
      // Extract unique user IDs from messages
      const userIds = [...new Set(newMessages.map((msg: Message) => msg.sender_id))] as string[];
      
      // Fetch user data for all senders
      const userData = await fetchUserData(userIds);
      
      // Add current user data if not already present
      const currentUserData = getCurrentUserData();
      if (currentUserData && !userData[currentUserData.id]) {
        userData[currentUserData.id] = currentUserData;
      }
      
      // Attach user data to messages
      const messagesWithUsers = newMessages.map((msg: Message) => ({
        ...msg,
        sender: userData[msg.sender_id] || {
          id: msg.sender_id,
          username: 'Unknown User',
          firstName: '',
          lastName: '',
          imageUrl: '',
          email: '',
          fullName: 'Unknown User'
        }
      }));
      
      setMessages(prev => before ? [...messagesWithUsers, ...prev] : messagesWithUsers);
      return messagesWithUsers;
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
      return [];
    } finally {
      setLoading(false);
    }
  }, [conversationId, fetchUserData, getCurrentUserData]);

  // Enhanced load conversations with user data
  const loadConversations = useCallback(async () => {
    if (!userId) return [];
    setLoading(true);
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) {
        throw new Error(`Failed to load conversations: ${res.status}`);
      }
      
      const { conversations: convs } = await res.json();
      
      // Extract all participant user IDs
      const allUserIds = new Set<string>();
      convs.forEach((conv: Conversation) => {
        conv.participants?.forEach(participant => {
          allUserIds.add(participant.user_id);
        });
        if (conv.last_message?.sender_id) {
          allUserIds.add(conv.last_message.sender_id);
        }
      });
      
      // Fetch user data for all participants
      const userData = await fetchUserData(Array.from(allUserIds));
      
      // Add current user data if not already present
      const currentUserData = getCurrentUserData();
      if (currentUserData && !userData[currentUserData.id]) {
        userData[currentUserData.id] = currentUserData;
      }
      
      // Attach user data to conversations
      const conversationsWithUsers = convs.map((conv: Conversation) => ({
        ...conv,
        participants: conv.participants?.map(participant => ({
          ...participant,
          user: userData[participant.user_id] || {
            id: participant.user_id,
            username: 'Unknown User',
            firstName: '',
            lastName: '',
            imageUrl: '',
            email: '',
            fullName: 'Unknown User'
          }
        })) || [],
        last_message: conv.last_message ? {
          ...conv.last_message,
          sender: userData[conv.last_message.sender_id] || {
            id: conv.last_message.sender_id,
            username: 'Unknown User',  
            firstName: '',
            lastName: '',
            imageUrl: '',
            email: '',
            fullName: 'Unknown User'
          }
        } : undefined
      }));
      
      setConversations(conversationsWithUsers);
      return conversationsWithUsers;
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, fetchUserData, getCurrentUserData]);

  // Enhanced send message with user data - only work if conversationId is provided
  const sendMessage = useCallback(async (content: string, type = 'text') => {
    if (!conversationId || !user) return null;
    
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversation_id: conversationId, 
          content, 
          message_type: type 
        })
      });
      
      if (!res.ok) {
        throw new Error(`Failed to send message: ${res.status}`);
      }
      
      const { message } = await res.json();
      
      // Attach current user data to the message
      const currentUserData = getCurrentUserData();
      const messageWithUser = {
        ...message,
        sender: currentUserData || {
          id: user.id,
          username: 'Unknown User',
          firstName: '',
          lastName: '',
          imageUrl: '',
          email: '',
          fullName: 'Unknown User'
        }
      };
      
      setMessages(prev => [...prev, messageWithUser]);
      return messageWithUser;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return null;
    }
  }, [conversationId, user, getCurrentUserData]);

  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
    try {
      const res = await fetch('/api/message-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, emoji }),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to react to message: ${res.status}`);
      }
      
      const { reaction } = await res.json();
      if (reaction) {
        setMessages(prev =>
          prev.map((msg: Message) => msg.id === messageId
            ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
            : msg
          )
        );
      }
      return reaction;
    } catch (err) {
      console.error('Error reacting to message:', err);
      setError('Failed to react to message');
      return null;
    }
  }, []);

  // Enhanced real-time messages with user data - only subscribe if conversationId exists
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        console.log('📨 New message via Supabase:', payload);
        const newMessage = payload.new as Message;
        
        // Skip if this is the current user's message (already added locally)
        if (newMessage.sender_id === user.id) {
          return;
        }
        
        // Fetch user data for the message sender
        const userData = await fetchUserData([newMessage.sender_id]);
        const messageWithUser = {
          ...newMessage,
          sender: {
            id: newMessage.sender_id,
            username: userData[newMessage.sender_id]?.username || 'Unknown User',
            firstName: userData[newMessage.sender_id]?.firstName || '',
            lastName: userData[newMessage.sender_id]?.lastName || '',
            imageUrl: userData[newMessage.sender_id]?.imageUrl || '',
            email: userData[newMessage.sender_id]?.email || '',
            fullName: userData[newMessage.sender_id]?.fullName || 'Unknown User'
          }
        };
        
        setMessages(prev => {
          // Prevent duplicate messages
          if (prev.some(msg => msg.id === newMessage.id)) return prev;
          return [...prev, messageWithUser];
        });
      })
      .subscribe((status) => {
        console.log('📡 Supabase channel status:', status);
      });

    channelsRef.current.push(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, user?.id, supabase, fetchUserData]);

  // Real-time: Conversation updates
  useEffect(() => {
    const channel = supabase
      .channel('public:conversations')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      }, (payload) => {
        const updated = payload.new as Conversation;
        setConversations(prev =>
          prev.map((conv: Conversation) => conv.id === updated.id ? updated : conv)
        );
      })
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [supabase]);

  // Real-time: Typing indicator - only subscribe if conversationId exists
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { conversation_id, user_id, username, is_typing } = payload.payload;

        if (user_id === user.id) return;

        setTypingUsers(prev => {
          const existing = prev[conversation_id] || [];
          const now = Date.now();
          if (is_typing) {
            if (!existing.find((u: TypingUser) => u.userId === user_id)) {
              return {
                ...prev,
                [conversation_id]: [...existing, { userId: user_id, username, timestamp: now }]
              };
            }
          } else {
            return {
              ...prev,
              [conversation_id]: existing.filter((u: TypingUser) => u.userId !== user_id)
            };
          }
          return prev;
        });
      })
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, user?.id, supabase]);

  // Clean typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = { ...prev };
        for (const key in updated) {
          updated[key] = updated[key].filter((u: TypingUser) => now - u.timestamp < 5000);
        }
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(ch => {
        if (ch && typeof ch.unsubscribe === 'function') {
          ch.unsubscribe();
        }
      });
      channelsRef.current = [];
    };
  }, []);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!user?.id || !conversationId) return;
    const channel = supabase.channel(`typing-${conversationId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversation_id: conversationId,
        user_id: user.id,
        username: user.username || user.firstName || 'Unknown',
        is_typing: isTyping,
      }
    });
  }, [user?.id, conversationId, supabase]);

  return {
    messages,
    conversations,
    typingUsers,
    loading,
    error,
    sendMessage,
    sendTypingIndicator,
    reactToMessage,
    loadMessages,
    loadConversations,
    setError: (err: string | null) => setError(err),
    isSupabaseReady: isLoaded && isSignedIn,
    setMessages,
    setConversations,
    setTypingUsers,
  };
}