import { useEffect, useState, useCallback, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Message, Conversation, TypingUser } from '@/types/messaging';

export function useRealtimeMessaging(conversationId?: string) {
  const { user } = useUser();
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelsRef = useRef<any[]>([]);

  // Enhanced function to fetch user data from Clerk
  const fetchUserData = useCallback(async (userIds: string[]) => {
    try {
        console.log('Fetching user data for IDs:', userIds);
      const response = await fetch('/api/users/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds })
      });
      
      if (!response.ok) return {};
      
      const { users } = await response.json();
      return users.reduce((acc: any, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      return {};
    }
  }, []);

  // Enhanced load messages with user data
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
      const { messages: newMessages } = await res.json();
      
      // Extract unique user IDs from messages
      const userIds = [...new Set(newMessages.map((msg: Message) => msg.sender_id))] as string[];
      
      // Fetch user data for all senders
      const userData = await fetchUserData(userIds);
      
      // Attach user data to messages
      const messagesWithUsers = newMessages.map((msg: Message) => ({
        ...msg,
        sender: userData[msg.sender_id] || null
      }));
      
      setMessages(prev => before ? [...messagesWithUsers, ...prev] : messagesWithUsers);
      return messagesWithUsers;
    } catch (err) {
      setError('Failed to load messages');
      return [];
    } finally {
      setLoading(false);
    }
  }, [conversationId, fetchUserData]);

  // Enhanced load conversations with user data
  const loadConversations = useCallback(async () => {
    if (!userId) return [];
    setLoading(true);
    try {
      const res = await fetch('/api/conversations');
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
      
      // Attach user data to conversations
      const conversationsWithUsers = convs.map((conv: Conversation) => ({
        ...conv,
        participants: conv.participants?.map(participant => ({
          ...participant,
          user: userData[participant.user_id] || null
        })) || [],
        last_message: conv.last_message ? {
          ...conv.last_message,
          sender: userData[conv.last_message.sender_id] || null
        } : undefined
      }));
      
      setConversations(conversationsWithUsers);
      return conversationsWithUsers;
    } catch (err) {
      setError('Failed to load conversations');
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, fetchUserData]);

  // Enhanced send message with user data
  const sendMessage = useCallback(async (content: string, type = 'text') => {
    if (!conversationId) return null;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, content, message_type: type })
      });
      const { message } = await res.json();
      
      // Attach current user data to the message
      const messageWithUser = {
        ...message,
        sender: {
          id: user?.id || '',
          username: user?.username || '',
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          imageUrl: user?.imageUrl || '',
          email: user?.emailAddresses?.[0]?.emailAddress || ''
        }
      };
      
      setMessages(prev => [...prev, messageWithUser]);
      return messageWithUser;
    } catch (err) {
      setError('Failed to send message');
      return null;
    }
  }, [conversationId, user]);

  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
    try {
      const res = await fetch('/api/message-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, emoji }),
      });
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
    } catch {
      setError('Failed to react to message');
      return null;
    }
  }, []);

  // Enhanced real-time messages with user data
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
        
        // Fetch user data for the message sender
        const userData = await fetchUserData([newMessage.sender_id]);
        const messageWithUser = {
          ...newMessage,
          sender: userData[newMessage.sender_id] || null
        };
        
        setMessages(prev => {
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

  // Real-time: Typing indicator
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
    typingUsers: conversationId ? typingUsers[conversationId] || [] : [],
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