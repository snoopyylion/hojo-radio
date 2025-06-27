// app/messages/[conversationId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRealtimeMessaging } from '@/hooks/useRealTimeMessaging';
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection';
import { useMessageApi } from '@/hooks/useMessageApi';
import ConversationList from '@/components/messaging/ConversationList';
import { MessagesList } from '@/components/messaging/MessageList';
import MessageInput from '@/components/messaging/MessageInput';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import { ConversationSettings } from '@/components/messaging/chat/ConversationSettings';
import { MessagingLayout } from '@/components/messaging/MessagingLayout';
import { ConversationHeader } from '@/components/messaging/ConversationHeader';
import {
    LoadingState,
    ErrorState,
    ConversationNotFoundState,
    ConnectionStatus
} from '@/components/messaging/ConversationStates';
import { Conversation, Message, TypingUser, User } from '@/types/messaging';

export default function ConversationPage() {
    const router = useRouter();
    const params = useParams();
    const { userId, isLoaded } = useAuth();
    const conversationId = params.conversationId as string;

    // Custom hooks
    const {
        messages,
        conversations,
        typingUsers,
        loading,
        error,
        setMessages,
        setConversations,
        setTypingUsers
    } = useRealtimeMessaging(conversationId);

    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    const {
        isConnected,
        sendTypingUpdate,
        sendMessage: sendWebSocketMessage
    } = useWebSocketConnection({
        conversationId,
        userId: userId!,
        setMessages,
        setConversations,
        setTypingUsers,
        setOnlineUsers
    });

    const {
        loadConversationsFromAPI,
        loadMessagesFromAPI,
        sendMessage: sendApiMessage,
        reactToMessage,
        pollMessages
    } = useMessageApi();

    // Local state
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const messageListRef = useRef<HTMLDivElement>(null);

    // Process typing users for current conversation
    const currentTypingUsers = Array.isArray(typingUsers) ? typingUsers : (typingUsers[conversationId] || []);
    const typingUsersSet = new Set(currentTypingUsers.map(user => user.userId));

    // Clean up typing indicators
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setTypingUsers((prev: Record<string, TypingUser[]>) => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                    updated[key] = updated[key].filter((u: TypingUser) => now - u.timestamp < 5000);
                });
                return updated;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [setTypingUsers]);

    // Polling fallback when WebSocket fails
    useEffect(() => {
        if (isConnected || !conversationId || !hasInitialized) return;

        const interval = setInterval(async () => {
            const newMessages = await pollMessages(conversationId, messages);
            if (newMessages.length > 0) {
                setMessages(prev => {
                    const filtered = newMessages.filter((msg: Message) =>
                        !prev.some(existingMsg => existingMsg.id === msg.id)
                    );
                    return filtered.length > 0 ? [...prev, ...filtered] : prev;
                });
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [isConnected, conversationId, hasInitialized, messages, pollMessages, setMessages]);

    // Initialize data
    const initializeData = useCallback(async () => {
        if (!userId || !conversationId || hasInitialized) return;

        console.log('🔄 Loading conversation data for:', conversationId);
        setHasInitialized(true);

        try {
            await Promise.all([
                loadConversationsFromAPI().then(setConversations),
                loadMessagesFromAPI(conversationId).then(setMessages)
            ]);
        } catch (error) {
            console.error('❌ Error initializing data:', error);
            setHasInitialized(false);
        }
    }, [userId, conversationId, hasInitialized, loadConversationsFromAPI, loadMessagesFromAPI, setConversations, setMessages]);

    // Handle authentication and initialization
    useEffect(() => {
        if (!isLoaded) return;

        if (!userId) {
            router.push('/sign-in');
            return;
        }

        initializeData();
    }, [isLoaded, userId, initializeData, router]);

    // Set current conversation
    useEffect(() => {
        if (conversations.length === 0) return;

        const conversation = conversations.find((c: Conversation) => c.id === conversationId);
        if (conversation) {
            console.log('✅ Found conversation:', conversation);
            setCurrentConversation(conversation);
        } else {
            console.log('❌ Conversation not found in list:', conversationId);
            console.log('Available conversations:', conversations.map((c: Conversation) => c.id));
        }
    }, [conversations, conversationId]);

    // Handlers
    const handleConversationSelect = useCallback((conversationId: string) => {
        router.push(`/messages/${conversationId}`);
    }, [router]);

    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || messages.length === 0) return;

        setIsLoadingMore(true);
        try {
            const oldestMessage = messages[0];
            const newMessages = await loadMessagesFromAPI(conversationId, 20, oldestMessage.created_at);
            setMessages(prev => [...newMessages, ...prev]);
        } catch (error) {
            console.error('❌ Error loading more messages:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, messages, loadMessagesFromAPI, conversationId, setMessages]);

    const handleTyping = useCallback((isTyping: boolean) => {
        sendTypingUpdate(isTyping);
    }, [sendTypingUpdate]);

    const handleSendMessage = useCallback(async (
        content: string,
        messageType: 'text' | 'image' | 'file' = 'text',
        replyToId?: string
    ) => {
        if (!content.trim() || !currentConversation) {
            console.log('❌ Cannot send message: missing content or conversation');
            return;
        }

        try {
            // Send via API
            const message = await sendApiMessage(conversationId, content, messageType, replyToId);

            if (message) {
                // Add message to local state immediately
                setMessages((prev) => [...prev, message]);

                // Send real-time update via WebSocket
                sendWebSocketMessage(message);

                // Scroll to bottom after sending
                setTimeout(() => {
                    if (messageListRef.current) {
                        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
                    }
                }, 100);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
        }
    }, [currentConversation, conversationId, sendApiMessage, sendWebSocketMessage, setMessages]);

    const handleReaction = useCallback(async (messageId: string, emoji: string) => {
        try {
            const reaction = await reactToMessage(messageId, emoji);

            if (reaction) {
                setMessages((prev: Message[]) =>
                    prev.map((msg: Message) => msg.id === messageId
                        ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
                        : msg
                    )
                );
            }
        } catch (error) {
            console.error('❌ Error reacting to message:', error);
        }
    }, [reactToMessage, setMessages]);

    const handleRetry = useCallback(() => {
        setHasInitialized(false);
        window.location.reload();
    }, []);

    // Get conversation users
    const users: User[] = currentConversation?.participants
        ?.map(p => p.user)
        ?.filter((u): u is User => u !== undefined && u !== null) ?? [];

    // Show loading state only when actually loading
    if (!isLoaded || (loading && !hasInitialized)) {
        return <LoadingState />;
    }

    // Show error state
    if (error) {
        return <ErrorState error={error} onRetry={handleRetry} />;
    }

    // Show conversation not found state
    if (hasInitialized && conversations.length > 0 && !currentConversation) {
        return <ConversationNotFoundState />;
    }

    // Show loading state while waiting for conversation to load
    if (!currentConversation && hasInitialized) {
        return <LoadingState message="Loading conversation..." />;
    }

    // Render the sidebar content
    const sidebarContent = (
        <ConversationList
            conversations={conversations}
            activeConversationId={currentConversation?.id}
            onConversationSelect={handleConversationSelect}
            onNewConversation={() => router.push('/messages/new')}
            currentUserId={userId!}
            isLoading={loading}
        />
    );

    return (
        <MessagingLayout sidebar={sidebarContent}>
            {/* Connection status indicator */}
            <ConnectionStatus isConnected={isConnected} />

            {/* Main chat area */}
            <div className="flex flex-col h-full bg-white dark:bg-gray-950">
                {/* Chat header */}
                {currentConversation && (
                    <ConversationHeader
                        conversation={currentConversation}
                        onlineUsers={onlineUsers}
                        currentUserId={userId!}
                        onSettingsClick={() => setShowSettings(true)}
                        onBackClick={() => router.push('/messages')}
                    />
                )}

                {/* Messages area */}
                <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900/50">
                    <div ref={messageListRef} className="flex-1 overflow-y-auto">
                        <MessagesList
                            messages={messages}
                            typingUsers={typingUsersSet}
                            users={users}
                            currentUserId={userId!}
                            onReactToMessage={handleReaction}
                            onLoadMore={handleLoadMore}
                            loading={isLoadingMore}
                        />
                    </div>

                    {/* Typing indicator */}
                    {currentTypingUsers.length > 0 && (
                        <div className="px-4 py-2 bg-white dark:bg-gray-950">
                            <TypingIndicator
                                typingUsers={typingUsersSet}
                                users={users}
                            />
                        </div>
                    )}

                    {/* Message input */}
                    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            onTyping={handleTyping}
                            disabled={loading}
                            conversationId={conversationId}
                        />
                    </div>
                </div>
            </div>

            {/* Settings modal */}
            {showSettings && currentConversation && (
                <ConversationSettings
                    conversation={currentConversation}
                    currentUserId={userId!}
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    onUpdateConversation={async (updates) => {
                        console.log("Update conversation", updates);
                        // TODO: Implement conversation update logic
                    }}
                    onLeaveConversation={async () => {
                        console.log("Leave conversation");
                        // TODO: Implement leave conversation logic
                    }}
                    onRemoveParticipant={async (userId) => {
                        console.log("Remove participant", userId);
                        // TODO: Implement remove participant logic
                    }}
                    onAddParticipants={async (userIds) => {
                        console.log("Add participants", userIds);
                        // TODO: Implement add participants logic
                    }}
                    onPromoteToAdmin={async (userId) => {
                        console.log("Promote to admin", userId);
                        // TODO: Implement promote to admin logic
                    }}
                />
            )}
        </MessagingLayout>
    );
}