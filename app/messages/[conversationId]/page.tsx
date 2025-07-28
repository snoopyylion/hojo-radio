// app/messages/[conversationId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRealtimeMessaging } from '@/hooks/useRealTimeMessaging';
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection';
import { useMessageApi } from '@/hooks/useMessageApi';
import { MessagesList } from '@/components/messaging/MessageList';
import MessageInput from '@/components/messaging/MessageInput';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import { ConversationSettings } from '@/components/messaging/chat/ConversationSettings';
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
    const [isTyping, setIsTyping] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const messageListRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Enhanced typing users processing for current conversation
    const currentTypingUsers = useMemo(() => {
        if (Array.isArray(typingUsers)) {
            return typingUsers.filter(user => user.userId !== userId);
        }
        return (typingUsers[conversationId] || []).filter(user => user.userId !== userId);
    }, [typingUsers, conversationId, userId]);

    const typingUsersSet = useMemo(() => {
        return new Set(currentTypingUsers.map(user => user.userId));
    }, [currentTypingUsers]);

    // Enhanced typing cleanup with better timing
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setTypingUsers((prev: Record<string, TypingUser[]>) => {
                const updated = { ...prev };
                let hasChanges = false;

                Object.keys(updated).forEach(conversationId => {
                    const filteredUsers = updated[conversationId].filter(u => now - u.timestamp < 3000);
                    if (filteredUsers.length !== updated[conversationId].length) {
                        updated[conversationId] = filteredUsers;
                        hasChanges = true;
                    }
                });

                return hasChanges ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [setTypingUsers]);

    // Enhanced typing handler with debouncing
    const handleTyping = useCallback((isCurrentlyTyping: boolean) => {
        if (!isConnected || !conversationId || !userId) return;

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (isCurrentlyTyping && !isTyping) {
            // Start typing
            setIsTyping(true);
            sendTypingUpdate(true); // Make sure to pass conversationId

            // Set timeout to stop typing after 3 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                sendTypingUpdate(false);
            }, 3000);
        } else if (!isCurrentlyTyping && isTyping) {
            // Stop typing immediately
            setIsTyping(false);
            sendTypingUpdate(false);
        } else if (isCurrentlyTyping && isTyping) {
            // Continue typing - reset timeout
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                sendTypingUpdate(false);
            }, 3000);
        }
    }, [isConnected, conversationId, userId, isTyping, sendTypingUpdate]);


    // Cleanup typing timeout on unmount or conversation change
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (isTyping) {
                sendTypingUpdate(false); // Pass conversationId here
            }
        };
    }, [conversationId, isTyping, sendTypingUpdate]);

    // Polling fallback when WebSocket fails
    useEffect(() => {
        if (isConnected || !conversationId || !hasInitialized) return;

        const interval = setInterval(async () => {
            try {
                const newMessages = await pollMessages(conversationId, messages);
                if (newMessages.length > 0) {
                    setMessages(prev => {
                        const messageIds = new Set(prev.map(msg => msg.id));
                        const filtered = newMessages.filter((msg: Message) => !messageIds.has(msg.id));
                        return filtered.length > 0 ? [...prev, ...filtered] : prev;
                    });
                }
            } catch (error) {
                console.error('❌ Error polling messages:', error);
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
            const [conversationsData, messagesData] = await Promise.all([
                loadConversationsFromAPI(),
                loadMessagesFromAPI(conversationId)
            ]);

            setConversations(conversationsData);
            setMessages(messagesData);
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

    // Load conversation data
    useEffect(() => {
        if (!hasInitialized || !conversations.length) return;

        const conversation = conversations.find((c: Conversation) => c.id === conversationId);
        if (conversation) {
            setCurrentConversation(conversation);
        } else {
            console.warn('Conversation not found:', conversationId);
        }
    }, [hasInitialized, conversations, conversationId]);

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

    const handleSendMessage = useCallback(async (
        content: string,
        type?: string,
        replyToId?: string,
        metadata?: any
    ) => {
        if (!content.trim() || !currentConversation) {
            return;
        }

        // Stop typing when sending message
        if (isTyping) {
            setIsTyping(false);
            sendTypingUpdate(false);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        }

        try {
            // Use reply_to_id from replyingTo state if available
            const finalReplyToId = replyToId || replyingTo?.id;
            const messageType = (type as 'text' | 'image' | 'file') || 'text';

            // Send via API
            const message = await sendApiMessage(conversationId, content, messageType, finalReplyToId);

            if (message) {
                // Add message to local state immediately
                setMessages((prev) => [...prev, message]);

                // Send real-time update via WebSocket
                sendWebSocketMessage(message);

                // Clear reply state after sending
                setReplyingTo(null);

                // Scroll to bottom after sending
                setTimeout(() => {
                    if (messageListRef.current) {
                        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
                    }
                }, 100);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            
            // Show user-friendly error message
            if (error instanceof Error) {
                // You could add a toast notification here
                console.error('Error details:', error.message);
                
                // Show specific error messages for common issues
                if (error.message.includes('Network error')) {
                    alert('Network error: Please check your internet connection and try again.');
                } else if (error.message.includes('Unauthorized')) {
                    alert('Authentication error: Please sign in again.');
                } else if (error.message.includes('Access denied')) {
                    alert('Access denied: You may not have permission to send messages in this conversation.');
                } else {
                    alert(`Failed to send message: ${error.message}`);
                }
            } else {
                alert('An unexpected error occurred while sending the message.');
            }
        }
    }, [currentConversation, conversationId, sendApiMessage, sendWebSocketMessage, setMessages, isTyping, sendTypingUpdate, replyingTo]);

    const handleReaction = useCallback(async (messageId: string, emoji: string) => {
        try {
            // Get current user's reaction for this message
            const currentMessage = messages.find(msg => msg.id === messageId);
            const currentUserReactions = currentMessage?.reactions
                ?.filter(r => r.user_id === userId)
                ?.map(r => r.emoji) || [];

            const reaction = await reactToMessage(messageId, emoji, currentUserReactions);

            if (reaction) {
                setMessages((prev: Message[]) =>
                    prev.map((msg: Message) => {
                        if (msg.id === messageId) {
                            // Remove any existing reactions from current user
                            const otherReactions = msg.reactions?.filter(r => r.user_id !== userId) || [];
                            // Add the new reaction
                            return { ...msg, reactions: [...otherReactions, reaction] };
                        }
                        return msg;
                    })
                );
            }
        } catch (error) {
            console.error('❌ Error reacting to message:', error);
        }
    }, [reactToMessage, setMessages, messages, userId]);

    const handleDeleteMessage = useCallback(async (messageId: string) => {
        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Remove the message from local state
                setMessages((prev: Message[]) => prev.filter(msg => msg.id !== messageId));
            } else {
                const errorData = await response.json();
                alert(`Failed to delete message: ${errorData.error}`);
            }
        } catch (error) {
            console.error('❌ Error deleting message:', error);
            alert('Failed to delete message. Please try again.');
        }
    }, [setMessages]);

    const handleReply = useCallback((message: Message) => {
        setReplyingTo(message);
    }, []);

    const handleCancelReply = useCallback(() => {
        setReplyingTo(null);
    }, []);

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



    return (
        <>
            {/* Connection status indicator */}
            <ConnectionStatus isConnected={isConnected} />

            {/* Main chat area */}
            <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
                {/* Chat header */}
                {currentConversation && (
                    <ConversationHeader
                        conversation={currentConversation}
                        onlineUsers={onlineUsers}
                        currentUserId={userId!}
                        onSettingsClick={() => setShowSettings(true)}
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
                            onReply={handleReply}
                            replyingTo={replyingTo}
                            onLoadMore={handleLoadMore}
                            loading={isLoadingMore}
                            onDeleteMessage={handleDeleteMessage}
                        />
                    </div>

                    {/* Enhanced Typing indicator */}
                    {(() => {
                        return currentTypingUsers.length > 0 && (
                            <div className="px-4 py-2 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
                                <TypingIndicator
                                    typingUsers={typingUsersSet}
                                    users={users}
                                />
                            </div>
                        );
                    })()}

                    {/* Message input */}
                    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            onTypingChange={handleTyping}
                            disabled={!isConnected}
                            replyingTo={replyingTo}
                            onCancelReply={handleCancelReply}
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
        </>
    );
}