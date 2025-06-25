// hooks/useRealTimeMessaging.ts
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Message, Conversation } from '@/types/messaging';

export function useRealTimeMessaging(conversationId?: string) {
    const { userId, isLoaded, isSignedIn } = useAuth();
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Send message function using API route
    const sendMessage = useCallback(async (
        content: string,
        messageType: 'text' | 'image' | 'file' = 'text',
        replyToId?: string,
        metadata?: Record<string, any>
    ) => {
        if (!conversationId || !userId) {
            console.log('❌ Cannot send message: missing requirements');
            return null;
        }

        try {
            console.log('📤 Sending message:', { content, messageType, conversationId });

            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: conversationId,
                    content,
                    message_type: messageType,
                    reply_to_id: replyToId,
                    metadata: metadata || {}
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to send message');
            }

            const result = await response.json();
            console.log('✅ Message sent successfully:', result);

            // Add the new message to state
            if (result.message) {
                setMessages(prev => [...prev, result.message]);
            }

            return result.message;
        } catch (err: any) {
            console.error('❌ Send message error:', err);
            setError('Failed to send message');
            return null;
        }
    }, [conversationId, userId]);

    // Load messages for conversation using API route
    const loadMessages = useCallback(async (limit: number = 50, before?: string) => {
        if (!conversationId) {
            console.log('❌ Cannot load messages: missing conversation ID');
            return [];
        }

        console.log('🔄 Loading messages for conversation:', conversationId);
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                conversation_id: conversationId,
                limit: limit.toString(),
                ...(before && { before })
            });

            const response = await fetch(`/api/messages?${params}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to load messages');
            }

            const result = await response.json();
            const messages = result.messages || [];

            console.log('✅ Loaded messages:', messages.length);

            if (before) {
                setMessages(prev => [...messages, ...prev]);
            } else {
                setMessages(messages);
            }

            return messages;
        } catch (err) {
            console.error('❌ Load messages error:', err);
            setError('Failed to load messages');
            return [];
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    // Load conversations using API route
    const loadConversations = useCallback(async () => {
        if (!userId) {
            console.log('❌ Cannot load conversations: missing user ID');
            return [];
        }

        console.log('🔄 Loading conversations for user:', userId);
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/conversations');

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to load conversations');
            }

            const result = await response.json();
            const conversations = result.conversations || [];

            console.log('✅ Loaded conversations:', conversations.length);
            setConversations(conversations);
            return conversations;
        } catch (err) {
            console.error('❌ Load conversations error:', err);
            setError('Failed to load conversations');
            return [];
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // React to message using API route
    const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
        if (!userId) return null;

        try {
            const response = await fetch('/api/message-reactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message_id: messageId,
                    emoji
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to react to message');
            }

            const result = await response.json();
            
            // Update messages state with new reaction
            if (result.reaction) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === messageId
                            ? {
                                ...msg,
                                reactions: [...(msg.reactions || []), result.reaction]
                            }
                            : msg
                    )
                );
            }

            return result.reaction;
        } catch (err: any) {
            setError('Failed to react to message');
            console.error('React to message error:', err);
            return null;
        }
    }, [userId]);

    // Simplified typing indicator (no real-time for now)
    const sendTypingIndicator = useCallback((isTyping: boolean) => {
        // For now, this is a no-op since we don't have real-time subscriptions
        // You could implement this with polling or WebSockets later
        console.log('Typing indicator:', isTyping);
    }, []);

    // Auto-load conversations on mount
    useEffect(() => {
        if (isLoaded && isSignedIn && userId) {
            loadConversations();
        }
    }, [isLoaded, isSignedIn, userId, loadConversations]);

    // Auto-load messages when conversation changes
    useEffect(() => {
        if (conversationId) {
            loadMessages();
        }
    }, [conversationId, loadMessages]);

    return {
        messages,
        conversations,
        typingUsers: new Set<string>(), // Empty for now
        onlineUsers: new Set<string>(), // Empty for now
        loading,
        error,
        isSupabaseReady: isLoaded && isSignedIn, // Renamed for compatibility
        sendMessage,
        sendTypingIndicator,
        reactToMessage,
        loadMessages,
        loadConversations,
        setError: (error: string | null) => setError(error)
    };
}