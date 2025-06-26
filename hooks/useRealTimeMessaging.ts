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

  // Load messages
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
      setMessages(prev => before ? [...newMessages, ...prev] : newMessages);
      return newMessages;
    } catch (err) {
      setError('Failed to load messages');
      return [];
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userId) return [];
    setLoading(true);
    try {
      const res = await fetch('/api/conversations');
      const { conversations: convs } = await res.json();
      setConversations(convs);
      return convs;
    } catch (err) {
      setError('Failed to load conversations');
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Send message
  const sendMessage = useCallback(async (content: string, type = 'text') => {
    if (!conversationId) return null;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, content, message_type: type })
      });
      const { message } = await res.json();
      setMessages(prev => [...prev, message]);
      return message;
    } catch (err) {
      setError('Failed to send message');
      return null;
    }
  }, [conversationId]);

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

  // Real-time: Messages
  // In useRealtimeMessaging hook, update the messages effect:
useEffect(() => {
    if (!user?.id || !conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`) // Make channel name unique
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('📨 New message via Supabase:', payload);
        const newMessage = payload.new as Message;
        // Always add the message, regardless of sender
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(msg => msg.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      })
      .subscribe((status) => {
        console.log('📡 Supabase channel status:', status);
      });

    channelsRef.current.push(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, user?.id, supabase, setMessages]); // Add setMessages to deps

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
    // Export the state setters for use in the component
    setMessages,
    setConversations,
    setTypingUsers,
  };
}